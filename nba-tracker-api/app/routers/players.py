import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.player import PlayerSummary
from app.schemas.seasonleaders import SeasonLeadersResponse
from app.schemas.playergamelog import PlayerGameLogResponse
from app.schemas.alltimeleaders import AllTimeLeadersResponse
from app.services.players import getPlayer, search_players, get_season_leaders, get_top_players_by_stat, get_player_game_log, get_all_time_leaders

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/player/{player_id}",
    response_model=PlayerSummary,
    summary="Get Player Details",
    tags=["players"],
    description="Get detailed information about a specific player including stats and recent games.",
)
async def fetchPlayer(player_id: str):
    """Get player information including stats and recent games."""
    try:
        return await getPlayer(player_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player {player_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching player: {str(e)}")


@router.get(
    "/players/search/{search_term}",
    response_model=List[PlayerSummary],
    summary="Search Players",
    tags=["players"],
    description="Search for players by name.",
)
async def searchPlayers(search_term: str):
    """Search for players by first or last name."""
    try:
        return await search_players(search_term)
    except HTTPException:
        raise


@router.get(
    "/players/season-leaders",
    response_model=SeasonLeadersResponse,
    summary="Get Season Leaders",
    tags=["players"],
    description="Get season leaders for various stat categories (Points, Rebounds, Assists, Steals, Blocks per game).",
)
async def getSeasonLeaders(season: str = Query("2024-25", description="Season in format YYYY-YY")):
    """Get top 5 players for Points, Rebounds, Assists, Steals, and Blocks per game."""
    try:
        return await get_season_leaders(season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching season leaders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/players/top-by-stat",
    response_model=List[PlayerSummary],
    summary="Get Top Players By Stat",
    tags=["players"],
    description="Get top N players for a specific stat category for a season.",
)
async def getTopPlayersByStat(
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
    stat: str = Query("PTS", description="Stat to sort by (PTS, REB, AST, STL, BLK)"),
    top_n: int = Query(10, description="Number of top players to return", ge=1, le=50),
):
    """Get top N players sorted by a specific stat for a season."""
    try:
        return await get_top_players_by_stat(season, stat, top_n)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching top players by stat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/player/{player_id}/game-log",
    response_model=PlayerGameLogResponse,
    summary="Get Player Game Log",
    tags=["players"],
    description="Get game log for a player for a specific season with detailed stats for charting.",
)
async def getPlayerGameLog(
    player_id: str,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Get game log with detailed stats for a player and season."""
    try:
        return await get_player_game_log(player_id, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching game log: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/players/all-time-leaders",
    response_model=AllTimeLeadersResponse,
    summary="Get All-Time Leaders",
    tags=["players"],
    description="Get all-time career leaders for major statistical categories (Points, Rebounds, Assists, Steals, Blocks).",
)
async def getAllTimeLeaders(
    top_n: int = Query(10, description="Number of top players to return for each category (max 50)", ge=1, le=50),
):
    """Get all-time career leaders for major statistical categories."""
    try:
        return await get_all_time_leaders(top_n)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all-time leaders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
