from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.league_leaders import LeagueLeadersResponse
from app.services.league_leaders import getLeagueLeaders

router = APIRouter()


@router.get(
    "/leaders/{season}/{stat_category}",
    response_model=LeagueLeadersResponse,
    tags=["players"],
    summary="Get League Leaders",
    description="Retrieve top players for a statistic in a season.",
)
async def league_leaders(season: str, stat_category: str, db: AsyncSession = Depends(get_db)):
    try:
        return await getLeagueLeaders(season, stat_category.upper(), db)
    except HTTPException as e:
        raise e