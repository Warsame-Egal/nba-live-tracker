from pydantic import BaseModel
from typing import List, Optional, Any


class Period(BaseModel):
    period: int
    periodType: str
    score: int


class HomeTeam(BaseModel):
    teamId: int
    teamName: str
    teamCity: str
    teamTricode: str
    wins: int
    losses: int
    score: int
    seed: Optional[int] = None  # Seed is optional; used only in playoffs
    inBonus: Optional[str] = None # "1" for bonus, "0"/None otherwise
    timeoutsRemaining: int
    periods: List[Period]


class AwayTeam(BaseModel):
    teamId: int
    teamName: str
    teamCity: str
    teamTricode: str
    wins: int
    losses: int
    score: int
    seed: Optional[int] = None # Seed is optional; used only in playoffs
    inBonus: Optional[str] = None # inBonus is available
    timeoutsRemaining: int
    periods: List[Period]


class HomeLeaders(BaseModel):
    personId: int
    name: str
    jerseyNum: str
    position: str
    teamTricode: str
    points: int
    rebounds: int
    assists: int


class AwayLeaders(BaseModel):
    personId: int
    name: str
    jerseyNum: str
    position: str
    teamTricode: str
    points: int
    rebounds: int
    assists: int


class GameLeaders(BaseModel):
    homeLeaders: HomeLeaders
    awayLeaders: AwayLeaders


class PbOdds(BaseModel):
    team: Optional[Any] = None
    odds: float
    suspended: int


class Game(BaseModel):
    gameId: str
    gameCode: str
    gameStatus: int
    gameStatusText: str
    period: int
    gameClock: str
    gameTimeUTC: str
    gameEt: str
    regulationPeriods: int
    ifNecessary: bool
    seriesGameNumber: str
    gameLabel: str
    gameSubLabel: str
    seriesText: str
    seriesConference: str
    poRoundDesc: str
    gameSubtype: str
    isNeutral: bool
    homeTeam: HomeTeam
    awayTeam: AwayTeam
    gameLeaders: GameLeaders
    pbOdds: PbOdds # API returns null, might need another service to implement


class Scoreboard(BaseModel):
    gameDate: str
    leagueId: str
    leagueName: str
    games: List[Game]


class ScoreboardResponse(BaseModel):
    scoreboard: Scoreboard
