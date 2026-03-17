from typing import List, Optional
from pydantic import BaseModel, Field


class TeamPlayerStat(BaseModel):
    """Player statistics for a team."""

    player_id: int = Field(..., description="Player ID")
    player_name: str = Field(..., description="Player full name")
    position: Optional[str] = Field(None, description="Player position")
    jersey_number: Optional[str] = Field(None, description="Jersey number")

    # Games
    games_played: int = Field(0, description="Games played")
    games_started: int = Field(0, description="Games started")

    # Per game averages
    minutes: float = Field(0.0, description="Minutes per game")
    points: float = Field(0.0, description="Points per game")
    offensive_rebounds: float = Field(0.0, description="Offensive rebounds per game")
    defensive_rebounds: float = Field(0.0, description="Defensive rebounds per game")
    rebounds: float = Field(0.0, description="Total rebounds per game")
    assists: float = Field(0.0, description="Assists per game")
    steals: float = Field(0.0, description="Steals per game")
    blocks: float = Field(0.0, description="Blocks per game")
    turnovers: float = Field(0.0, description="Turnovers per game")
    personal_fouls: float = Field(0.0, description="Personal fouls per game")
    assist_to_turnover: Optional[float] = Field(None, description="Assist to turnover ratio")


class TeamPlayerStatsResponse(BaseModel):
    """Response for team player statistics."""

    team_id: int = Field(..., description="Team ID")
    season: str = Field(..., description="Season (e.g., '2024-25')")
    players: List[TeamPlayerStat] = Field(..., description="List of player statistics")
