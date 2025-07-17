from typing import List, Optional

from pydantic import BaseModel

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
    team_history: Optional[List[dict]] = None  # List of dictionaries containing team history
    team_awards_championships: Optional[List[dict]] = None  # List of championships won
    team_awards_conf: Optional[List[dict]] = None  # List of conference titles
    team_awards_div: Optional[List[dict]] = None  # List of division titles
