from pydantic import BaseModel, Field
from typing import Optional, List

class TeamDetails(BaseModel):
    team_id: int = Field(..., description="Unique ID for the team")
    team_name: str = Field(..., description="Team's full name")
    conference: str = Field(..., description="Conference the team belongs to (East/West)")
    division: str = Field(..., description="Division within the conference")
    wins: int = Field(..., description="Total wins in the current season")
    losses: int = Field(..., description="Total losses in the current season")
    win_pct: float = Field(..., description="Winning percentage")
    home_record: str = Field(..., description="Home record (Wins-Losses)")
    road_record: str = Field(..., description="Road record (Wins-Losses)")
    last_10: str = Field(..., description="Record in last 10 games")
    current_streak: str = Field(..., description="Current win/loss streak")

class GameSummary(BaseModel):
    game_id: str
    game_date: str
    home_team: str
    away_team: str

class TeamSummary(BaseModel):
    team_id: int
    abbreviation: str
    city: str
    full_name: str
    nickname: str
    state: Optional[str] = None
    year_founded: Optional[int] = None

class TeamDetailsResponse(BaseModel):
    team_id: int
    team_name: str
    team_city: str
    abbreviation: Optional[str] = None  # Team abbreviation (e.g., "LAL")
    year_founded: Optional[int] = None  # Year the team was founded
    arena: Optional[str] = None  # Name of the arena
    arena_capacity: Optional[int] = None  # Capacity of the arena
    owner: Optional[str] = None  # Team owner
    general_manager: Optional[str] = None  # Team general manager
    head_coach: Optional[str] = None  # Team head coach
    conference: Optional[str] = None  # Conference (e.g., "East", "West")
    division: Optional[str] = None  # Division (e.g., "Pacific", "Atlantic")
    team_history: Optional[List[dict]] = None # List of dictionaries containing team history
    team_awards_championships: Optional[List[dict]] = None # List of championships won
    team_awards_conf: Optional[List[dict]] = None # List of conference titles
    team_awards_div: Optional[List[dict]] = None # List of division titles

class TeamRosterResponse(BaseModel):
    player_id: int
    player_name: str
    position: Optional[str] = None
    jersey: Optional[str] = None
    num: Optional[str] = None # Jersey number
    height: Optional[str] = None # Player height
    weight: Optional[str] = None # Player weight
    birth_date: Optional[str] = None # Player birth date
    age: Optional[int] = None # Player age
    experience: Optional[str] = None # Player experience
    college: Optional[str] = None # Player college