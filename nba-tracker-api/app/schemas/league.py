from typing import List, Optional

from pydantic import BaseModel, Field


class LeagueLeader(BaseModel):
    """Represents a league leader in a specific stat category."""
    player_id: int = Field(..., description="NBA player ID")
    name: str = Field(..., description="Player full name")
    team: str = Field(..., description="Team abbreviation")
    stat_value: float = Field(..., description="Stat value (e.g., points per game)")
    rank: int = Field(..., description="Rank in the category (1-5)")
    games_played: int = Field(..., description="Number of games played")


class LeagueLeadersResponse(BaseModel):
    """Response schema for league leaders endpoint."""
    category: str = Field(..., description="Stat category (PTS, REB, AST, STL, BLK)")
    season: str = Field(..., description="Season in format YYYY-YY")
    leaders: List[LeagueLeader] = Field(default_factory=list, description="Top 5 players in the category")

