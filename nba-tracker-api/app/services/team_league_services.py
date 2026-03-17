"""
Team and league endpoints: hustle leaders, advanced box score, lineups, on/off, team clutch, playoff picture.
"""

import asyncio
import logging
import time
from typing import Any

from fastapi import HTTPException
from nba_api.stats.endpoints import (
    LeagueDashTeamClutch,
    LeagueHustleStatsPlayer,
    PlayoffPicture,
    TeamDashLineups,
    TeamPlayerOnOffDetails,
)

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

_hustle_cache: dict[str, tuple[list, float]] = {}
_playoff_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 30 * 60  # 30 min


def _rs_to_list(rs: dict) -> list[dict]:
    headers = rs.get("headers") or []
    rows = rs.get("rowSet") or []
    return [dict(zip(headers, row)) for row in rows]


def _first_rs(sets: list, name_substr: str) -> dict | None:
    for rs in sets:
        if isinstance(rs, dict) and name_substr in (rs.get("name") or ""):
            return rs
    return None


async def get_league_hustle_leaders(season: str = "2024-25", per_mode: str = "PerGame") -> list[dict[str, Any]]:
    """League-wide hustle leaders (deflections, contested shots, etc.). Cached 30 min."""
    key = f"{season}:{per_mode}"
    now = time.time()
    if key in _hustle_cache:
        data, ts = _hustle_cache[key]
        if now - ts < _CACHE_TTL:
            return data
        _hustle_cache.pop(key, None)
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: LeagueHustleStatsPlayer(season=season, per_mode=per_mode, **api).get_dict()),
            timeout=15.0,
        )
    except Exception as e:
        logger.warning("LeagueHustleStatsPlayer failed: %s", e)
        raise HTTPException(status_code=502, detail="Hustle leaders unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs(sets, "LeagueHustleStatsPlayer")
    data = _rs_to_list(rs) if rs else []
    _hustle_cache[key] = (data, time.time())
    return data


async def get_team_lineups(team_id: int, season: str = "2024-25") -> list[dict[str, Any]]:
    """Top and bottom lineups by net rating (min minutes). TeamDashLineups."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: TeamDashLineups(team_id=team_id, season=season, **api).get_dict()),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("TeamDashLineups failed: %s", e)
        raise HTTPException(status_code=502, detail="Lineup data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs(sets, "Lineups")
    return _rs_to_list(rs) if rs else []


async def get_team_on_off_details(team_id: int, season: str = "2024-25") -> list[dict[str, Any]]:
    """On/off court net rating per player. TeamPlayerOnOffDetails."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: TeamPlayerOnOffDetails(team_id=team_id, season=season, **api).get_dict()),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("TeamPlayerOnOffDetails failed: %s", e)
        raise HTTPException(status_code=502, detail="On/off data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs(sets, "OnOffDetails")
    return _rs_to_list(rs) if rs else []


async def get_league_team_clutch(season: str = "2024-25") -> list[dict[str, Any]]:
    """Every team's clutch record and metrics. LeagueDashTeamClutch."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: LeagueDashTeamClutch(season=season, **api).get_dict()),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("LeagueDashTeamClutch failed: %s", e)
        raise HTTPException(status_code=502, detail="Team clutch data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs(sets, "LeagueDashTeamClutch")
    return _rs_to_list(rs) if rs else []


async def get_playoff_picture(season: str | None = None) -> dict[str, Any]:
    """Projected playoff bracket. PlayoffPicture. Cached 30 min."""
    key = season or "current"
    now = time.time()
    if key in _playoff_cache:
        data, ts = _playoff_cache[key]
        if now - ts < _CACHE_TTL:
            return data
        _playoff_cache.pop(key, None)
    try:
        await rate_limit()
        api = get_api_kwargs()
        kwargs = {} if season is None else {"season": season}
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: PlayoffPicture(**{**kwargs, **api}).get_dict()),
            timeout=15.0,
        )
    except Exception as e:
        logger.warning("PlayoffPicture failed: %s", e)
        raise HTTPException(status_code=502, detail="Playoff picture unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    out = {"season": season, "result_sets": {}}
    for rs in sets:
        if isinstance(rs, dict) and rs.get("name"):
            out["result_sets"][rs["name"]] = _rs_to_list(rs)
    _playoff_cache[key] = (out, time.time())
    return out
