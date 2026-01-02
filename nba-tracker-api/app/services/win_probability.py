"""
Win probability service for NBA games.

Fetches real-time win probability data from NBA API and processes it for display.
Win probability shows the likelihood of each team winning at any given moment.
"""

import asyncio
import logging
from typing import Dict, Optional, List
from datetime import datetime

from fastapi import HTTPException
from nba_api.stats.endpoints import winprobabilitypbp

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

# Cache for win probability data per game
# Stores the latest win probability for each game
_win_probability_cache: Dict[str, dict] = {}


async def get_win_probability(game_id: str) -> Optional[dict]:
    """
    Get current win probability for a game from NBA API.
    
    The NBA API winprobabilitypbp endpoint provides win probability data
    based on play-by-play events. This function fetches and processes that data.
    
    Args:
        game_id: The unique game ID from NBA (10-digit string)
        
    Returns:
        dict with keys:
            - home_win_prob: float (0.0-1.0) - Home team win probability
            - away_win_prob: float (0.0-1.0) - Away team win probability
            - timestamp: str - ISO timestamp when probability was calculated
            - probability_history: List[dict] - Last N probability points (optional)
        Returns None if game hasn't started or data not available
        
    Raises:
        HTTPException: If API error occurs
    """
    try:
        # Check cache first
        if game_id in _win_probability_cache:
            cached_data = _win_probability_cache[game_id]
            # Return cached data if it's recent (within last 30 seconds)
            if cached_data.get("timestamp"):
                # For now, always fetch fresh data for live games
                # Cache will be updated by WebSocket polling
                pass
        
        # Fetch win probability data from NBA API
        api_kwargs = get_api_kwargs()
        await rate_limit()
        
        win_prob_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: winprobabilitypbp.WinProbabilityPBP(game_id=game_id, **api_kwargs).get_dict()
            ),
            timeout=10.0
        )
        
        # Parse the response
        # The winprobabilitypbp endpoint returns data in resultSets
        if not win_prob_data.get("resultSets") or len(win_prob_data["resultSets"]) == 0:
            logger.debug(f"No win probability data available for game {game_id}")
            return None
        
        # Extract win probability data from resultSets
        # The structure varies, but typically contains probability data per play
        result_set = win_prob_data["resultSets"][0]
        rows = result_set.get("rowSet", [])
        headers = result_set.get("headers", [])
        
        if not rows:
            logger.debug(f"Empty win probability data for game {game_id}")
            return None
        
        # Get the most recent probability (last row is usually the latest)
        # Headers typically include: GAME_ID, EVENT_NUM, HOME_PCT, VISITOR_PCT, etc.
        latest_row = rows[-1]
        
        # Find indices for home and away win probabilities
        home_pct_idx = None
        away_pct_idx = None
        
        for i, header in enumerate(headers):
            header_upper = header.upper()
            if "HOME" in header_upper and ("PCT" in header_upper or "PROB" in header_upper):
                home_pct_idx = i
            elif "VISITOR" in header_upper or "AWAY" in header_upper:
                if "PCT" in header_upper or "PROB" in header_upper:
                    away_pct_idx = i
        
        # If we can't find the columns, try common positions
        if home_pct_idx is None or away_pct_idx is None:
            # Common structure: [GAME_ID, EVENT_NUM, HOME_PCT, VISITOR_PCT, ...]
            if len(latest_row) >= 4:
                home_pct_idx = 2
                away_pct_idx = 3
        
        if home_pct_idx is None or away_pct_idx is None:
            logger.warning(f"Could not parse win probability data structure for game {game_id}")
            return None
        
        # Extract probabilities (convert from percentage to decimal if needed)
        home_prob_raw = latest_row[home_pct_idx]
        away_prob_raw = latest_row[away_pct_idx]
        
        # Convert to float and normalize to 0-1 range
        home_win_prob = float(home_prob_raw) / 100.0 if home_prob_raw > 1.0 else float(home_prob_raw)
        away_win_prob = float(away_prob_raw) / 100.0 if away_prob_raw > 1.0 else float(away_prob_raw)
        
        # Ensure probabilities sum to 1.0
        total_prob = home_win_prob + away_win_prob
        if total_prob > 0:
            home_win_prob = home_win_prob / total_prob
            away_win_prob = away_win_prob / total_prob
        else:
            # Default to 50/50 if no data
            home_win_prob = 0.5
            away_win_prob = 0.5
        
        # Build probability history (last 20 plays for visualization)
        probability_history = []
        for row in rows[-20:]:  # Last 20 plays
            try:
                home_pct = float(row[home_pct_idx]) / 100.0 if row[home_pct_idx] > 1.0 else float(row[home_pct_idx])
                away_pct = float(row[away_pct_idx]) / 100.0 if row[away_pct_idx] > 1.0 else float(row[away_pct_idx])
                
                # Normalize
                total = home_pct + away_pct
                if total > 0:
                    home_pct = home_pct / total
                    away_pct = away_pct / total
                
                probability_history.append({
                    "home_win_prob": home_pct,
                    "away_win_prob": away_pct,
                })
            except (IndexError, ValueError, TypeError):
                continue
        
        result = {
            "home_win_prob": home_win_prob,
            "away_win_prob": away_win_prob,
            "timestamp": datetime.utcnow().isoformat(),
            "probability_history": probability_history,
        }
        
        # Update cache
        _win_probability_cache[game_id] = result
        
        return result
        
    except asyncio.TimeoutError:
        logger.warning(f"Timeout fetching win probability for game {game_id}")
        return None
    except Exception as e:
        logger.warning(f"Error fetching win probability for game {game_id}: {e}")
        # Return None instead of raising - allows graceful degradation
        return None


async def get_win_probability_for_multiple_games(game_ids: List[str]) -> Dict[str, dict]:
    """
    Get win probability for multiple games efficiently.
    
    Fetches win probability data for multiple games, handling rate limiting
    and errors gracefully.
    
    Args:
        game_ids: List of game IDs to fetch probabilities for
        
    Returns:
        Dict mapping game_id -> win probability data (or None if unavailable)
    """
    results = {}
    
    for game_id in game_ids:
        try:
            prob_data = await get_win_probability(game_id)
            results[game_id] = prob_data
            # Small delay between games to respect rate limits
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.debug(f"Error fetching win probability for game {game_id}: {e}")
            results[game_id] = None
    
    return results


def get_cached_win_probability(game_id: str) -> Optional[dict]:
    """
    Get cached win probability data without making an API call.
    
    Args:
        game_id: The unique game ID
        
    Returns:
        Cached win probability data or None if not cached
    """
    return _win_probability_cache.get(game_id)


def clear_win_probability_cache(game_id: Optional[str] = None):
    """
    Clear win probability cache for a specific game or all games.
    
    Args:
        game_id: Game ID to clear, or None to clear all
    """
    if game_id:
        _win_probability_cache.pop(game_id, None)
    else:
        _win_probability_cache.clear()

