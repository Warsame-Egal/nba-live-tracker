from pydantic import BaseModel, Field
from typing import List, Optional


class Player(BaseModel):
    """Schema for a player in the team roster."""
    player_id: int
    name: str
    jersey_number: Optional[str] = None
    position: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[int] = None
    birth_date: Optional[str] = None
    age: Optional[int] = None
    experience: Optional[str] = None
    school: Optional[str] = None


class TeamRoster(BaseModel):
    """Schema combining team roster and coaching staff."""
    team_id: int
    team_name: str
    season: str
    players: List[Player]


class PlayerSummary(BaseModel):
    """Schema for a player's basic profile from PlayerIndex API."""
    player_id: int = Field(..., description="Unique ID for the player.")
    full_name: str = Field(..., description="Full name of the player.")
    team_id: Optional[int] = Field(None, description="Current team ID.")
    team_name: Optional[str] = Field(None, description="Current team name.")
    team_abbreviation: Optional[str] = Field(
        None, description="Team abbreviation (LAL, BOS).")
    jersey_number: Optional[str] = Field(
        None, description="Player's jersey number.")
    position: Optional[str] = Field(
        None, description="Player's position (G, F, C).")
    height: Optional[str] = Field(
        None, description="Player's height in feet-inches format (6-8).")
    weight: Optional[int] = Field(
        None, description="Player's weight in pounds.")
    college: Optional[str] = Field(
        None, description="College or international team attended.")
    country: Optional[str] = Field(None, description="Country of origin.")
    draft_year: Optional[int] = Field(
        None, description="Year the player was drafted.")
    draft_round: Optional[int] = Field(
        None, description="Draft round the player was selected in.")
    draft_number: Optional[int] = Field(
        None, description="Overall pick number in the draft.")
    from_year: Optional[int] = Field(
        None, description="First year the player played in the NBA.")
    to_year: Optional[int] = Field(
        None, description="Most recent year the player played in the NBA.")
    points_per_game: Optional[float] = Field(
        None, description="Average points per game.")
    rebounds_per_game: Optional[float] = Field(
        None, description="Average rebounds per game.")
    assists_per_game: Optional[float] = Field(
        None, description="Average assists per game.")
