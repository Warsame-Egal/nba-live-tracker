from typing import List
from pydantic import BaseModel, Field


class Leader(BaseModel):
    player_id: int = Field(..., description="Unique player identifier")
    rank: int = Field(..., description="Rank for the statistic")
    name: str = Field(..., description="Player name")
    team_id: int = Field(..., description="Team ID")
    team_abbreviation: str = Field(..., description="Team abbreviation")
    games_played: int = Field(..., description="Games played for the season")
    stat_value: float = Field(..., description="Per-game value for the chosen stat category")

class LeagueLeadersResponse(BaseModel):
    leaders: List[Leader] = Field(..., description="Top players for the statistic")