from pydantic import BaseModel
from typing import Optional


class ScoreboardGameDB(BaseModel):
    id: int
    gameDate: str
    gameId: str
    gameStatus: int
    gameStatusText: str
    period: int
    gameClock: Optional[str] = None
    gameTimeUTC: str
    homeTeam_teamId: int
    homeTeam_teamName: str
    homeTeam_teamCity: str
    homeTeam_teamTricode: str
    homeTeam_wins: Optional[int] = None
    homeTeam_losses: Optional[int] = None
    homeTeam_score: Optional[int] = None
    homeTeam_timeoutsRemaining: Optional[int] = None
    awayTeam_teamId: int
    awayTeam_teamName: str
    awayTeam_teamCity: str
    awayTeam_teamTricode: str
    awayTeam_wins: Optional[int] = None
    awayTeam_losses: Optional[int] = None
    awayTeam_score: Optional[int] = None
    awayTeam_timeoutsRemaining: Optional[int] = None
    homeLeader_personId: Optional[int] = None
    homeLeader_name: Optional[str] = None
    homeLeader_jerseyNum: Optional[str] = None
    homeLeader_position: Optional[str] = None
    homeLeader_teamTricode: Optional[str] = None
    homeLeader_points: Optional[int] = None
    homeLeader_rebounds: Optional[int] = None
    homeLeader_assists: Optional[int] = None
    awayLeader_personId: Optional[int] = None
    awayLeader_name: Optional[str] = None
    awayLeader_jerseyNum: Optional[str] = None
    awayLeader_position: Optional[str] = None
    awayLeader_teamTricode: Optional[str] = None
    awayLeader_points: Optional[int] = None
    awayLeader_rebounds: Optional[int] = None
    awayLeader_assists: Optional[int] = None
    pbOdds_team: Optional[str] = None
    pbOdds_odds: Optional[float] = None
    pbOdds_suspended: Optional[int] = None

    class Config:
        from_attributes = True