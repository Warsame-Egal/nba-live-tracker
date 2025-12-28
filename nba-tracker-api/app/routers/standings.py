from fastapi import APIRouter, HTTPException

from app.schemas.standings import StandingsResponse
from app.services.standings import getSeasonStandings

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
