from pydantic import BaseModel, Field
from typing import List, Optional

class TeamSummary(BaseModel):
    """Minimal team data relevant to the scoreboard app."""
    team_id: int = Field(..., description="Unique team identifier.")
    team_abbreviation: str = Field(..., description="Team abbreviation (e.g., LAL, BOS).")
    points: Optional[int] = Field(None, description="Total points scored by the team.")

class TopScorer(BaseModel):
    """Top performer details (points, rebounds, assists)."""
    player_id: int
    player_name: str
    team_id: int
    points: int
    rebounds: int
    assists: int

class GameSummary(BaseModel):
    """Basic game details for past and present games in the scoreboard."""
    game_id: str = Field(..., description="Unique NBA game identifier.")
    game_date: str = Field(..., description="Date of the game (YYYY-MM-DD).")
    matchup: str = Field(..., description="Matchup (e.g., 'LAL vs BOS').")
    game_status: str = Field(..., description="Game status (Final, Scheduled, Live).")
    arena: Optional[str] = Field(None, description="Arena name if available.")
    home_team: TeamSummary
    away_team: TeamSummary
    top_scorer: Optional[TopScorer]
    
class GamesResponse(BaseModel):
    """Response model for past and present games selected by date."""
    games: List[GameSummary] = Field(..., description="List of games on the selected date.")
