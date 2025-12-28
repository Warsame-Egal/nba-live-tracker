from fastapi import APIRouter, HTTPException

from app.schemas.team import TeamDetailsResponse
from app.services.teams import get_team

router = APIRouter()


@router.get(
    "/teams/{team_id}",
    response_model=TeamDetailsResponse,
    summary="Get Team Details",
    tags=["teams"],
    description="Retrieve detailed information about a specific team.",
)
async def fetch_team(team_id: int):
    try:
        return await get_team(team_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e
