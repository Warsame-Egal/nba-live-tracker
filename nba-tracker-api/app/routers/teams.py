import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.team import TeamDetailsResponse
from app.schemas.teamstats import TeamStatsResponse
from app.schemas.teamgamelog import TeamGameLogResponse
from app.schemas.teamplayerstats import TeamPlayerStatsResponse
from app.services.teams import get_team
from app.services.teamstats import get_team_stats
from app.services.teamgamelog import get_team_game_log
from app.services.teamplayerstats import get_team_player_stats

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/teams/stats",
    response_model=TeamStatsResponse,
    summary="Get Team Statistics",
    tags=["teams"],
    description="Get team statistics for various categories sorted by performance.",
)
async def getTeamStats(season: str = Query("2024-25", description="Season in format YYYY-YY")):
    """Get team statistics for various categories."""
    try:
        return await get_team_stats(season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/teams/{team_id}",
    response_model=TeamDetailsResponse,
    summary="Get Team Details",
    tags=["teams"],
    description="Get detailed information about a specific team.",
)
async def fetch_team(team_id: int):
    """Get team information including arena, owner, and coach."""
    try:
        return await get_team(team_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e


@router.get(
    "/teams/{team_id}/game-log",
    response_model=TeamGameLogResponse,
    summary="Get Team Game Log",
    tags=["teams"],
    description="Get game log for a team for a specific season with detailed stats.",
)
async def getTeamGameLog(
    team_id: int,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Get game log with detailed stats for a team and season."""
    try:
        return await get_team_game_log(str(team_id), season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team game log: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/teams/{team_id}/player-stats",
    response_model=TeamPlayerStatsResponse,
    summary="Get Team Player Statistics",
    tags=["teams"],
    description="Get player statistics for a team for a specific season.",
)
async def getTeamPlayerStats(
    team_id: int,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Get player statistics for a team and season."""
    try:
        return await get_team_player_stats(team_id, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team player stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
