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
