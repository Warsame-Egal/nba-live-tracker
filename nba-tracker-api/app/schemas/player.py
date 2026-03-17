from typing import List, Optional

from .coach import Coach

from pydantic import BaseModel


class Player(BaseModel):
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
    team_id: int
    team_name: str
    season: str
    players: List[Player]
    coaches: List[Coach] = []


class PlayerGamePerformance(BaseModel):
    game_id: str
    date: str
    opponent_team_abbreviation: str
    points: int
    rebounds: int
    assists: int
    steals: int
    blocks: int


class PlayerSummary(BaseModel):
    PERSON_ID: int
    PLAYER_LAST_NAME: str
    PLAYER_FIRST_NAME: str
    PLAYER_SLUG: Optional[str] = None
    TEAM_ID: Optional[int] = None
    TEAM_SLUG: Optional[str] = None
    IS_DEFUNCT: Optional[int] = None
    TEAM_CITY: Optional[str] = None
    TEAM_NAME: Optional[str] = None
    TEAM_ABBREVIATION: Optional[str] = None
    JERSEY_NUMBER: Optional[str] = None
    POSITION: Optional[str] = None
    HEIGHT: Optional[str] = None
    WEIGHT: Optional[int] = None
    COLLEGE: Optional[str] = None
    COUNTRY: Optional[str] = None
    ROSTER_STATUS: Optional[str] = None
    PTS: Optional[float] = None
    REB: Optional[float] = None
    AST: Optional[float] = None
    STL: Optional[float] = None
    BLK: Optional[float] = None
    STATS_TIMEFRAME: Optional[str] = None
    FROM_YEAR: Optional[int] = None
    TO_YEAR: Optional[int] = None
    recent_games: List[PlayerGamePerformance] = []
