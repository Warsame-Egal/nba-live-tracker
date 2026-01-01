from typing import List, Optional

from pydantic import BaseModel, Field


class TeamSummary(BaseModel):
    """Minimal team data relevant to the scoreboard app."""

    team_id: int = Field(..., description="Unique team identifier.")
    team_abbreviation: str = Field(..., description="Team abbreviation (e.g., LAL, BOS).")
    points: Optional[int] = Field(None, description="Total points scored by the team.")


class TopScorer(BaseModel):
    """Top performer details (points, rebounds, assists)."""

    player_id: int
    player_name: str
    team_id: int
    points: int
    rebounds: int
    assists: int


class GameLeader(BaseModel):
    """Game leader with season averages."""

    personId: int = Field(..., description="Player ID")
    name: str = Field(..., description="Player name")
    jerseyNum: Optional[str] = Field(None, description="Jersey number")
    position: Optional[str] = Field(None, description="Player position")
    teamTricode: Optional[str] = Field(None, description="Team abbreviation")
    points: float = Field(..., description="Season average points per game")
    rebounds: float = Field(..., description="Season average rebounds per game")
    assists: float = Field(..., description="Season average assists per game")


class GameLeaders(BaseModel):
    """Game leaders for both teams with season averages."""

    homeLeaders: Optional[GameLeader] = None
    awayLeaders: Optional[GameLeader] = None


class GameSummary(BaseModel):
    """Basic game details for past and present games in the scoreboard."""

    game_id: str = Field(..., description="Unique NBA game identifier.")
    game_date: str = Field(..., description="Date of the game (YYYY-MM-DD).")
    game_time_utc: Optional[str] = Field(None, description="Game start time in UTC (ISO format).")
    matchup: str = Field(..., description="Matchup (e.g., 'LAL vs BOS').")
    game_status: str = Field(..., description="Game status (Final, Scheduled, Live).")
    arena: Optional[str] = Field(None, description="Arena name if available.")
    home_team: TeamSummary
    away_team: TeamSummary
    top_scorer: Optional[TopScorer] = None
    gameLeaders: Optional[GameLeaders] = None
    win_probability: Optional[float] = Field(None, description="NBA's official win probability (0-1) for home team")


class GamesResponse(BaseModel):
    """Response model for past and present games selected by date."""

    games: List[GameSummary] = Field(..., description="List of games on the selected date.")
