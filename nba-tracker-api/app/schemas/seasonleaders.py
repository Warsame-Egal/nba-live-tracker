from typing import List, Optional
from pydantic import BaseModel, Field


class SeasonLeader(BaseModel):
    """A player entry in season leaders."""

    player_id: int = Field(..., description="NBA player ID")
    player_name: str = Field(..., description="Full player name")
    team_abbreviation: Optional[str] = Field(None, description="Team abbreviation")
    position: Optional[str] = Field(None, description="Player position")
    value: float = Field(..., description="The stat value for this leader category")


class SeasonLeadersCategory(BaseModel):
    """Season leaders for a specific stat category."""

    category: str = Field(..., description="Stat category name (e.g., 'Points Per Game')")
    leaders: List[SeasonLeader] = Field(..., description="Top 5 players in this category")


class SeasonLeadersResponse(BaseModel):
    """Season leaders response with multiple stat categories."""

    season: str = Field(..., description="Season (e.g., '2024-25')")
    categories: List[SeasonLeadersCategory] = Field(..., description="Leaders for each stat category")
