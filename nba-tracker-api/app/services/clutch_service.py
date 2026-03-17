"""
Clutch performance: last 5 minutes, score within 5 points.
Uses PlayerDashboardByClutch (Overall + Last5Min5Point). For player profile card.
"""

import asyncio
import logging
from typing import Any

from fastapi import HTTPException
from nba_api.stats.endpoints import PlayerDashboardByClutch

from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


def _row_to_dict(headers: list, row: list) -> dict:
    return dict(zip(headers, row)) if headers and row else {}


async def get_clutch_performance(player_id: int, season: str) -> dict[str, Any]:
    """
    Clutch stats vs regular: PPG, FG%, W-L, +/-. Returns dict with regular_* and clutch_*.
    """
    try:
        await rate_limit()
        api = get_api_kwargs()
        raw = await asyncio.wait_for(
            asyncio.to_thread(lambda: PlayerDashboardByClutch(player_id=player_id, season=season, **api).get_dict()),
            timeout=12.0,
        )
    except Exception as e:
        logger.warning("PlayerDashboardByClutch failed for player %s: %s", player_id, e)
        raise HTTPException(status_code=502, detail="Clutch data unavailable")

    sets = raw.get("resultSets") or []
    if isinstance(sets, dict):
        sets = [sets]
    overall_row = None
    clutch_row = None
    for rs in sets:
        if not isinstance(rs, dict):
            continue
        name = (rs.get("name") or "").strip()
        headers = rs.get("headers") or []
        rows = rs.get("rowSet") or []
        if not rows:
            continue
        row = rows[0]
        d = _row_to_dict(headers, row)
        if name == "OverallPlayerDashboard":
            overall_row = d
        elif name == "Last5Min5PointPlayerDashboard":
            clutch_row = d

    if not overall_row or not clutch_row:
        return {
            "season": season,
            "player_id": player_id,
            "regular": _summary(overall_row),
            "clutch": _summary(clutch_row),
            "clutch_w_l": None,
            "clutch_plus_minus": None,
        }

    def pct(v):
        return round(float(v) * 100, 1) if v is not None else None

    reg_gp = overall_row.get("GP") or 0
    reg_pts = overall_row.get("PTS") or 0
    reg_ppg = round(reg_pts / reg_gp, 1) if reg_gp else None
    clutch_gp = clutch_row.get("GP") or 0
    clutch_pts = clutch_row.get("PTS") or 0
    clutch_ppg = round(clutch_pts / clutch_gp, 1) if clutch_gp else None
    clutch_w = clutch_row.get("W")
    clutch_l = clutch_row.get("L")
    clutch_pm = clutch_row.get("PLUS_MINUS")

    return {
        "season": season,
        "player_id": player_id,
        "regular": {
            "ppg": reg_ppg,
            "fg_pct": pct(overall_row.get("FG_PCT")),
            "gp": reg_gp,
        },
        "clutch": {
            "ppg": clutch_ppg,
            "fg_pct": pct(clutch_row.get("FG_PCT")),
            "gp": clutch_gp,
        },
        "clutch_w_l": f"{clutch_w}-{clutch_l}" if clutch_w is not None and clutch_l is not None else None,
        "clutch_plus_minus": round(float(clutch_pm), 1) if clutch_pm is not None else None,
        "ppg_diff": round(clutch_ppg - reg_ppg, 1) if (clutch_ppg is not None and reg_ppg is not None) else None,
        "fg_pct_diff": (
            round((float(clutch_row.get("FG_PCT") or 0) - float(overall_row.get("FG_PCT") or 0)) * 100, 1)
            if clutch_row.get("FG_PCT") is not None and overall_row.get("FG_PCT") is not None
            else None
        ),
    }


def _summary(row: dict | None) -> dict:
    if not row:
        return {"ppg": None, "fg_pct": None, "gp": None}
    gp = row.get("GP") or 0
    pts = row.get("PTS") or 0
    ppg = round(pts / gp, 1) if gp else None
    fg = row.get("FG_PCT")
    return {
        "ppg": ppg,
        "fg_pct": round(float(fg) * 100, 1) if fg is not None else None,
        "gp": gp,
    }
