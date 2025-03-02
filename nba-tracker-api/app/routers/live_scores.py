from fastapi import APIRouter, HTTPException
from app.services.nba_service import get_live_scores
from nba_api.live.nba.endpoints import scoreboard


router = APIRouter()

@router.get("/live_scores", response_model=scoreboard, tags=["live_scores"])
async def live_scores():
    """Fetch live NBA scores from the NBA API."""
    try:
        scores = get_live_scores() # Call the service function
        return {"games": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
