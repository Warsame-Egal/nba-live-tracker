import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.league import LeagueLeader, LeagueLeadersResponse
from app.utils.errors import upstream_error
from app.services.league_leaders import get_league_leaders
from app.services.team_league_services import (
    get_league_hustle_leaders,
    get_league_team_clutch,
    get_playoff_picture,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/league/leaders",
    response_model=LeagueLeadersResponse,
    summary="Get League Leaders",
    tags=["league"],
    description="Get top 5 players for a specific stat category (Points, Rebounds, Assists, Steals, Blocks).",
)
async def get_league_leaders_endpoint(
    stat_category: str = Query("PTS", description="Stat category: PTS, REB, AST, STL, or BLK"),
    season: Optional[str] = Query(None, description="Season in format YYYY-YY (defaults to current season)"),
):
    """
    Get top 5 league leaders for a specific stat category.

    Returns the top 5 players in the specified category with their stats, rank, and games played.
    This endpoint powers the League Leaders Dashboard in the UniversalSidebar, allowing users
    to view top performers across different stat categories.

    Results are cached for 5 minutes to reduce NBA API calls and manage rate limits.
    The endpoint supports all major stat categories: points, rebounds, assists, steals, and blocks.

    Args:
        stat_category: Stat category (PTS, REB, AST, STL, BLK)
        season: Season in format "YYYY-YY" (optional, defaults to current season)

    Returns:
        LeagueLeadersResponse: Top 5 players with their stats, including:
        - player_id, name, team, stat_value, rank, games_played
    """
    try:
        leaders_data = await get_league_leaders(stat_category=stat_category, season=season, top_n=5)

        # Convert dicts to LeagueLeader models
        leaders = [LeagueLeader(**leader_dict) for leader_dict in leaders_data]

        # Get season for response
        if season is None:
            from app.utils.season import get_current_season

            season = get_current_season()

        return LeagueLeadersResponse(category=stat_category.upper(), season=season, leaders=leaders)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching league leaders: {e}", exc_info=True)
        raise upstream_error("league", str(e))


@router.get(
    "/league/hustle-leaders",
    summary="Get League Hustle Leaders",
    tags=["league"],
    description="League-wide hustle stats: deflections, contested shots, screen assists, etc. Cached 30 min.",
)
async def get_hustle_leaders(
    season: str = Query("2024-25", description="Season YYYY-YY"),
    per_mode: str = Query("PerGame", description="PerGame or Totals"),
):
    try:
        return {"leaders": await get_league_hustle_leaders(season=season, per_mode=per_mode)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching hustle leaders: {e}", exc_info=True)
        raise upstream_error("league", str(e))


@router.get(
    "/league/team-clutch",
    summary="Get Team Clutch Report",
    tags=["league"],
    description="Every team's record and metrics in clutch (last 5 min, within 5 pts).",
)
async def get_team_clutch_report(
    season: str = Query("2024-25", description="Season YYYY-YY"),
):
    try:
        return {"teams": await get_league_team_clutch(season=season)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team clutch: {e}", exc_info=True)
        raise upstream_error("league", str(e))


@router.get(
    "/league/playoff-picture",
    summary="Get Playoff Picture",
    tags=["league"],
    description="Projected playoff bracket if season ended today. Cached 30 min.",
)
async def get_playoff_picture_route(
    season: Optional[str] = Query(None, description="Season YYYY-YY (optional)"),
):
    try:
        return await get_playoff_picture(season=season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching playoff picture: {e}", exc_info=True)
        raise upstream_error("league", str(e))
