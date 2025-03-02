from fastapi import APIRouter, HTTPException
from app.services.nba_service import getScoreboard
from app.schemas.scoreboard import ScoreboardResponse

# Create a router instance for live scores
router = APIRouter()

@router.get("/scoreboard", response_model=ScoreboardResponse, tags=["scoreboard"])
async def scoreboard():
    """
    API route to fetch and return live NBA scores.
    Calls the service function that fetches data from the NBA API.
    """
    try:
        # Call the service function and return the response
        return getScoreboard()
    except Exception as e:
        # Handle any errors and return an HTTP 500 error response
        raise HTTPException(status_code=500, detail=str(e))
