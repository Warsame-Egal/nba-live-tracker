from fastapi import APIRouter, HTTPException
from app.services.schedule import getSeasonSchedule, getTeamSchedule
from app.schemas.schedule import ScheduleResponse

router = APIRouter()


@router.get("/schedule/season/{season}",
            response_model=ScheduleResponse,
            tags=["schedule"],
            summary="Get Full Season Schedule",
            description="Fetch all NBA games for a given season.")
async def season_schedule(season: str):
    """
    API route to fetch and return all NBA games for a given season.

    Args:
        season (str): NBA season (e.g., '2023-24').

    Returns:
        ScheduleResponse: Structured schedule of all games for the season.
    """
    try:
        return await getSeasonSchedule(season)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedule/team/{team_id}/season/{season}",
            response_model=ScheduleResponse,
            tags=["schedule"],
            summary="Get Team's Full Season Schedule",
            description="Fetch all games for a specific team in a given season.")
async def team_schedule(team_id: int, season: str):
    """
    API route to retrieve the complete game schedule for a specific NBA team.

    Args:
        team_id (int): NBA Team ID.
        season (str): NBA season (e.g., '2023-24').

    Returns:
        ScheduleResponse: A structured schedule for the specified team.
    """
    try:
        return await getTeamSchedule(team_id, season)
    except HTTPException as e:
        raise e
