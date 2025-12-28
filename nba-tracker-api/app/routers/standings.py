import logging

from fastapi import APIRouter, HTTPException

from app.schemas.standings import StandingsResponse
from app.services.standings import getSeasonStandings

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# Get standings endpoint
@router.get(
    "/standings/season/{season}",
    response_model=StandingsResponse,
    tags=["standings"],
    summary="Get NBA Standings for a Given Season",
    description="Get the win/loss records and rankings for all teams in a season.",
)
async def season_standings(season: str):
    """
    Get the standings (win/loss records) for all teams in a season.
    Shows playoff rankings and team records.
    
    Args:
        season: The season year like "2023-24"
        
    Returns:
        StandingsResponse: Standings for all teams
    """
    try:
        return await getSeasonStandings(season)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error fetching standings for season {season}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
