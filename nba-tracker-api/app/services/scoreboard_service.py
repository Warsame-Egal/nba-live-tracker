from nba_api.live.nba.endpoints import scoreboard, boxscore
from app.schemas.scoreboard_schema import (
    ScoreboardResponse, Scoreboard, Game, Team
)
from fastapi import HTTPException
from pydantic import ValidationError

def getScoreboard() -> ScoreboardResponse:
    """Fetch and validate live NBA scores."""
    try:
        raw_scoreboard = scoreboard.ScoreBoard().get_dict()
        
        raw_scoreboard_data = raw_scoreboard.get("scoreboard")

        if not raw_scoreboard_data:
            raise HTTPException(status_code=404, detail="No live scoreboard data available")

        validated_scoreboard = Scoreboard(**raw_scoreboard_data)
        return ScoreboardResponse(scoreboard=validated_scoreboard)

    except ValidationError as ve:
        print(f"Validation Error: {ve.json()}")
        raise HTTPException(status_code=422, detail="Invalid scoreboard data format")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching live scores: {e}")


def getGameDetails(game_id: str) -> Game:
    """Fetch and validate detailed NBA game information."""
    try:
        raw_game_details = boxscore.BoxScore(game_id=game_id).get_dict().get("game")

        if not raw_game_details:
            raise HTTPException(status_code=404, detail=f"No game details found for game ID {game_id}")

        return Game(**raw_game_details)

    except ValidationError as ve:
        print(f"Validation Error: {ve.json()}")
        raise HTTPException(status_code=422, detail=f"Invalid game details format for game ID {game_id}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game details for game ID {game_id}: {e}")


def getTeamStats(team_id: int) -> Team:
    """Fetch and validate team statistics from the latest available game."""
    try:
        # Fetch latest scoreboard to get a game that includes the team
        raw_scoreboard = scoreboard.ScoreBoard().get_dict()
        games = raw_scoreboard.get("scoreboard", {}).get("games", [])

        # Find the first game that contains the given team_id
        for game in games:
            if game["homeTeam"]["teamId"] == team_id:
                raw_team_data = game["homeTeam"]
                break
            elif game["awayTeam"]["teamId"] == team_id:
                raw_team_data = game["awayTeam"]
                break
        else:
            raise HTTPException(status_code=404, detail=f"No team stats found for team ID {team_id}")

        # Return the extracted team data using Pydantic validation
        return Team(**raw_team_data)

    except ValidationError as ve:
        print(f"Validation Error: {ve.json()}")
        raise HTTPException(status_code=422, detail=f"Invalid team details format for team ID {team_id}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team stats for team ID {team_id}: {e}")