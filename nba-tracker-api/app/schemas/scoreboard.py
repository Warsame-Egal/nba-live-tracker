import re
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# Represents a single play-by-play event in the game.


class PlayByPlayEvent(BaseModel):
    """Schema for a single play-by-play event in the game."""

    action_number: int = Field(..., description="Unique identifier for the action.")
    clock: str = Field(..., description="Time remaining in the period (ISO 8601 format).")
    period: int = Field(..., description="Current period of the game.")
    team_id: Optional[int] = Field(
        None, description="Team ID associated with the play."
    )
    team_tricode: Optional[str] = Field(
        None, description="Three-letter team abbreviation."
    )
    action_type: str = Field(
        ..., description="Type of action (e.g., 'shot', 'turnover')."
    )
    description: str = Field(...,
                             description="Detailed description of the play.")
    player_id: Optional[int] = Field(
        None, description="Player ID involved in the action."
    )
    player_name: Optional[str] = Field(
        None, description="Full name of the player involved in the action."
    )
    score_home: Optional[str] = Field(
        None, description="Current home team score after action."
    )
    score_away: Optional[str] = Field(
        None, description="Current away team score after action."
    )



# Represents the full play-by-play breakdown of the game.


class PlayByPlayResponse(BaseModel):
    """Schema for retrieving real-time play-by-play breakdown of a game."""

    game_id: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Unique identifier for the game (10-digit ID).",
    )
    plays: List[PlayByPlayEvent] = Field(..., description="List of play-by-play events.")


class Team(BaseModel):
    """Represents an NBA team participating in a game."""

    teamId: int = Field(..., description="Unique identifier for the team.")
    teamName: str = Field(..., description="Full name of the team.")
    teamCity: str = Field(..., description="City where the team is based.")
    teamTricode: str = Field(..., description="Three-letter abbreviation of the team.")
    wins: Optional[int] = Field(None, description="Total wins for the team in the season.")
    losses: Optional[int] = Field(None, description="Total losses for the team in the season.")
    score: Optional[int] = Field(None, description="Total team score.")
    timeoutsRemaining: Optional[int] = Field(None, description="Number of timeouts left for the team.")


class PlayerStats(BaseModel):
    """Represents an individual player's performance in a game."""

    personId: int = Field(..., description="Unique identifier for the player.")
    name: str = Field(..., description="Full name of the player.")
    jerseyNum: str = Field(..., description="Player's jersey number.")
    position: str = Field(..., description="Player's position on the court.")
    teamTricode: str = Field(
        ..., description="Three-letter abbreviation of the player's team."
    )
    points: int = Field(...,
                        ge=0,
                        description="Total points scored by the player.")
    rebounds: int = Field(
        ..., ge=0, description="Total rebounds secured by the player."
    )
    assists: int = Field(...,
                         ge=0,
                         description="Total assists made by the player.")



class GameLeaders(BaseModel):
    """Represents the top-performing players in a game."""

    homeLeaders: Optional[PlayerStats] = Field(None, description="Top-performing player from the home team.")
    awayLeaders: Optional[PlayerStats] = Field(None, description="Top-performing player from the away team.")


class PbOdds(BaseModel):
    """Represents pre-game betting odds."""

    team: Optional[str] = Field(None, description="Team associated with the odds.")
    odds: Optional[float] = Field(0.0, description="Betting odds value.")
    suspended: Optional[int] = Field(
        0, description="Indicates if betting is suspended (1 = Yes, 0 = No)."
    )



# Represents individual player statistics in a game.


class PlayerBoxScoreStats(BaseModel):
    """Detailed statistics for a player in a game."""

    player_id: int = Field(..., description="Unique identifier for the player.")
    name: str = Field(..., description="Full name of the player.")
    position: str = Field(
        "N/A", description="Position played. Defaults to 'N/A'"
        " if not available.")
    minutes: Optional[str] = Field(None, description="Total minutes played.")
    points: int = Field(..., ge=0, description="Total points scored.")
    rebounds: int = Field(..., ge=0, description="Total rebounds.")
    assists: int = Field(..., ge=0, description="Total assists.")
    steals: int = Field(..., ge=0, description="Total steals.")
    blocks: int = Field(..., ge=0, description="Total blocks.")
    turnovers: int = Field(..., ge=0, description="Total turnovers.")


# Represents the top-performing players in points, assists, and rebounds for both teams.
class GameLeadersResponse(BaseModel):
    """Response schema for retrieving top-performing players in a game."""

    game_id: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Unique identifier for the game (10-digit ID).",
    )
    points_leader: PlayerBoxScoreStats = Field(..., description="Player with the most points in the game.")
    assists_leader: PlayerBoxScoreStats = Field(..., description="Player with the most assists in the game.")
    rebounds_leader: PlayerBoxScoreStats = Field(..., description="Player with the most rebounds in the game.")


# Represents team-specific statistics for a single game.


class TeamGameStatsResponse(BaseModel):
    """Response schema for retrieving a team's statistics in a game."""

    game_id: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Unique identifier for the game (10-digit ID).",
    )
    team_id: int = Field(..., description="Unique identifier for the team.")
    team_name: str = Field(..., description="Name of the team.")
    score: int = Field(..., description="Total points scored by the team.")
    field_goal_pct: float = Field(..., description="Field goal percentage.")
    three_point_pct: float = Field(..., description="Three-point percentage.")
    free_throw_pct: float = Field(..., description="Free throw percentage.")
    rebounds_total: int = Field(..., description="Total rebounds.")
    assists: int = Field(..., description="Total assists.")
    steals: int = Field(..., description="Total steals.")
    blocks: int = Field(..., description="Total blocks.")
    turnovers: int = Field(..., description="Total turnovers.")
    players: List[PlayerBoxScoreStats] = Field(...,
                                               description="List of player"
                                               " stats.")



# Represents team-level box score statistics, including player stats.


class TeamBoxScoreStats(BaseModel):
    """Team-level box score stats."""

    team_id: int = Field(..., description="Unique identifier for the team.")
    team_name: str = Field(..., description="Team name.")
    score: int = Field(..., description="Total points scored by the team.")
    field_goal_pct: float = Field(
        ..., description="Field goal percentage."
    )  # convert from decimal to % in the frontend
    three_point_pct: float = Field(
        ..., description="Three-point percentage."
    )  # convert from decimal to % in the frontend
    free_throw_pct: float = Field(
        ..., description="Free throw percentage."
    )  # convert from decimal to % in the frontend
    rebounds_total: int = Field(..., description="Total rebounds.")
    assists: int = Field(..., description="Total assists.")
    steals: int = Field(..., description="Total steals.")
    blocks: int = Field(..., description="Total blocks.")
    turnovers: int = Field(..., description="Total turnovers.")
    players: List[PlayerBoxScoreStats] = Field(...,
                                               description="List of"
                                               " player stats.")



# Represents the full box score of a game, including team stats.


class BoxScoreResponse(BaseModel):
    """Response schema for retrieving the box score of a game."""

    game_id: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="Unique identifier for the game (10-digit ID).",
    )
    status: str = Field(
        ...,
        description="Game status, which can include 'Final', 'Scheduled', or 'Q3 2:50'.",
    )
    home_team: TeamBoxScoreStats = Field(..., description="Home team statistics.")
    away_team: TeamBoxScoreStats = Field(..., description="Away team statistics.")


class LiveGame(BaseModel):
    """Represents an NBA game with details on status, teams, and score."""

    gameId: str = Field(..., description="Unique identifier for the game.")
    gameStatus: int = Field(
        ...,
        description="Current status of the game: 1 = Scheduled, 2 = In Progress, 3 = Final)",
    )
    gameStatusText: str = Field(..., description="Text description of the game status ('Final', '4th Qtr').")
    period: int = Field(
        ...,
        description="Current period of the game (1-4 for quarters, 5+ for overtime).",
    )
    gameClock: Optional[str] = Field(
        None,
        description="Time remaining in ISO 8601 changed to the current period (MM:SS format).",
    )
    gameTimeUTC: str = Field(..., description="Scheduled start time in UTC format.")
    homeTeam: Team = Field(..., description="Information about the home team.")
    awayTeam: Team = Field(..., description="Information about the away team.")
    gameLeaders: Optional[GameLeaders] = Field(
        None, description="Top-performing players from each team."
    )
    pbOdds: Optional[PbOdds] = Field(
        None, description="Pre-game betting odds.")
    boxScore: Optional[BoxScoreResponse] = Field(
        None, description="Detailed box score if available."
    )

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
