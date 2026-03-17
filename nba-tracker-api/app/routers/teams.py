import logging

from fastapi import APIRouter, HTTPException, Query

from app.schemas.team import TeamDetailsResponse
from app.utils.errors import upstream_error
from app.schemas.teamstats import TeamStatsResponse
from app.schemas.teamgamelog import TeamGameLogResponse
from app.schemas.teamplayerstats import TeamPlayerStatsResponse
from app.services.head_to_head import get_head_to_head_record
from app.services.teams import get_team
from app.services.teamstats import get_team_stats
from app.services.teamgamelog import get_team_game_log
from app.services.teamplayerstats import get_team_player_stats
from app.services.team_league_services import get_team_lineups, get_team_on_off_details

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
        raise upstream_error("teams", str(e))


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
        raise upstream_error("teams", str(e)) from e


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
        raise upstream_error("teams", str(e))


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
        raise upstream_error("teams", str(e))


@router.get(
    "/teams/{team_id}/lineups",
    summary="Get Team Lineups",
    tags=["teams"],
    description="5-man lineup performance by net rating (TeamDashLineups).",
)
async def get_team_lineups_route(
    team_id: int,
    season: str = Query("2024-25", description="Season YYYY-YY"),
):
    try:
        return {"lineups": await get_team_lineups(team_id, season=season)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lineups: {e}", exc_info=True)
        raise upstream_error("teams", str(e))


@router.get(
    "/teams/{team_id}/on-off",
    summary="Get Player On/Off Impact",
    tags=["teams"],
    description="Team net rating with each player on vs off court.",
)
async def get_team_on_off_route(
    team_id: int,
    season: str = Query("2024-25", description="Season YYYY-YY"),
):
    try:
        return {"on_off": await get_team_on_off_details(team_id, season=season)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching on/off: {e}", exc_info=True)
        raise upstream_error("teams", str(e))


@router.get(
    "/teams/{team1_id}/vs/{team2_id}",
    summary="Get Head-to-Head Record",
    tags=["teams"],
    description="Get regular-season head-to-head record between two teams. Cached per team pair and season.",
)
async def get_teams_vs(
    team1_id: int,
    team2_id: int,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Returns team1_wins, team2_wins, total_games, season."""
    try:
        return await get_head_to_head_record(team1_id, team2_id, season)
    except Exception as e:
        logger.error(f"Error fetching head-to-head {team1_id} vs {team2_id}: {e}", exc_info=True)
        raise upstream_error("head-to-head", str(e))
