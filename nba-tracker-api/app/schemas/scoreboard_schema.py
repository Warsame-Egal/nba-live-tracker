from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re
from enum import Enum
from datetime import date


class PeriodType(str, Enum):
    """Indicates whether the period is a regular quarter or overtime."""
    REGULAR = "REGULAR"
    OVERTIME = "OVERTIME"


class Period(BaseModel):
    """Represents a single period (quarter or overtime) in a game."""
    period: int = Field(..., description="The period number (1-4 for quarters, 5+ for overtime).")
    periodType: PeriodType = Field(..., description="Type of period: REGULAR or OVERTIME.")
    score: int = Field(..., ge=0, description="Points scored by the team in this period.")


class Team(BaseModel):
    """Represents an NBA team participating in a game."""
    teamId: int = Field(..., description="Unique identifier for the team.")
    teamName: str = Field(..., description="Full name of the team.")
    teamCity: str = Field(..., description="City where the team is based.")
    teamTricode: str = Field(..., description="Three-letter abbreviation of the team.")
    wins: Optional[int] = Field(None, description="Total wins for the team in the season.")
    losses: Optional[int] = Field(None, description="Total losses for the team in the season.")
    timeoutsRemaining: Optional[int] = Field(None, description="Number of timeouts left for the team.")
    periods: Optional[List[Period]] = Field(None, description="List of scores for each period.")

    @property
    def scores_by_quarter(self):
        """Returns a dictionary mapping quarters and overtimes to scores."""
        scores = {}
        if self.periods:
            for p in self.periods:
                if p.periodType == PeriodType.REGULAR:
                    scores[f"Q{p.period}"] = p.score
                elif p.periodType == PeriodType.OVERTIME:
                    scores[f"OT{p.period - 4}"] = p.score
        return scores


class PlayerStats(BaseModel):
    """Represents an individual player's performance in a game."""
    personId: int = Field(..., description="Unique identifier for the player.")
    name: str = Field(..., description="Full name of the player.")
    jerseyNum: str = Field(..., description="Player's jersey number.")
    position: str = Field(..., description="Player's position on the court.")
    teamTricode: str = Field(..., description="Three-letter abbreviation of the player's team.")
    points: int = Field(..., ge=0, description="Total points scored by the player.")
    rebounds: int = Field(..., ge=0, description="Total rebounds secured by the player.")
    assists: int = Field(..., ge=0, description="Total assists made by the player.")


class GameLeaders(BaseModel):
    """Represents the top-performing players in a game."""
    homeLeaders: Optional[PlayerStats] = Field(None, description="Top-performing player from the home team.")
    awayLeaders: Optional[PlayerStats] = Field(None, description="Top-performing player from the away team.")


class PbOdds(BaseModel):
    """Represents pre-game betting odds."""
    team: Optional[str] = Field(None, description="Team associated with the odds.")
    odds: Optional[float] = Field(0.0, description="Betting odds value.")
    suspended: Optional[int] = Field(0, description="Indicates if betting is suspended (1 = Yes, 0 = No).")


class Game(BaseModel):
    """Represents an NBA game with details on status, teams, and score."""
    gameId: str = Field(..., description="Unique identifier for the game.")
    gameCode: str = Field(..., description="Game code formatted as YYYYMMDD/HOMETEAMAWAYTEAM.")
    gameStatus: int = Field(..., description="Current status of the game (1 = Not started, 2 = In progress, 3 = Final).")
    gameStatusText: str = Field(..., description="Text description of the game status (e.g., 'Final', '4th Qtr').")
    period: int = Field(..., description="Current period of the game (1-4 for quarters, 5+ for overtime).")
    gameClock: Optional[str] = Field(None, description="Time remaining in the current period (MM:SS format).")
    gameTimeUTC: str = Field(..., description="Scheduled start time in UTC format.")
    gameEt: str = Field(..., description="Scheduled start time in Eastern Time (ET).")
    regulationPeriods: int = Field(..., description="Number of regulation periods (usually 4).")
    ifNecessary: Optional[bool] = Field(False, description="Indicates if the game is conditional (e.g., playoff series).")
    isNeutral: Optional[bool] = Field(False, description="Indicates if the game is played on a neutral site.")
    homeTeam: Team = Field(..., description="Information about the home team.")
    awayTeam: Team = Field(..., description="Information about the away team.")
    gameLeaders: Optional[GameLeaders] = Field(None, description="Top-performing players from each team.")
    pbOdds: Optional[PbOdds] = Field(None, description="Pre-game betting odds.")

    @field_validator("gameStatusText", mode="before")
    @classmethod
    def clean_game_status_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("gameClock", mode="before")
    @classmethod
    def format_game_clock(cls, value: Optional[str]) -> Optional[str]:
        """Formats game clock from ISO 8601 duration format to MM:SS."""
        if value in (None, "null", ""):
            return None
        match = re.match(r"PT(\d+)M(\d+)", value)
        if match:
            minutes, seconds = match.groups()
            return f"{int(minutes)}:{seconds.zfill(2)}"
        return value


class Scoreboard(BaseModel):
    """Represents the scoreboard for a specific game date."""
    gameDate: str = Field(..., description="Date of the games in YYYY-MM-DD format.")
    games: List[Game] = Field(..., description="List of games played on the specified date.")


class ScoreboardResponse(BaseModel):
    """Response schema for retrieving live NBA scores."""
    scoreboard: Scoreboard = Field(..., description="Scoreboard data containing game details.")


class TeamSchedule(BaseModel):
    """Represents a team's schedule and standing information."""
    teamId: int = Field(..., description="Unique identifier for the team.")
    teamName: str = Field(..., description="Full name of the team.")
    teamCity: str = Field(..., description="City where the team is based.")
    teamTricode: str = Field(..., description="Three-letter abbreviation of the team.")
    teamSlug: Optional[str] = Field(None, description="URL-friendly identifier for the team.")
    wins: Optional[int] = Field(None, description="Total wins for the season.")
    losses: Optional[int] = Field(None, description="Total losses for the season.")
    score: Optional[int] = Field(None, description="Current game score (if in progress).")
    seed: Optional[int] = Field(None, description="Playoff seeding position (if applicable).")


class GameSchedule(BaseModel):
    """Represents a scheduled NBA game."""
    gameId: str = Field(..., description="Unique identifier for the game.")
    gameCode: str = Field(..., description="Game code formatted as YYYYMMDD/HOMETEAMAWAYTEAM.")
    gameStatus: int = Field(..., description="Current status of the game (1 = Upcoming, 2 = In progress, 3 = Final).")
    gameStatusText: str = Field(..., description="Text description of the game status.")
    gameDate: date = Field(..., description="Date of the game.")
    gameTimeUTC: str = Field(..., description="Scheduled start time in UTC format.")
    gameTimeEst: str = Field(..., description="Scheduled start time in Eastern Time (ET).")
    isNeutral: bool = Field(..., description="Indicates if the game is played at a neutral venue.")
    arenaName: Optional[str] = Field(None, description="Name of the arena where the game is played.")
    homeTeam: TeamSchedule = Field(..., description="Information about the home team.")
    awayTeam: TeamSchedule = Field(..., description="Information about the away team.")