import logging
from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.player import PlayerSummary
from app.services.players import getPlayer, search_players

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
