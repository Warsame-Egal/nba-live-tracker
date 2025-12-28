import logging

from fastapi import APIRouter, HTTPException

from app.schemas.team import TeamDetailsResponse
from app.services.teams import get_team

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# Get team details endpoint
@router.get(
    "/teams/{team_id}",
    response_model=TeamDetailsResponse,
    summary="Get Team Details",
    tags=["teams"],
    description="Get detailed information about a specific team.",
)
async def fetch_team(team_id: int):
    """
    Get all information about a specific NBA team.
    Includes arena, owner, coach, etc.
    
    Args:
        team_id: The NBA team ID
        
    Returns:
        TeamDetailsResponse: All team information
    """
    try:
        return await get_team(team_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error fetching team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e
