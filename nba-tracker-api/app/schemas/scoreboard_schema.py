from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re
from enum import Enum

### Schema ###
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


class LiveGame(BaseModel):
    """Represents an NBA game with details on status, teams, and score."""
    gameId: str = Field(..., description="Unique identifier for the game.")
    gameCode: str = Field(..., description="Game code formatted as YYYYMMDD/HOMETEAMAWAYTEAM.")
    gameStatus: int = Field(..., description="Current status of the game")
    gameStatusText: str = Field(..., description="Text description of the game status ('Final', '4th Qtr').")
    period: int = Field(..., description="Current period of the game (1-4 for quarters, 5+ for overtime).")
    gameClock: Optional[str] = Field(None, description="Time remaining in the current period (MM:SS format).")
    gameTimeUTC: str = Field(..., description="Scheduled start time in UTC format.")
    gameEt: str = Field(..., description="Scheduled start time in Eastern Time (ET).")
    regulationPeriods: int = Field(..., description="Number of regulation periods (usually 4).")
    homeTeam: Team = Field(..., description="Information about the home team.")
    awayTeam: Team = Field(..., description="Information about the away team.")
    ifNecessary: Optional[bool] = Field(False, description="Indicates if the game is conditional (playoff series).")
    isNeutral: Optional[bool] = Field(False, description="Indicates if the game is played on a neutral site.")
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
    games: List[LiveGame] = Field(..., description="List of games played on the specified date.")


class ScoreboardResponse(BaseModel):
    """Response schema for retrieving live NBA scores."""
    scoreboard: Scoreboard = Field(..., description="Scoreboard data containing game details.")


###Scheduled Game Schema (for Season Schedule) ###
class ScheduledGame(BaseModel):
    """Represents a single scheduled or completed game in a season."""
    season_id: int
    team_id: int
    team_abbreviation: str
    team_name: str
    game_id: str
    game_date: str
    matchup: str
    win_loss: Optional[str]
    minutes: int
    points: int
    field_goals_made: int
    field_goals_attempted: int
    field_goal_pct: float
    three_point_made: int
    three_point_attempted: int
    three_point_pct: float
    free_throws_made: int
    free_throws_attempted: int
    free_throw_pct: float
    offensive_rebounds: int
    defensive_rebounds: int
    total_rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    personal_fouls: int
    plus_minus: float 


class ScheduleResponse(BaseModel):
    """Response schema for retrieving season schedule."""
    games: List[ScheduledGame]

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


class Player(BaseModel):
    """Schema for a player in the team roster."""
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

class Coach(BaseModel):
    """Schema for a coach in the team staff."""
    coach_id: int
    name: str
    role: str
    is_assistant: bool

class TeamRoster(BaseModel):
    """Schema combining team roster and coaching staff."""
    team_id: int
    team_name: str
    season: str
    players: List[Player]
    coaches: List[Coach]

class PlayerSummary(BaseModel):
    """Schema for a player's basic profile from PlayerIndex API."""
    player_id: int = Field(..., description="Unique ID for the player.")
    full_name: str = Field(..., description="Full name of the player.")
    team_id: Optional[int] = Field(None, description="Current team ID.")
    team_name: Optional[str] = Field(None, description="Current team name.")
    team_abbreviation: Optional[str] = Field(None, description="Team abbreviation (LAL, BOS).")
    jersey_number: Optional[str] = Field(None, description="Player's jersey number.")
    position: Optional[str] = Field(None, description="Player's position (G, F, C).")
    height: Optional[str] = Field(None, description="Player's height in feet-inches format (6-8).")
    weight: Optional[int] = Field(None, description="Player's weight in pounds.")
    college: Optional[str] = Field(None, description="College or international team attended.")
    country: Optional[str] = Field(None, description="Country of origin.")
    draft_year: Optional[int] = Field(None, description="Year the player was drafted.")
    draft_round: Optional[int] = Field(None, description="Draft round the player was selected in.")
    draft_number: Optional[int] = Field(None, description="Overall pick number in the draft.")
    from_year: Optional[int] = Field(None, description="First year the player played in the NBA.")
    to_year: Optional[int] = Field(None, description="Most recent year the player played in the NBA.")
    points_per_game: Optional[float] = Field(None, description="Average points per game.")
    rebounds_per_game: Optional[float] = Field(None, description="Average rebounds per game.")
    assists_per_game: Optional[float] = Field(None, description="Average assists per game.")