from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.search import SearchResults
from app.services.search import search_entities

router = APIRouter()


@router.get(
    "/search",
    response_model=SearchResults,
    tags=["search"],
    summary="Search Players and Teams",
    description="Search for players and teams by name.",
)
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    try:
        return await search_entities(q, db)
    except HTTPException as e:
        raise e
