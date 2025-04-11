from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.team import TeamDetailsResponse, TeamSummary
from app.services.teams import get_team, search_teams

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


@router.get(
    "/teams/search/{search_term}",
    response_model=List[TeamSummary],
    summary="Search Teams",
    tags=["teams"],
    description="Search for teams by name or abbreviation.",
)
async def searchTeams(search_term: str):
    try:
        return await search_teams(search_term)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}") from e
