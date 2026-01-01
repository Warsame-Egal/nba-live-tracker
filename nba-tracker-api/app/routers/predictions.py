import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.schemas.predictions import PredictionsResponse
from app.services.predictions import predict_games_for_date
from app.utils.season import get_current_season

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/predictions/date/{date}",
    response_model=PredictionsResponse,
    tags=["predictions"],
    summary="Get Game Predictions for a Date",
    description="Get simple statistical predictions for all games on a specific date.",
)
async def get_predictions_for_date(
    date: str,
    season: str = Query(None, description="Season in format YYYY-YY (defaults to current season)"),
):
    """
    Get predictions for all games on a specific date.
    
    Uses a simple statistical model based on team win percentages, net ratings, and home court advantage.
    
    Args:
        date: Date in YYYY-MM-DD format
        season: Season (defaults to current season)
        
    Returns:
        PredictionsResponse: Predictions for all games on the date
    """
    try:
        # Validate date format
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Check if date is too far in the future (more than 1 year ahead)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        max_future_date = datetime(today.year + 1, 12, 31)
        
        if parsed_date > max_future_date:
            raise HTTPException(
                status_code=400, 
                detail=f"Date too far in the future. Predictions are available up to {max_future_date.strftime('%Y-%m-%d')}"
            )
        
        if not season:
            season = get_current_season()
        
        return await predict_games_for_date(date, season)
    except HTTPException:
        raise
    except KeyboardInterrupt:
        raise
    except Exception as e:
        logger.error(f"Error getting predictions for date {date}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting predictions: {str(e)}")

