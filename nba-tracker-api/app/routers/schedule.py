import logging

from fastapi import APIRouter, HTTPException

from app.schemas.schedule import GamesResponse
from app.services.schedule import getGamesForDate

logger = logging.getLogger(__name__)
router = APIRouter()


# Get games for a specific date with full game details
@router.get(
    "/schedule/date/{date}",
    response_model=GamesResponse,
    tags=["scoreboard"],
    summary="Get Games for a Specific Date",
    description="Get all NBA games for a specific date.",
)
async def get_games_for_date(date: str):
    """
    Get all games that were played or scheduled for a specific date.
    
    Args:
        date: The date in YYYY-MM-DD format
        
    Returns:
        GamesResponse: List of all games for that date
    """
    return await getGamesForDate(date)
