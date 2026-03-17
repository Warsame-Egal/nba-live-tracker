from typing import List, Optional
from pydantic import BaseModel, Field


class TeamStatSummary(BaseModel):
    team_id: int = Field(..., description="NBA team ID")
    team_name: str = Field(..., description="Team name")
    team_abbreviation: Optional[str] = Field(None, description="Team abbreviation")
    value: float = Field(..., description="The value of the stat")


class TeamStatCategory(BaseModel):
    category_name: str = Field(..., description="Name of the stat category (e.g., 'Points Per Game')")
    teams: List[TeamStatSummary] = Field(..., description="List of teams sorted by this stat")


class TeamStatsResponse(BaseModel):
    season: str = Field(..., description="The season for which stats are fetched (e.g., '2024-25')")
    categories: List[TeamStatCategory] = Field(..., description="List of stat categories and their teams")
