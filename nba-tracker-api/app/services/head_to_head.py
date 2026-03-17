"""
Head-to-head record between two teams. Uses LeagueGameFinder to get games between them.
"""

import asyncio
import logging
from collections import OrderedDict
from typing import Any, Dict

from app.config import get_api_kwargs
from app.constants import NBA_API_MIN_DELAY_SECONDS
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

_h2h_cache: OrderedDict = OrderedDict()
_H2H_MAX = 200


async def get_head_to_head_record(
    team1_id: int,
    team2_id: int,
    season: str = "2024-25",
) -> Dict[str, Any]:
    """
    Get regular-season head-to-head record between two teams.
    Cached per (team1, team2, season) with LRU eviction (max 200 entries).
    """
    key = (min(team1_id, team2_id), max(team1_id, team2_id), season)
    if key in _h2h_cache:
        _h2h_cache.move_to_end(key)
        return _h2h_cache[key]

    try:
        await rate_limit()
        from nba_api.stats.endpoints import LeagueGameFinder

        def _fetch_team(team_id: int):
            return LeagueGameFinder(
                team_id_nullable=str(team_id),
                season_nullable=season,
                **get_api_kwargs(),
            ).get_data_frames()[0]

        games1 = await asyncio.wait_for(asyncio.to_thread(_fetch_team, team1_id), timeout=10.0)
        await asyncio.sleep(NBA_API_MIN_DELAY_SECONDS)
        games2 = await asyncio.wait_for(asyncio.to_thread(_fetch_team, team2_id), timeout=10.0)
        common_ids = set(games1["GAME_ID"]) & set(games2["GAME_ID"])
        team1_games = games1[games1["GAME_ID"].isin(common_ids)]
        team1_wins = int((team1_games["WL"] == "W").sum())
        total = len(common_ids)
        team2_wins = total - team1_wins
        result = {
            "team1_id": team1_id,
            "team2_id": team2_id,
            "team1_wins": team1_wins,
            "team2_wins": team2_wins,
            "total_games": total,
            "season": season,
        }
        _h2h_cache[key] = result
        if len(_h2h_cache) > _H2H_MAX:
            _h2h_cache.popitem(last=False)
        return result
    except Exception as e:
        logger.warning(f"Head-to-head fetch failed for {team1_id} vs {team2_id}: {e}")
        return {
            "team1_id": team1_id,
            "team2_id": team2_id,
            "team1_wins": 0,
            "team2_wins": 0,
            "total_games": 0,
            "season": season,
        }
