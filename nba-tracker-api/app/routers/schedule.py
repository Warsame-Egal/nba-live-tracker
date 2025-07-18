from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.schedule import GamesResponse
from app.services.schedule import getGamesForDate
from app.database import get_db

router = APIRouter()


@router.get(
    "/schedule/date/{date}",
    response_model=GamesResponse,
    tags=["scoreboard"],
    summary="Get Games for a Specific Date",
    description="Retrieve past and present NBA games for a given date.",
)
async def get_games_for_date(date: str, db: AsyncSession = Depends(get_db)):
    """
    API route to fetch NBA games scheduled or played on a specific date.

    Args:
        date (str): Date to fetch games for (YYYY-MM-DD).

    Returns:
        GamesResponse: List of games played on the specified date.
    """
    try:
        return await getGamesForDate(date, db)
    except HTTPException as e:
        raise e
