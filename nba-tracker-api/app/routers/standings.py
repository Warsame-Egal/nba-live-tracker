from fastapi import APIRouter, HTTPException
from app.schemas.standings import StandingRecord, StandingsResponse
from app.services.standings import getSeasonStandings, getTeamStandings

router = APIRouter()


@router.get(
    "/standings/season/{season}",
    response_model=StandingsResponse,
    tags=["standings"],
    summary="Get NBA Standings for a Given Season",
    description="Fetch the NBA team standings for a specific season.",
)
async def season_standings(season: str):
    """
    API route to fetch and return NBA team standings for a given season.

    Args:
        season (str): NBA season (e.g., '2023-24').

    Returns:
        StandingsResponse: Structured standings of all teams for the season.
    """
    try:
        return await getSeasonStandings(season)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/standings/team/{team_id}/season/{season}",
    response_model=StandingRecord,
    tags=["standings"],
    summary="Get Standings for a Specific Team",
    description="Fetch the standings of a specific NBA team in a given season.",
)
async def team_standings(team_id: int, season: str):
    """
    API route to fetch and return standings for a specific NBA team.

    Args:
        team_id (int): NBA Team ID.
        season (str): NBA season (e.g., '2023-24').

    Returns:
        StandingRecord: Standings for the specified team.
    """
    try:
        return await getTeamStandings(team_id, season)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
