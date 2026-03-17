from pydantic import BaseModel, Field
from typing import List, Optional


class StandingRecord(BaseModel):
    """Represents the standings of an NBA team for a given season."""

    season_id: str = Field(..., description="NBA season ID (e.g., '22024').")
    team_id: int = Field(..., description="Unique identifier for the team.")
    team_city: str = Field(..., description="City of the team (e.g., 'Boston').")
    team_name: str = Field(..., description="Official name of the team (e.g., 'Celtics').")
    conference: str = Field(..., description="Team's conference ('East' or 'West').")
    division: str = Field(..., description="Division within the conference (e.g., 'Atlantic').")

    # Performance
    wins: int = Field(..., description="Total number of wins in the season.")
    losses: int = Field(..., description="Total number of losses in the season.")
    win_pct: float = Field(..., description="Win percentage (e.g., 0.671).")

    # Rankings
    playoff_rank: int = Field(..., description="Team's rank in the playoff standings.")

    # Records
    home_record: str = Field(..., description="Home record in W-L format (e.g., '24-10').")
    road_record: str = Field(..., description="Road record in W-L format (e.g., '21-13').")
    conference_record: str = Field(..., description="Record against teams in the same conference.")
    division_record: str = Field(..., description="Record against teams in the same division.")
    l10_record: str = Field(..., description="Record in the last 10 games (e.g., '8-2').")

    # Streak & GB
    current_streak: int = Field(..., description="Number of games in the current win/loss streak.")
    current_streak_str: str = Field(..., description="Current streak string (e.g., 'W4', 'L2').")
    games_back: str = Field(..., description="Games behind the first place team (e.g., '1.5', '0.0').")

    # Offense/Defense stats (optional - may not be available for all seasons)
    ppg: Optional[float] = Field(None, description="Points per game.")
    opp_ppg: Optional[float] = Field(None, description="Opponent points per game.")
    diff: Optional[float] = Field(None, description="Point differential (PPG - OPP PPG).")


class StandingsResponse(BaseModel):
    """Response schema for NBA standings by season."""

    standings: List[StandingRecord] = Field(..., description="List of team standings for the given season.")
