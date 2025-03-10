from pydantic import BaseModel, Field
from typing import List, Optional


class ScheduledGame(BaseModel):
    """Represents a single scheduled or completed game in a season."""
    season_id: int = Field(..., description="NBA season year, e.g., 2023.")
    team_id: int = Field(..., description="Unique identifier for the team.")
    team_abbreviation: str = Field(...,
                                   description="Three-letter abbreviation of the team.")
    game_id: str = Field(..., description="Unique identifier for the game.")
    game_date: str = Field(...,
                           description="Scheduled date of the game (YYYY-MM-DD).")
    matchup: Optional[str] = Field(
        None, description="Matchup format (e.g., 'DAL @ BOS').")
    win_loss: Optional[str] = Field(None, description="Win (W) or Loss (L).")
    points_scored: Optional[int] = Field(
        None, description="Total points scored by the team in this game.")
    field_goal_pct: Optional[float] = Field(
        None, description="Team's field goal percentage.")
    three_point_pct: Optional[float] = Field(
        None, description="Team's three-point percentage.")


class ScheduleResponse(BaseModel):
    """Response schema for retrieving the NBA season schedule."""
    games: List[ScheduledGame] = Field(...,
                                       description="List of games for the requested season.")
