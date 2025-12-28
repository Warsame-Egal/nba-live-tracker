from fastapi import APIRouter, HTTPException, Query

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
async def search(q: str = Query(..., min_length=1)):
    try:
        return await search_entities(q)
    except HTTPException as e:
        raise e
