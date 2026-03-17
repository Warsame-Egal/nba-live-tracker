"""
Shooting zones efficiency: aggregate ShotChartDetail by SHOT_ZONE_BASIC, join league averages.
Cache 30 min. Used for zone grid (FG%, league avg, diff, freq) on player profile.
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Any

from fastapi import HTTPException
from nba_api.stats.endpoints import ShotChartDetail
from nba_api.stats.endpoints import commonplayerinfo

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

_CACHE: dict[tuple[int, str], tuple[list[dict], float]] = {}
_CACHE_TTL = 30 * 60  # 30 minutes

# Zone order for consistent response
ZONE_ORDER = [
    "Restricted Area",
    "In The Paint (Non-RA)",
    "Mid-Range",
    "Left Corner 3",
    "Right Corner 3",
    "Above the Break 3",
]


async def _get_team_id_for_player(player_id: int, season: str) -> int | None:
    """Resolve team_id for player in season via commonplayerinfo (current team)."""
    try:
        await rate_limit()
        api = get_api_kwargs()
        data = await asyncio.wait_for(
            asyncio.to_thread(lambda: commonplayerinfo.CommonPlayerInfo(player_id=player_id, **api).get_dict()),
            timeout=10.0,
        )
        sets = data.get("resultSets") or []
        if isinstance(sets, dict):
            sets = [sets]
        for rs in sets:
            if not isinstance(rs, dict):
                continue
            h = rs.get("headers") or []
            rows = rs.get("rowSet") or []
            if "TEAM_ID" in h and rows:
                idx = h.index("TEAM_ID")
                return int(rows[0][idx]) if rows[0][idx] is not None else None
        return None
    except Exception as e:
        logger.warning("Resolve team_id for player %s: %s", player_id, e)
        return None


def _aggregate_by_zone(rows: list, headers: list) -> dict[str, dict]:
    """Aggregate shot chart rows by SHOT_ZONE_BASIC. Returns zone -> {fga, fgm, fg_pct}."""
    try:
        zone_idx = headers.index("SHOT_ZONE_BASIC")
        fga_idx = headers.index("SHOT_ATTEMPTED_FLAG") if "SHOT_ATTEMPTED_FLAG" in headers else None
        fgm_idx = headers.index("SHOT_MADE_FLAG") if "SHOT_MADE_FLAG" in headers else None
    except ValueError:
        return {}
    by_zone: dict[str, dict] = defaultdict(lambda: {"fga": 0, "fgm": 0})
    for row in rows:
        if zone_idx >= len(row):
            continue
        zone = str(row[zone_idx]).strip() if row[zone_idx] is not None else "Other"
        fga = 1
        fgm = int(row[fgm_idx]) if fgm_idx is not None and fgm_idx < len(row) and row[fgm_idx] is not None else 0
        if fga_idx is not None and fga_idx < len(row) and row[fga_idx] is not None:
            fga = int(row[fga_idx])
        by_zone[zone]["fga"] += fga
        by_zone[zone]["fgm"] += fgm
    for z, v in by_zone.items():
        v["fg_pct"] = round(v["fgm"] / v["fga"], 4) if v["fga"] else 0.0
    return dict(by_zone)


def _league_avg_by_zone(rows: list, headers: list) -> dict[str, float]:
    """LeagueAverages result set -> zone -> FG_PCT."""
    try:
        zone_idx = headers.index("SHOT_ZONE_BASIC")
        fg_pct_idx = headers.index("FG_PCT")
    except ValueError:
        return {}
    out = {}
    for row in rows:
        if zone_idx < len(row) and fg_pct_idx < len(row) and row[zone_idx] and row[fg_pct_idx] is not None:
            out[str(row[zone_idx]).strip()] = float(row[fg_pct_idx])
    return out


async def get_shooting_zones(player_id: int, season: str, team_id: int | None = None) -> list[dict[str, Any]]:
    """
    Per-zone FG% vs league average. Returns list of {zone, fg_pct, league_avg, diff_pct, freq_pct}.
    Uses ShotChartDetail; cache 30 min. team_id optional (resolved via commonplayerinfo if missing).
    """
    cache_key = (player_id, season)
    now = time.time()
    if cache_key in _CACHE:
        data, ts = _CACHE[cache_key]
        if now - ts < _CACHE_TTL:
            return data
        _CACHE.pop(cache_key, None)

    tid = team_id
    if tid is None:
        tid = await _get_team_id_for_player(player_id, season)
    if tid is None:
        raise HTTPException(status_code=400, detail="Could not resolve team for player/season")

    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: ShotChartDetail(
                    team_id=tid,
                    player_id=player_id,
                    season_nullable=season,
                    **api,
                ).get_dict()
            ),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("ShotChartDetail failed for player %s: %s", player_id, e)
        raise HTTPException(status_code=502, detail="Shot chart data unavailable")

    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    shot_detail = None
    league_avg = None
    for rs in sets:
        if not isinstance(rs, dict):
            continue
        name = rs.get("name") or ""
        headers = rs.get("headers") or []
        rows = rs.get("rowSet") or []
        if name == "Shot_Chart_Detail":
            shot_detail = (headers, rows)
        elif name == "LeagueAverages":
            league_avg = _league_avg_by_zone(rows, headers)

    if not shot_detail:
        result = []
    else:
        h, rows = shot_detail
        player_by_zone = _aggregate_by_zone(rows, h)
        league = league_avg or {}
        total_fga = sum(v["fga"] for v in player_by_zone.values())
        result = []
        for zone in ZONE_ORDER:
            if zone not in player_by_zone:
                continue
            v = player_by_zone[zone]
            fg_pct = v["fg_pct"]
            lg = league.get(zone)
            diff_pct = round((fg_pct - lg) * 100, 1) if lg is not None else None
            freq_pct = round(100 * v["fga"] / total_fga, 1) if total_fga else 0
            result.append(
                {
                    "zone": zone,
                    "fg_pct": round(fg_pct * 100, 1),
                    "league_avg": round(lg * 100, 1) if lg is not None else None,
                    "diff_pct": diff_pct,
                    "freq_pct": freq_pct,
                }
            )
        # Append any other zones not in ZONE_ORDER
        for zone, v in player_by_zone.items():
            if zone in ZONE_ORDER:
                continue
            lg = league.get(zone)
            result.append(
                {
                    "zone": zone,
                    "fg_pct": round(v["fg_pct"] * 100, 1),
                    "league_avg": round(lg * 100, 1) if lg is not None else None,
                    "diff_pct": round((v["fg_pct"] - lg) * 100, 1) if lg is not None else None,
                    "freq_pct": round(100 * v["fga"] / total_fga, 1) if total_fga else 0,
                }
            )

    _CACHE[cache_key] = (result, time.time())
    return result
