import logging

from fastapi import APIRouter, HTTPException, Query

from app.schemas.search import SearchResults
from app.services.search import search_entities

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# Search endpoint
@router.get(
    "/search",
    response_model=SearchResults,
    tags=["search"],
    summary="Search Players and Teams",
    description="Search for players and teams by name.",
)
async def search(q: str = Query(..., min_length=1)):
    """
    Search for both players and teams by name.
    Returns matching players and teams in one response.
    
    Args:
        q: The search term (at least 1 character)
        
    Returns:
        SearchResults: Lists of matching players and teams
    """
    try:
        return await search_entities(q)
    except HTTPException as e:
        raise e
