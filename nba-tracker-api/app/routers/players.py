import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.player import PlayerSummary
from app.schemas.shotchart import ShotChartResponse
from app.services.players import getPlayer, search_players
from app.services.shotchart import get_player_shot_chart

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# Get player details endpoint
@router.get(
    "/player/{player_id}",
    response_model=PlayerSummary,
    summary="Get Player Details",
    tags=["players"],
    description="Get detailed information about a specific player including stats and recent games.",
)
async def fetchPlayer(player_id: str):
    """
    Get all information about a specific player.
    Includes their stats and their last 5 games.
    
    Args:
        player_id: The NBA player ID
        
    Returns:
        PlayerSummary: All player information
    """
    try:
        return await getPlayer(player_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unhandled error in fetchPlayer for player {player_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching player: {str(e)}")


# Search players endpoint
@router.get(
    "/players/search/{search_term}",
    response_model=List[PlayerSummary],
    summary="Search Players",
    tags=["players"],
    description="Search for players by name.",
)
async def searchPlayers(search_term: str):
    """
    Search for players by their first or last name.
    
    Args:
        search_term: The name to search for
        
    Returns:
        List[PlayerSummary]: List of matching players (up to 20)
    """
    try:
        return await search_players(search_term)
    except HTTPException as e:
        raise e


# Shot chart endpoint
@router.get(
    "/player/{player_id}/shot-chart",
    response_model=ShotChartResponse,
    summary="Get Player Shot Chart",
    tags=["players"],
    description="Get shot chart data for a player with X/Y coordinates showing shot locations on the court.",
)
async def getPlayerShotChart(
    player_id: str,
    team_id: int = Query(..., description="NBA team ID"),
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
    season_type: str = Query("Regular Season", description="Regular Season, Playoffs, or Pre Season"),
    context_measure: str = Query("FGA", description="FGA (field goals attempted) or FGM (field goals made)"),
    last_n_games: int = Query(0, description="Last N games filter (0 = all games)"),
    month: int = Query(0, description="Month filter (0 = all months)"),
    opponent_team_id: int = Query(0, description="Opponent team filter (0 = all teams)"),
    period: int = Query(0, description="Period filter (0 = all periods)"),
    date_from: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
):
    """
    Get shot chart data for a player with X/Y coordinates.
    
    Returns shot locations on the court, shot zones, and league averages.
    """
    try:
        return await get_player_shot_chart(
            player_id=int(player_id),
            team_id=team_id,
            season=season,
            season_type=season_type,
            context_measure=context_measure,
            last_n_games=last_n_games,
            month=month,
            opponent_team_id=opponent_team_id,
            period=period,
            date_from=date_from,
            date_to=date_to,
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in getPlayerShotChart: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
