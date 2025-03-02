from nba_api.live.nba.endpoints import scoreboard
from app.schemas.scoreboard import ScoreboardResponse, Scoreboard

def getScoreboard() -> ScoreboardResponse:
    """Fetch and format live NBA game scores."""
    try:
        # Fetch raw data from the NBA API
        raw_scoreboard = scoreboard.ScoreBoard().get_dict()["scoreboard"]

        # Validate and structure the raw data using Pydantic schema
        validated_scoreboard = Scoreboard(**raw_scoreboard)
        
        # Return a structured response following the ScoreboardResponse schema
        return ScoreboardResponse(scoreboard=validated_scoreboard)
    
    except Exception as e:
        # Raise an exception with a descriptive error message
        raise Exception(f"Error fetching live scores: {e}")
