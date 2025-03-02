from pydantic import BaseModel
from typing import List

class PeriodScore(BaseModel):
    period: int
    periodType: str
    score: int

class Team(BaseModel):
    id: int
    name: str
    city: str
    tricode: str
    score: int
    wins: int
    losses: int
    timeoutsRemaining: int
    periodScores: List[PeriodScore]

class PlayerStats(BaseModel):
    name: str
    points: int
    rebounds: int
    assists: int

class Game(BaseModel):
    gameId: str
    status: str
    period: int
    gameClock: str
    gameTimeUTC: str
    homeTeam: Team
    awayTeam: Team
    topScorers: dict[str, PlayerStats]
