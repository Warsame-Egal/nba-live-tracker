from fastapi import APIRouter, HTTPException
from app.services.nba_service import get_live_scores

router = APIRouter()

@router.get("/live_scores", tags=["live_scores"])
async def live_scores():
    """Fetch live NBA scores from the NBA API."""
    try:
        scores = get_live_scores()
        return {"games": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
