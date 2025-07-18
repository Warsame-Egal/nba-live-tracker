from typing import List, Optional
from pydantic import BaseModel


class PlayerResult(BaseModel):
    id: int
    name: str
    team_id: Optional[int] = None
    team_abbreviation: Optional[str] = None


class TeamResult(BaseModel):
    id: int
    name: str
    abbreviation: str


class SearchResults(BaseModel):
    players: List[PlayerResult]
    teams: List[TeamResult]
