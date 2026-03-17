"""
Player game streaks (e.g. active streaks of 3+ games with 20+ points). Uses PlayerGameStreakFinder.
"""

import asyncio
import logging
import time
from typing import Any, Dict, List

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

_streak_cache: Dict[str, tuple] = {}
STREAK_CACHE_TTL = 3600.0  # 1 hour
STREAK_CACHE_KEY = "active_streaks"


async def get_active_streaks(min_games: int = 3, season: str = "2024-25") -> List[Dict[str, Any]]:
    """
    Get active statistical streaks (e.g. players with 3+ consecutive games meeting a stat threshold).
    Cached for 1 hour.
    """
    cache_key = f"{STREAK_CACHE_KEY}:{min_games}:{season}"
    now = time.time()
    if cache_key in _streak_cache:
        data, ts = _streak_cache[cache_key]
        if now - ts < STREAK_CACHE_TTL:
            return data
        del _streak_cache[cache_key]

    try:
        await rate_limit()
        from nba_api.stats.endpoints import PlayerGameStreakFinder

        def _fetch() -> List[Dict[str, Any]]:
            resp = PlayerGameStreakFinder(
                active_streaks_only_nullable="Y",
                min_games_nullable=str(min_games),
                season_nullable=season,
                **get_api_kwargs(),
            )
            try:
                df = resp.get_data_frames()
                if not df or df[0].empty:
                    return []
                return df[0].to_dict("records")
            except (KeyError, IndexError, Exception) as e:
                logger.debug(f"PlayerGameStreakFinder parse failed: {e}")
                return []

        result = await asyncio.wait_for(asyncio.to_thread(_fetch), timeout=15.0)
        _streak_cache[cache_key] = (result, now)
        return result
    except Exception as e:
        logger.warning(f"Active streaks fetch failed: {e}")
        return []
