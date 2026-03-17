"""Schemas for the aggregated game detail API."""

from typing import List, Optional

from pydantic import BaseModel, Field


class QuarterScores(BaseModel):
    """Quarter-by-quarter scores for home and away."""

    home: List[int] = Field(..., description="Home team score per quarter.")
    away: List[int] = Field(..., description="Away team score per quarter.")


class TeamScore(BaseModel):
    """Team summary for score section."""

    name: str = Field(..., description="Team name.")
    abbreviation: Optional[str] = Field(None, description="Team abbreviation/tricode.")
    score: int = Field(..., description="Total score.")
    record: Optional[str] = Field(None, description="Wins-losses record (e.g. 42-30).")


class ScoreSection(BaseModel):
    """Score display block: teams, period, clock, quarter scores."""

    home_team: TeamScore = Field(..., description="Home team.")
    away_team: TeamScore = Field(..., description="Away team.")
    period: Optional[int] = Field(None, description="Current period (1-4 or 5+ for OT).")
    clock: Optional[str] = Field(None, description="Time remaining in period (e.g. MM:SS).")
    quarter_scores: Optional[QuarterScores] = Field(None, description="Scores by quarter.")
    pace_label: Optional[str] = Field(None, description="Game pace: Shootout, Fast Break, Average, or Grind.")


class PlayerImpact(BaseModel):
    """Top player impact for game detail."""

    player_name: str = Field(..., description="Player name.")
    player_id: int = Field(..., description="Player ID.")
    team: str = Field(..., description="Team name or tricode.")
    team_side: str = Field(..., description="'home' or 'away'.")
    game_score: float = Field(..., description="Game score (Hollinger or simplified).")
    plus_minus: Optional[int] = Field(None, description="Plus/minus if available.")
    pts: int = Field(..., description="Points.")
    reb: int = Field(..., description="Rebounds.")
    ast: int = Field(..., description="Assists.")
    stl: int = Field(..., description="Steals.")
    blk: int = Field(..., description="Blocks.")
    impact_label: str = Field(..., description="Dominant | Strong | Solid.")
    highlight: str = Field(..., description="One-line highlight.")


class GameDetailResponse(BaseModel):
    """Aggregated game detail response."""

    game_id: str = Field(..., description="Game ID.")
    status: str = Field(..., description="upcoming | live | completed.")
    score: ScoreSection = Field(..., description="Score section.")
    box_score: Optional[dict] = Field(None, description="Enhanced box score.")
    player_impacts: List[PlayerImpact] = Field(default_factory=list, description="Top impacts per team.")
    key_moments: List[dict] = Field(default_factory=list, description="Key moments with context.")
    win_probability: Optional[dict] = Field(None, description="Win probability data.")
    game_summary: Optional[str] = Field(None, description="AI post-game recap.")
    momentum_data: Optional[dict] = Field(None, description="Optional momentum data.")
    game_preview: Optional[dict] = Field(None, description="Optional preview.")
