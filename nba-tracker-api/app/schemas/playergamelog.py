from typing import List, Optional
from pydantic import BaseModel, Field


class PlayerGameLogEntry(BaseModel):
    """A single game log entry for a player."""

    game_id: str = Field(..., description="NBA game ID")
    game_date: str = Field(..., description="Game date in YYYY-MM-DD format")
    matchup: str = Field(..., description="Matchup string (e.g., 'LAL vs. GSW')")
    win_loss: Optional[str] = Field(None, description="Win or Loss")
    minutes: Optional[str] = Field(None, description="Minutes played")
    points: int = Field(0, description="Points scored")
    rebounds: int = Field(0, description="Total rebounds")
    assists: int = Field(0, description="Assists")
    steals: int = Field(0, description="Steals")
    blocks: int = Field(0, description="Blocks")
    turnovers: int = Field(0, description="Turnovers")
    field_goals_made: Optional[int] = Field(None, description="Field goals made")
    field_goals_attempted: Optional[int] = Field(None, description="Field goals attempted")
    field_goal_pct: Optional[float] = Field(None, description="Field goal percentage")
    three_pointers_made: Optional[int] = Field(None, description="3-pointers made")
    three_pointers_attempted: Optional[int] = Field(None, description="3-pointers attempted")
    three_point_pct: Optional[float] = Field(None, description="3-point percentage")
    free_throws_made: Optional[int] = Field(None, description="Free throws made")
    free_throws_attempted: Optional[int] = Field(None, description="Free throws attempted")
    free_throw_pct: Optional[float] = Field(None, description="Free throw percentage")
    plus_minus: Optional[int] = Field(None, description="Plus/minus")


class PlayerGameLogResponse(BaseModel):
    """Player game log response with all games."""

    player_id: int = Field(..., description="NBA player ID")
    season: str = Field(..., description="Season (e.g., '2024-25')")
    games: List[PlayerGameLogEntry] = Field(..., description="List of game log entries")
