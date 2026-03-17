"""
Player profile data: year-over-year, passing, defense, general splits, shooting splits.
Each function calls one nba_api endpoint and returns a normalized dict for the API.
"""

import asyncio
import logging
from typing import Any

from fastapi import HTTPException
from nba_api.stats.endpoints import (
    PlayerDashboardByGeneralSplits,
    PlayerDashboardByShootingSplits,
    PlayerDashboardByYearOverYear,
    PlayerDashPtPass,
    PlayerDashPtShotDefend,
    commonplayerinfo,
)

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


async def _get_team_id(player_id: int) -> int | None:
    try:
        await rate_limit()
        api = get_api_kwargs()
        d = await asyncio.wait_for(
            asyncio.to_thread(lambda: commonplayerinfo.CommonPlayerInfo(player_id=player_id, **api).get_dict()),
            timeout=10.0,
        )
        for rs in d.get("resultSets") or []:
            if not isinstance(rs, dict) or (rs.get("name") or "") != "CommonPlayerInfo":
                continue
            h = rs.get("headers") or []
            rows = rs.get("rowSet") or []
            if "TEAM_ID" in h and rows:
                idx = h.index("TEAM_ID")
                v = rows[0][idx]
                return int(v) if v is not None else None
        return None
    except Exception as e:
        logger.warning("Resolve team_id for player %s: %s", player_id, e)
        return None


def _rs_to_list(rs: dict) -> list[dict]:
    headers = rs.get("headers") or []
    rows = rs.get("rowSet") or []
    return [dict(zip(headers, row)) for row in rows]


def _first_rs_by_name(sets: list, name: str) -> dict | None:
    for rs in sets:
        if isinstance(rs, dict) and (rs.get("name") or "").strip() == name:
            return rs
    return None


async def get_year_over_year(player_id: int) -> list[dict[str, Any]]:
    """Career stats by season (ByYearPlayerDashboard)."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: PlayerDashboardByYearOverYear(player_id=player_id, **api).get_dict()),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("YearOverYear failed for player %s: %s", player_id, e)
        raise HTTPException(status_code=502, detail="Year-over-year data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs_by_name(sets, "ByYearPlayerDashboard")
    if not rs:
        return []
    rows = _rs_to_list(rs)
    return [r for r in rows if r.get("GROUP_VALUE")]  # filter empty


async def get_passing_network(player_id: int, season: str, team_id: int | None = None) -> list[dict[str, Any]]:
    """Top pass targets (PASS_TO, FREQUENCY, AST, FG_PCT). Requires team_id."""
    tid = team_id
    if tid is None:
        tid = await _get_team_id(player_id)
    if tid is None:
        raise HTTPException(status_code=400, detail="Could not resolve team for player")
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: PlayerDashPtPass(team_id=tid, player_id=player_id, season=season, **api).get_dict()
            ),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("PlayerDashPtPass failed: %s", e)
        raise HTTPException(status_code=502, detail="Passing data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs_by_name(sets, "PassesMade")
    if not rs:
        return []
    rows = _rs_to_list(rs)
    return rows[:20]  # top 20


async def get_shot_defense(player_id: int, season: str, team_id: int | None = None) -> list[dict[str, Any]]:
    """FG% allowed as defender by shot type (D_FG_PCT, NORMAL_FG_PCT, PCT_PLUSMINUS). team_id=0 for all."""
    tid = team_id if team_id is not None else 0
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: PlayerDashPtShotDefend(team_id=tid, player_id=player_id, season=season, **api).get_dict()
            ),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("PlayerDashPtShotDefend failed: %s", e)
        raise HTTPException(status_code=502, detail="Defensive data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    for candidate in ("DefenderImpact", "DefensiveImpact", "ShotDefense"):
        rs = _first_rs_by_name(sets, candidate)
        if rs:
            return _rs_to_list(rs)
    return []


async def get_general_splits(player_id: int, season: str) -> dict[str, Any]:
    """Location, wins/losses, month, rest splits."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: PlayerDashboardByGeneralSplits(player_id=player_id, season=season, **api).get_dict()
            ),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("PlayerDashboardByGeneralSplits failed: %s", e)
        raise HTTPException(status_code=502, detail="Splits data unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    out = {}
    for name in [
        "LocationPlayerDashboard",
        "WinsLossesPlayerDashboard",
        "MonthPlayerDashboard",
        "DaysRestPlayerDashboard",
    ]:
        rs = _first_rs_by_name(sets, name)
        if rs:
            out[name.replace("PlayerDashboard", "").replace("Dashboard", "")] = _rs_to_list(rs)
    return out


async def get_shooting_splits(player_id: int, season: str) -> dict[str, Any]:
    """Assisted vs unassisted (AssitedShotPlayerDashboard), shot area, etc."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: PlayerDashboardByShootingSplits(player_id=player_id, season=season, **api).get_dict()
            ),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("PlayerDashboardByShootingSplits failed: %s", e)
        raise HTTPException(status_code=502, detail="Shooting splits unavailable")
    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    rs = _first_rs_by_name(sets, "AssitedShotPlayerDashboard")
    out = {"assisted_shot": _rs_to_list(rs) if rs else []}
    rs2 = _first_rs_by_name(sets, "ShotAreaPlayerDashboard")
    if rs2:
        out["shot_area"] = _rs_to_list(rs2)
    return out
