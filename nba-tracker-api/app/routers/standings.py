import logging

from fastapi import APIRouter, HTTPException, Query

from app.schemas.pagination import PaginatedResponse, PaginationParams
from app.schemas.standings import StandingRecord
from app.utils.errors import upstream_error
from app.services.standings import getSeasonStandings

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# Get standings endpoint
@router.get(
    "/standings/season/{season}",
    response_model=PaginatedResponse[StandingRecord],
    tags=["standings"],
    summary="Get NBA Standings for a Given Season",
    description="Get the win/loss records and rankings for all teams in a season. Supports pagination.",
)
async def season_standings(
    season: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get the standings (win/loss records) for all teams in a season.
    Shows playoff rankings and team records.
    """
    try:
        resp = await getSeasonStandings(season)
        params = PaginationParams(page=page, limit=limit)
        full = resp.standings
        total = len(full)
        data = full[params.offset : params.offset + params.limit]
        return PaginatedResponse(
            data=data,
            page=params.page,
            limit=params.limit,
            total=total,
            has_more=params.offset + len(data) < total,
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error fetching standings for season {season}: {e}")
        raise upstream_error("standings", str(e))
