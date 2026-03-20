import asyncio
import logging
import math
import json
import time
from collections import OrderedDict
from contextlib import nullcontext
from typing import Optional, Dict, Tuple, List, Any

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3, leaguedashteamstats
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar

from app.schemas.predictions import PredictionsResponse, GamePrediction, GamePredictionInsight, KeyDriver, RiskFactor
from app.services.schedule import getGamesForDate
from app.config import get_api_kwargs, get_groq_api_key
from app.services.groq_client import groq_is_ready, call_groq_api, get_groq_rate_limiter
from app.services.groq_prompts import (
    get_system_message,
    build_insight_prompt,
    build_batched_prediction_insights_prompt,
    build_enhanced_prediction_prompt,
)
from app.utils.json_recovery import recover_truncated_json

logger = logging.getLogger(__name__)

try:
    import sentry_sdk as _sentry_sdk

    _SENTRY_AVAILABLE = True
except ImportError:
    _sentry_sdk = None
    _SENTRY_AVAILABLE = False


# Cache for predictions: key = "{date}_{season}", value = {"response": PredictionsResponse, "timestamp": float}
# Predictions are cached for 30 minutes to avoid duplicate Groq calls while allowing updates
# Limited to 100 entries with LRU eviction to prevent unbounded growth
_predictions_cache = OrderedDict()
PREDICTIONS_CACHE_TTL = 1800.0  # 30 minutes
PREDICTIONS_CACHE_MAX_SIZE = 100  # Maximum 100 date+season combinations

# Cache for team statistics: key = "{season}", value = (team_stats dict, timestamp)
# Team stats are cached for 1 hour to reduce API calls while still allowing updates
# Limited to last 3 seasons to prevent unbounded growth
_team_stats_cache: Dict[str, Tuple[dict, float]] = {}
TEAM_STATS_CACHE_TTL = 3600.0  # 1 hour
MAX_SEASONS_CACHED = 3  # Keep only last 3 seasons


async def get_recent_form(team_id: int, season: str, last_n: int = 10) -> float:
    """
    Get a team's win percentage over their last N games.
    Falls back to 0.5 if data is unavailable.
    Returns float 0.0-1.0
    """
    try:
        from nba_api.stats.endpoints import teamgamelog
        from app.utils.rate_limiter import rate_limit

        def _fetch():
            log = teamgamelog.TeamGameLog(
                team_id=team_id,
                season=season,
                season_type_all_star="Regular Season",
            ).get_data_frames()[0]
            return log

        # Respect NBA API call rate limits when multiple prediction tasks run.
        await rate_limit()
        log = await asyncio.wait_for(asyncio.to_thread(_fetch), timeout=10.0)
        if log.empty:
            return 0.5
        recent = log.head(last_n)
        wins = (recent["WL"] == "W").sum()
        return float(wins / len(recent))
    except Exception:
        return 0.5


def calculate_win_probability(
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float] = None,
    away_net_rating: Optional[float] = None,
    home_recent_form: Optional[float] = None,
    away_recent_form: Optional[float] = None,
) -> float:
    """
    Calculate win probability using deterministic stat-based formula.

    Weights: season win % (base), net rating adjustment, recent form (last 10 games), home court.
    """
    # Season win percentage base (40% weight)
    if home_win_pct + away_win_pct == 0:
        base_prob = 0.5
    else:
        base_prob = home_win_pct / (home_win_pct + away_win_pct)

    # Net rating adjustment (20% weight)
    rating_adjustment = 0.0
    if home_net_rating is not None and away_net_rating is not None:
        net_rating_diff = home_net_rating - away_net_rating
        rating_adjustment = net_rating_diff * 0.005

    # Recent form adjustment (30% weight) — last 10 games
    form_adjustment = 0.0
    if home_recent_form is not None and away_recent_form is not None:
        form_diff = home_recent_form - away_recent_form
        form_adjustment = form_diff * 0.15

    # Home court advantage (fixed 3.5%)
    home_court_advantage = 0.035

    home_prob = base_prob + rating_adjustment + form_adjustment + home_court_advantage
    return max(0.05, min(0.95, home_prob))


def predict_score(win_prob: float) -> float:
    """
    Predict score using deterministic formula based on win probability.

    Formula: Winner scores more, loser scores less, based on probability.
    Average NBA game score is ~112 points.

    Args:
        win_prob: Win probability (0-1)

    Returns:
        float: Predicted score
    """
    avg_score = 112.0

    # Winner scores more, loser scores less
    if win_prob > 0.5:
        # Home team wins - they score more
        home_score = avg_score + (win_prob - 0.5) * 15
        return round(home_score, 1)
    else:
        # Away team wins - home scores less
        home_score = avg_score - (0.5 - win_prob) * 15
        return round(home_score, 1)


def generate_simple_insights(
    home_team_name: str,
    away_team_name: str,
    home_win_prob: float,
    predicted_home_score: float,
    predicted_away_score: float,
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float],
    away_net_rating: Optional[float],
) -> list[GamePredictionInsight]:
    """
    Generate deterministic, explainable insights based on clear rules.
    Uses only win probabilities, predicted scores, and net ratings.

    Args:
        home_team_name: Home team name
        away_team_name: Away team name
        home_win_prob: Home team win probability (0.0-1.0)
        predicted_home_score: Predicted home team score
        predicted_away_score: Predicted away team score
        home_win_pct: Home team win percentage (for reference, not shown in UI)
        away_win_pct: Away team win percentage (for reference, not shown in UI)
        home_net_rating: Home team net rating
        away_net_rating: Away team net rating

    Returns:
        List of 2-3 insights that never contradict the probabilities
    """
    insights = []

    # Calculate key metrics
    home_win_prob_pct = home_win_prob * 100
    away_win_prob_pct = (1.0 - home_win_prob) * 100
    prob_diff = abs(home_win_prob_pct - away_win_prob_pct)
    score_diff = abs(predicted_home_score - predicted_away_score)

    # Determine favored team
    favored_team = home_team_name if home_win_prob > 0.5 else away_team_name

    # 1. Probability gap insight (always include if significant)
    if prob_diff >= 15.0:
        insights.append(
            GamePredictionInsight(
                title="Large probability gap",
                description=f"{favored_team} have a clear edge based on win probability.",
                impact="",
            )
        )
    elif prob_diff >= 8.0:
        insights.append(
            GamePredictionInsight(
                title="Moderate probability gap",
                description=f"{favored_team} are favored based on win probability.",
                impact="",
            )
        )
    elif prob_diff < 8.0:
        insights.append(
            GamePredictionInsight(
                title="Close matchup", description="Win probabilities suggest a competitive game.", impact=""
            )
        )

    # 2. Home court advantage (only if home team is actually favored)
    if home_win_prob > 0.5:
        insights.append(
            GamePredictionInsight(
                title="Home court advantage",
                description=f"{home_team_name} playing at home provides an edge.",
                impact="",
            )
        )

    # 3. Net rating advantage (only if difference >= 5)
    if home_net_rating is not None and away_net_rating is not None:
        net_rating_diff = abs(home_net_rating - away_net_rating)
        if net_rating_diff >= 5.0:
            better_team = home_team_name if home_net_rating > away_net_rating else away_team_name
            better_rating = max(home_net_rating, away_net_rating)
            worse_rating = min(home_net_rating, away_net_rating)
            insights.append(
                GamePredictionInsight(
                    title="Efficiency advantage",
                    description=f"{better_team} have a stronger net rating ({better_rating:.1f} vs {worse_rating:.1f}).",
                    impact="",
                )
            )

    # 4. Winning margin category (based on predicted score difference)
    if score_diff <= 5.0:
        margin_insight = "Close game expected based on predicted score."
    elif score_diff <= 10.0:
        margin_insight = "Moderate winning margin expected."
    else:
        margin_insight = "Large winning margin expected."

    # Only add margin insight if we don't have 3 already
    if len(insights) < 3:
        insights.append(GamePredictionInsight(title="Predicted margin", description=margin_insight, impact=""))

    return insights[:3]  # Limit to 3 insights


async def generate_batched_prediction_insights(
    predictions_data: List[Dict[str, Any]],
) -> Dict[str, List[GamePredictionInsight]]:
    """
    Generate AI insights for multiple predictions in ONE Groq API call.

    This batches all prediction insights into a single API call, significantly
    reducing API usage and improving performance compared to per-game calls.

    Args:
        predictions_data: List of dictionaries with prediction data:
            - game_id: str
            - home_team_name: str
            - away_team_name: str
            - home_win_prob: float (0-1)
            - away_win_prob: float (0-1)
            - predicted_home_score: float
            - predicted_away_score: float
            - home_win_pct: float (optional, for fallback)
            - away_win_pct: float (optional, for fallback)
            - home_net_rating: Optional[float] (optional, for fallback)
            - away_net_rating: Optional[float] (optional, for fallback)
            - net_rating_diff_str: str (optional)

    Returns:
        Dict mapping game_id to list of GamePredictionInsight objects.
        If Groq fails or is unavailable, returns empty dict (caller should use fallback).
    """
    if not predictions_data:
        return {}

    if not groq_is_ready():
        logger.debug("Groq not available for batched prediction insights")
        return {}

    groq_api_key = get_groq_api_key()
    try:
        # Build batched prompt
        prompt = build_batched_prediction_insights_prompt(predictions_data)
        system_message = get_system_message()

        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter(),
                    max_tokens=1500,
                ),
                timeout=30.0,  # 30 second timeout for batched insights (more games = more time)
            )
        except asyncio.TimeoutError:
            logger.warning("Batched prediction insights generation timeout")
            return {}

        # Parse response
        content = response["content"]
        parsed = recover_truncated_json(content)
        insights_data = parsed if isinstance(parsed, dict) else {}

        # Map insights back to game_ids
        result: Dict[str, list[GamePredictionInsight]] = {}

        # Expected format: {"insights": [{"game_id": "...", "insights": [...]}]}
        if insights_data and "insights" in insights_data:
            for game_insights in insights_data["insights"]:
                game_id = game_insights.get("game_id", "")
                insights_list = game_insights.get("insights", [])

                if not game_id:
                    continue

                # Convert to GamePredictionInsight objects
                parsed_insights = []
                for item in insights_list[:3]:  # Limit to 3 per game
                    if isinstance(item, dict) and "title" in item and "description" in item:
                        parsed_insights.append(
                            GamePredictionInsight(title=item["title"], description=item["description"], impact="")
                        )

                if parsed_insights:
                    result[game_id] = parsed_insights

        logger.info(f"Generated batched insights for {len(result)}/{len(predictions_data)} games")
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse batched prediction insights JSON: {e}")
        return {}
    except Exception as e:
        error_str = str(e)
        # Handle rate limit errors specifically
        if "429" in error_str or "rate_limit" in error_str.lower() or "Rate limit" in error_str:
            logger.warning(f"Groq rate limit hit for batched prediction insights: {e}")
        else:
            logger.warning(f"Error generating batched prediction insights: {e}")
        return {}


async def generate_enhanced_ai_analysis(predictions_data: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Generate enhanced AI analysis for predictions including confidence tiers, key drivers, risk factors, and matchup narrative.

    Uses a single batched Groq API call for all games to maintain performance.

    Args:
        predictions_data: List of prediction dictionaries with game data

    Returns:
        Dict mapping game_id to enhanced analysis data:
        {
            "game_id": {
                "confidence_tier": "high|medium|low",
                "confidence_explanation": "...",
                "key_drivers": [KeyDriver, ...],
                "risk_factors": [RiskFactor, ...],
                "matchup_narrative": "...",
                "insights": [GamePredictionInsight, ...]
            }
        }
    """
    if not predictions_data or not groq_is_ready():
        logger.debug("Groq not available or no predictions data, skipping enhanced analysis")
        return {}

    try:
        groq_api_key = get_groq_api_key()
        # Build enhanced prompt
        prompt = build_enhanced_prediction_prompt(predictions_data)
        system_message = get_system_message()

        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter(),
                    max_tokens=2500,
                ),
                timeout=30.0,  # 30 second timeout for enhanced analysis
            )
        except asyncio.TimeoutError:
            logger.warning("Enhanced prediction analysis generation timeout")
            return {}

        # Extract content from response
        response_text = response.get("content", "") if isinstance(response, dict) else ""

        if not response_text:
            logger.warning("Empty response from Groq for enhanced prediction analysis")
            return {}

        # Parse JSON response (handles markdown fences and truncated JSON)
        parsed = recover_truncated_json(response_text)
        if parsed is None or not isinstance(parsed, dict):
            logger.warning("Failed to parse enhanced analysis JSON (recovery returned no dict)")
            return {}
        insights_data = parsed

        # Map enhanced analysis back to game_ids
        result: Dict[str, Dict[str, Any]] = {}

        # Expected format: {"insights": [{"game_id": "...", "confidence_tier": "...", ...}]}
        if insights_data and "insights" in insights_data:
            for game_analysis in insights_data["insights"]:
                game_id = game_analysis.get("game_id", "")

                if not game_id:
                    continue

                # Parse key drivers
                key_drivers = []
                drivers_data = game_analysis.get("key_drivers", [])
                for driver in drivers_data[:3]:  # Limit to 3
                    if isinstance(driver, dict) and "factor" in driver:
                        try:
                            key_drivers.append(
                                KeyDriver(
                                    factor=driver.get("factor", ""),
                                    impact=driver.get("impact", ""),
                                    magnitude=driver.get("magnitude", "Moderate"),
                                )
                            )
                        except Exception as e:
                            logger.debug(f"Failed to parse key driver: {e}")
                            continue

                # Parse risk factors
                risk_factors = []
                risks_data = game_analysis.get("risk_factors", [])
                for risk in risks_data[:2]:  # Limit to 2
                    if isinstance(risk, dict) and "factor" in risk:
                        try:
                            risk_factors.append(
                                RiskFactor(factor=risk.get("factor", ""), explanation=risk.get("explanation", ""))
                            )
                        except Exception as e:
                            logger.debug(f"Failed to parse risk factor: {e}")
                            continue

                # Parse insights
                insights = []
                insights_list = game_analysis.get("insights", [])
                for item in insights_list[:3]:  # Limit to 3
                    if isinstance(item, dict) and "title" in item and "description" in item:
                        insights.append(
                            GamePredictionInsight(
                                title=item["title"], description=item["description"], impact=item.get("impact", "")
                            )
                        )

                # Build result
                result[game_id] = {
                    "confidence_tier": game_analysis.get("confidence_tier"),
                    "confidence_explanation": game_analysis.get("confidence_explanation"),
                    "key_drivers": key_drivers if key_drivers else None,
                    "risk_factors": risk_factors if risk_factors else None,
                    "matchup_narrative": game_analysis.get("matchup_narrative"),
                    "insights": insights if insights else None,
                }

        logger.info(f"Generated enhanced analysis for {len(result)}/{len(predictions_data)} games")
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse enhanced prediction analysis JSON: {e}")
        return {}
    except Exception as e:
        error_str = str(e)
        # Handle rate limit errors specifically
        if "429" in error_str or "rate_limit" in error_str.lower() or "Rate limit" in error_str:
            logger.warning(f"Groq rate limit hit for enhanced prediction analysis: {e}")
        else:
            logger.warning(f"Error generating enhanced prediction analysis: {e}")
        return {}


async def get_team_statistics(season: str) -> Dict[str, Any]:
    """
    Get basic team statistics (win percentage and net rating).

    Team statistics are cached for 1 hour to reduce API calls while still allowing updates.

    Args:
        season: Season (e.g., "2024-25")

    Returns:
        dict: {team_id: {"win_pct": float, "net_rating": float, "team_name": str}}
    """
    # Check cache first
    if season in _team_stats_cache:
        cached_stats, timestamp = _team_stats_cache[season]
        if time.time() - timestamp < TEAM_STATS_CACHE_TTL:
            logger.debug(f"Returning cached team statistics for season {season}")
            return cached_stats
        else:
            # Cache expired, remove it
            del _team_stats_cache[season]

    try:
        api_kwargs = get_api_kwargs()

        try:
            # Add timeouts to prevent hanging (10 seconds each)
            standings_df, stats_df = await asyncio.gather(
                asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: leaguestandingsv3.LeagueStandingsV3(
                            league_id="00", season=season, season_type="Regular Season", **api_kwargs
                        ).get_data_frames()[0]
                    ),
                    timeout=10.0,
                ),
                asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: leaguedashteamstats.LeagueDashTeamStats(
                            season=season,
                            per_mode_detailed=PerModeDetailed.per_100_possessions,
                            season_type_all_star=SeasonTypeAllStar.regular,
                            league_id_nullable="00",
                            **api_kwargs,
                        ).get_data_frames()[0]
                    ),
                    timeout=10.0,
                ),
                return_exceptions=True,
            )
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching team statistics for season {season}")
            return {}
        except Exception as e:
            logger.error(f"Error in asyncio.gather for season {season}: {e}")
            return {}

        # Handle exceptions from API calls
        if isinstance(standings_df, Exception):
            logger.warning(f"Error fetching standings for season {season}: {standings_df}")
            standings_df = None
        if isinstance(stats_df, Exception):
            logger.warning(f"Error fetching stats for season {season}: {stats_df}")
            stats_df = None

        # Check if DataFrames are empty (common for future seasons)
        if standings_df is None or standings_df.empty:
            logger.warning(f"No standings data available for season {season}")
            return {}

        team_stats = {}

        # Convert standings DataFrame to native Python types immediately
        standings_data = standings_df.to_dict(orient="records")
        del standings_df  # Delete DataFrame after conversion

        # Process standings for win percentages and team names
        for row in standings_data:
            team_id = int(row.get("TeamID", 0))
            if team_id:
                team_city = str(row.get("TeamCity", "")).strip()
                team_name = str(row.get("TeamName", "")).strip()
                full_name = (
                    f"{team_city} {team_name}".strip() if team_city and team_name else (team_name or team_city or "")
                )
                team_stats[team_id] = {
                    "win_pct": float(row.get("WinPCT", 0.5)),
                    "team_name": full_name,
                }

        # Process net ratings (if available)
        if stats_df is not None and not stats_df.empty:
            # Convert stats DataFrame to native Python types immediately
            stats_data = stats_df.to_dict(orient="records")
            del stats_df  # Delete DataFrame after conversion

            for row in stats_data:
                team_id = int(row.get("TEAM_ID", 0))
                if team_id in team_stats:
                    plus_minus = row.get("PLUS_MINUS", 0)
                    net_rating = float(plus_minus) if not math.isnan(plus_minus) else None
                    team_stats[team_id]["net_rating"] = net_rating

        # Cache the team statistics
        _team_stats_cache[season] = (team_stats, time.time())
        logger.debug(f"Cached team statistics for season {season}")

        # Clean up old seasons (keep only last MAX_SEASONS_CACHED seasons)
        if len(_team_stats_cache) > MAX_SEASONS_CACHED:
            # Sort by timestamp and remove oldest
            sorted_seasons = sorted(_team_stats_cache.items(), key=lambda x: x[1][1])  # Sort by timestamp
            keys_to_remove = [key for key, _ in sorted_seasons[: len(_team_stats_cache) - MAX_SEASONS_CACHED]]
            for key in keys_to_remove:
                _team_stats_cache.pop(key, None)
            logger.debug(f"Cleaned up {len(keys_to_remove)} old seasons from team stats cache")

        return team_stats
    except Exception as e:
        logger.error(f"Error fetching team statistics for season {season}: {e}", exc_info=True)
        return {}


async def predict_games_for_date(date: str, season: str) -> PredictionsResponse:
    """
    Predict outcomes for all games on a given date.

    Prediction model (deterministic, stat-based):
    1. Get team win percentages and net ratings
    2. Calculate win probability (win % + home court advantage + net rating adjustment)
    3. Predict scores based on win probability
    4. Generate AI insights (with fallback to simple insights)

    Predictions are cached permanently by date+season to avoid duplicate Groq API calls.
    Once generated, the same predictions are returned for all subsequent requests.

    Args:
        date: Date in YYYY-MM-DD format
        season: Season (e.g., "2024-25")

    Returns:
        PredictionsResponse: Predictions for all games
    """
    # Check cache first - if predictions exist and are still valid, return immediately (no Groq calls)
    cache_key = f"{date}_{season}"
    current_time = time.time()

    if cache_key in _predictions_cache:
        # Move to end (most recently used) for LRU eviction
        entry = _predictions_cache.pop(cache_key)
        _predictions_cache[cache_key] = entry

        # Check if entry is still valid
        if current_time - entry.get("timestamp", 0) < PREDICTIONS_CACHE_TTL:
            logger.info(f"Returning cached predictions for {date} (season {season}) - skipping Groq calls")
            return entry["response"]
        else:
            # Entry expired, remove it (already popped above, just don't re-add)
            logger.debug(f"Predictions cache entry expired for {cache_key}")

    try:
        transaction_cm = (
            _sentry_sdk.start_transaction(op="task", name=f"predict_games_{date}")
            if _SENTRY_AVAILABLE and _sentry_sdk
            else nullcontext()
        )

        with transaction_cm:
            # Get games for the date (with timeout)
            try:
                games_response = await asyncio.wait_for(getGamesForDate(date), timeout=30.0)
                games = games_response.games
                logger.info(f"Found {len(games)} games for date {date}")
            except asyncio.TimeoutError:
                logger.warning(f"Timeout fetching games for date {date}")
                return PredictionsResponse(date=date, predictions=[], season=season)
            except HTTPException as e:
                # If 404, it means no games found - return empty predictions
                if e.status_code == 404:
                    logger.info(f"No games found for date {date} (404 from schedule service)")
                    return PredictionsResponse(date=date, predictions=[], season=season)
                raise

            if not games:
                return PredictionsResponse(date=date, predictions=[], season=season)

            # Get team statistics
            team_stats = await get_team_statistics(season)

            # If no team stats available (e.g., future season), return empty predictions
            if not team_stats:
                logger.info(f"No team statistics available for season {season}, returning empty predictions")
                return PredictionsResponse(date=date, predictions=[], season=season)

            predictions = []

            logger.info(f"Processing {len(games)} games for predictions on {date}")
            start_time = time.time()

            # STEP 1: Collect all prediction data (without calling Groq)
            predictions_data = []
            game_data_map = {}  # Map game_id to game data for later use

            # Prefetch recent form for all unique team IDs in parallel
            # (bounded to respect the NBA API rate limit).
            all_team_ids = list({game.home_team.team_id for game in games} | {game.away_team.team_id for game in games})

            semaphore = asyncio.Semaphore(3)

            async def _fetch_form(tid: int) -> Tuple[int, float]:
                async with semaphore:
                    return tid, await get_recent_form(tid, season)

            form_results = await asyncio.gather(*[_fetch_form(tid) for tid in all_team_ids], return_exceptions=True)
            recent_forms: Dict[int, float] = {}
            for result in form_results:
                if isinstance(result, tuple) and len(result) == 2:
                    tid, form = result
                    recent_forms[int(tid)] = float(form)

            for idx, game in enumerate(games, 1):
                try:
                    logger.debug(f"Preparing game {idx}/{len(games)}: {game.game_id}")

                    home_team_id = game.home_team.team_id
                    away_team_id = game.away_team.team_id

                    home_stats = team_stats.get(home_team_id, {})
                    away_stats = team_stats.get(away_team_id, {})

                    # Get team names
                    home_team_name = home_stats.get("team_name", "")
                    away_team_name = away_stats.get("team_name", "")

                    # Fallback: parse from matchup if team name not available
                    if not home_team_name or not away_team_name:
                        # Try both " vs. " and " vs " formats
                        matchup_parts = (
                            game.matchup.split(" vs. ") if " vs. " in game.matchup else game.matchup.split(" vs ")
                        )
                        if len(matchup_parts) == 2:
                            if not away_team_name:
                                away_team_name = matchup_parts[0].strip()
                            if not home_team_name:
                                home_team_name = matchup_parts[1].strip()

                    # Final fallback to abbreviation
                    if not home_team_name:
                        home_team_name = game.home_team.team_abbreviation
                    if not away_team_name:
                        away_team_name = game.away_team.team_abbreviation

                    # Get basic stats
                    home_win_pct = home_stats.get("win_pct", 0.5)
                    away_win_pct = away_stats.get("win_pct", 0.5)
                    home_net_rating = home_stats.get("net_rating")
                    away_net_rating = away_stats.get("net_rating")

                    # Recent form (last 10 games) for win probability
                    home_recent_form = recent_forms.get(home_team_id, 0.5)
                    away_recent_form = recent_forms.get(away_team_id, 0.5)

                    # Calculate win probability (season %, net rating, recent form, home court)
                    home_win_prob = calculate_win_probability(
                        home_win_pct,
                        away_win_pct,
                        home_net_rating,
                        away_net_rating,
                        home_recent_form,
                        away_recent_form,
                    )
                    away_win_prob = 1.0 - home_win_prob

                    # Predict scores
                    predicted_home_score = predict_score(home_win_prob)
                    predicted_away_score = predict_score(away_win_prob)

                    # Calculate net rating difference string if available
                    net_rating_diff_str = ""
                    if home_net_rating is not None and away_net_rating is not None:
                        net_rating_diff = home_net_rating - away_net_rating
                        net_rating_diff_str = (
                            f"+{net_rating_diff:.1f} ({home_team_name if net_rating_diff > 0 else away_team_name})"
                        )

                    # Calculate confidence based on probability gap and stats alignment
                    prob_gap = abs(home_win_prob - away_win_prob)
                    # Higher confidence for larger gaps and when stats align
                    if prob_gap > 0.15:
                        confidence = 0.8  # Clear favorite
                    elif prob_gap > 0.10:
                        confidence = 0.7  # Moderate favorite
                    elif prob_gap > 0.05:
                        confidence = 0.6  # Slight favorite
                    else:
                        confidence = 0.5  # Very close game

                    # Store data for batched insights and enhanced analysis
                    predictions_data.append(
                        {
                            "game_id": game.game_id,
                            "home_team_name": home_team_name,
                            "away_team_name": away_team_name,
                            "home_win_prob": home_win_prob,
                            "away_win_prob": away_win_prob,
                            "predicted_home_score": predicted_home_score,
                            "predicted_away_score": predicted_away_score,
                            "net_rating_diff_str": net_rating_diff_str,
                            "confidence": confidence,
                            "home_win_pct": home_win_pct,
                            "away_win_pct": away_win_pct,
                            "home_net_rating": home_net_rating,
                            "away_net_rating": away_net_rating,
                        }
                    )

                    # Store game data for later use
                    game_data_map[game.game_id] = {
                        "game": game,
                        "home_team_id": home_team_id,
                        "home_team_name": home_team_name,
                        "away_team_id": away_team_id,
                        "away_team_name": away_team_name,
                        "home_win_prob": home_win_prob,
                        "away_win_prob": away_win_prob,
                        "predicted_home_score": predicted_home_score,
                        "predicted_away_score": predicted_away_score,
                        "home_win_pct": home_win_pct,
                        "away_win_pct": away_win_pct,
                        "home_net_rating": home_net_rating,
                        "away_net_rating": away_net_rating,
                        "confidence": confidence,
                    }

                except Exception as game_error:
                    logger.error(f"Error preparing game {idx} ({game.game_id}): {game_error}", exc_info=True)
                    # Continue with next game instead of failing entirely
                    continue

            # STEP 2: Generate batched AI insights first (more reliable, faster)
            logger.info(f"Generating batched AI insights for {len(predictions_data)} games")
            batched_insights = await generate_batched_prediction_insights(predictions_data)

            # STEP 2b: Generate enhanced AI analysis (optional, adds extra features)
            # If this fails, we still have batched insights, so predictions won't be empty
            logger.info(f"Generating enhanced AI analysis for {len(predictions_data)} games")
            enhanced_analysis = {}
            try:
                enhanced_analysis = await generate_enhanced_ai_analysis(predictions_data)
            except Exception as e:
                logger.warning(f"Enhanced AI analysis failed, continuing with batched insights: {e}")
                # Continue without enhanced analysis - batched insights are sufficient

            # STEP 3: Create GamePrediction objects using batched insights or fallback
            for game_id, game_data in game_data_map.items():
                try:
                    game = game_data["game"]
                    home_team_id = game_data["home_team_id"]
                    home_team_name = game_data["home_team_name"]
                    away_team_id = game_data["away_team_id"]
                    away_team_name = game_data["away_team_name"]
                    home_win_prob = game_data["home_win_prob"]
                    away_win_prob = game_data["away_win_prob"]
                    predicted_home_score = game_data["predicted_home_score"]
                    predicted_away_score = game_data["predicted_away_score"]
                    home_win_pct = game_data["home_win_pct"]
                    away_win_pct = game_data["away_win_pct"]
                    home_net_rating = game_data["home_net_rating"]
                    away_net_rating = game_data["away_net_rating"]
                    confidence = game_data.get("confidence", 0.75)

                    # Get enhanced analysis if available
                    enhanced_data = enhanced_analysis.get(game_id, {}) if enhanced_analysis else {}

                    # Use batched insights first (most reliable)
                    insights = batched_insights.get(game_id)

                    # If batched insights failed, try enhanced analysis insights
                    if not insights and enhanced_data.get("insights"):
                        insights = enhanced_data.get("insights", [])

                    # Final fallback: generate simple insights if both AI calls failed
                    if not insights:
                        logger.debug(f"Using fallback simple insights for game {game_id}")
                        insights = generate_simple_insights(
                            home_team_name,
                            away_team_name,
                            home_win_prob,
                            predicted_home_score,
                            predicted_away_score,
                            home_win_pct,
                            away_win_pct,
                            home_net_rating,
                            away_net_rating,
                        )

                    # Calculate confidence tier from confidence value if not provided by AI
                    confidence_tier = enhanced_data.get("confidence_tier")
                    if not confidence_tier:
                        if confidence >= 0.7:
                            confidence_tier = "high"
                        elif confidence >= 0.5:
                            confidence_tier = "medium"
                        else:
                            confidence_tier = "low"

                    prediction = GamePrediction(
                        game_id=game_id,
                        home_team_id=home_team_id,
                        home_team_name=home_team_name,
                        away_team_id=away_team_id,
                        away_team_name=away_team_name,
                        game_date=date,
                        home_win_probability=home_win_prob,
                        away_win_probability=away_win_prob,
                        predicted_home_score=predicted_home_score,
                        predicted_away_score=predicted_away_score,
                        confidence=confidence,
                        insights=insights,
                        home_team_win_pct=home_win_pct,
                        away_team_win_pct=away_win_pct,
                        home_team_net_rating=home_net_rating,
                        away_team_net_rating=away_net_rating,
                        confidence_tier=confidence_tier,
                        confidence_explanation=enhanced_data.get("confidence_explanation"),
                        key_drivers=enhanced_data.get("key_drivers"),
                        risk_factors=enhanced_data.get("risk_factors"),
                        matchup_narrative=enhanced_data.get("matchup_narrative"),
                    )

                    predictions.append(prediction)
                    logger.debug(f"Completed game: {away_team_name} @ {home_team_name}")

                except Exception as game_error:
                    logger.error(f"Error creating prediction for game {game_id}: {game_error}", exc_info=True)
                    # Continue with next game instead of failing entirely
                    continue

            elapsed_time = time.time() - start_time
            logger.info(f"Successfully generated {len(predictions)} predictions for date {date} in {elapsed_time:.1f}s")

            # Ensure all predictions have insights (even if AI failed)
            for pred in predictions:
                if not pred.insights or len(pred.insights) == 0:
                    logger.warning(f"Prediction {pred.game_id} has no insights, generating fallback")
                    pred.insights = generate_simple_insights(
                        pred.home_team_name,
                        pred.away_team_name,
                        pred.home_win_probability,
                        pred.predicted_home_score,
                        pred.predicted_away_score,
                        pred.home_team_win_pct,
                        pred.away_team_win_pct,
                        pred.home_team_net_rating,
                        pred.away_team_net_rating,
                    )

            response = PredictionsResponse(date=date, predictions=predictions, season=season)

            # Cache the predictions with TTL and LRU eviction
            # If key exists, move to end (most recently used) and update
            if cache_key in _predictions_cache:
                _predictions_cache.move_to_end(cache_key)

            # Update or add entry
            _predictions_cache[cache_key] = {"response": response, "timestamp": time.time()}

            # Enforce size limit with LRU eviction
            if len(_predictions_cache) > PREDICTIONS_CACHE_MAX_SIZE:
                oldest_key, _ = _predictions_cache.popitem(last=False)
                logger.debug(f"LRU eviction: removed oldest predictions cache entry {oldest_key}")

            logger.info(f"Generated and cached {len(predictions)} predictions for {date} (season {season})")

            return response

    except HTTPException:
        raise
    except KeyboardInterrupt:
        raise
    except Exception as e:
        error_msg = str(e)
        if "No game data found" in error_msg or "No games found" in error_msg:
            logger.info(f"No games found for date {date}, returning empty predictions")
            return PredictionsResponse(date=date, predictions=[], season=season)
        logger.error(f"Error predicting games for date {date}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating predictions: {str(e)}")
