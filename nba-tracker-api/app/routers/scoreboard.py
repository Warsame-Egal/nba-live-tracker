from fastapi import APIRouter, HTTPException
from app.services.scoreboard_service import getScoreboard, getTeamStats, getGameDetails
from app.schemas.scoreboard_schema import ScoreboardResponse, Team, Game

# Create a router instance for live scores
router = APIRouter()

@router.get("/scoreboard", response_model=ScoreboardResponse, tags=["scoreboard"],
             summary="Get Live NBA Scores", description="Fetch and return live NBA scores from the NBA API.")
async def scoreboard():
    """
    API route to fetch and return live NBA scores.
    Calls the service function that fetches data from the NBA API.
    """
    try:
        # Call the service function and return the response
        return getScoreboard()
    except HTTPException as e:
        raise e
    except Exception as e:
        # Handle any other errors and return an HTTP 500 error response
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scoreboard/game/{game_id}", response_model=Game, tags=["scoreboard"], 
            summary="Get Game Details", description="Fetch and return detailed information about a specific game.")
async def game_details(game_id: str):
    """
    API route to fetch and return detailed information about a specific game.
    Calls the service function that fetches data from the NBA API.
    """
    try:
        return getGameDetails(game_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
       
@router.get("/scoreboard/team/{team_id}", response_model=Team, tags=["scoreboard"],
             summary="Get Team Stats", description="Fetch and return statistics for a specific team from the NBA API.")
async def team_stats(team_id: int):
    """
    API route to fetch and return statistics for a specific team.
    Calls the service function that fetches data from the NBA API.
    """
    try:
        # Call the service function and return the response
        return getTeamStats(team_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        # Handle any other errors and return an HTTP 500 error response
        raise HTTPException(status_code=500, detail=str(e))