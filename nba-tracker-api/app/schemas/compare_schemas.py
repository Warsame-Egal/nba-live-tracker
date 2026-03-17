from typing import Any, Dict, List, Optional


from pydantic import BaseModel


class StatDelta(BaseModel):
    value: float
    pct: float
    trend: str  # "hot", "cold", "steady"


class HotStreakData(BaseModel):
    last_5_averages: Dict[str, float]
    season_averages: Dict[str, float]
    deltas: Dict[str, StatDelta]
    overall_trend: str
    summary: str


class PlayerSearchResult(BaseModel):
    id: int
    full_name: str
    is_active: bool


class PlayerBio(BaseModel):
    id: int
    full_name: str
    team: str
    team_abbreviation: str
    position: str
    height: str
    weight: str
    jersey: str
    headshot_url: str


class SeasonAverages(BaseModel):
    gp: int
    min: float
    pts: float
    reb: float
    ast: float
    stl: float
    blk: float
    tov: float
    fg_pct: float
    fg3_pct: float
    ft_pct: float
    plus_minus: float


class RadarData(BaseModel):
    scoring: float
    efficiency: float
    playmaking: float
    rebounding: float
    defense: float
    three_point: float


class GameLogEntry(BaseModel):
    date: str
    opponent: str
    pts: int
    reb: int
    ast: int
    stl: int = 0
    blk: int = 0
    tov: int = 0
    fg_pct: float
    fg3_pct: float
    ft_pct: float = 0.0
    plus_minus: float = 0.0
    min: float
    result: str
    game_id: Optional[int] = None


class HeadToHeadGame(BaseModel):
    date: str
    player1_stats: GameLogEntry
    player2_stats: GameLogEntry


class HeadToHeadSummary(BaseModel):
    games_played: int
    player1_h2h_averages: Optional[SeasonAverages] = None
    player2_h2h_averages: Optional[SeasonAverages] = None
    games: List[HeadToHeadGame] = []


class CareerSeasonEntry(BaseModel):
    season: str
    team: str
    gp: int
    pts: float
    reb: float
    ast: float
    stl: float = 0.0
    blk: float = 0.0
    fg_pct: float = 0.0
    fg3_pct: float = 0.0


class CareerSummary(BaseModel):
    seasons_played: int
    career_averages: Dict[str, float]
    career_totals: Dict[str, int]
    peak_season: Optional[CareerSeasonEntry] = None
    best_seasons: List[CareerSeasonEntry] = []
    consistency_score: float = 0.0
    seasons: List[CareerSeasonEntry] = []


class EfficiencyMetrics(BaseModel):
    pts_per_minute: float = 0.0
    ast_to_tov: float = 0.0
    defensive_impact: float = 0.0
    scoring_efficiency: float = 0.0
    usage_estimate: float = 0.0


class ComparisonResponse(BaseModel):
    player1: PlayerBio
    player2: PlayerBio
    player1_averages: SeasonAverages
    player2_averages: SeasonAverages
    player1_radar: RadarData
    player2_radar: RadarData
    player1_games: List[GameLogEntry]
    player2_games: List[GameLogEntry]
    scouting_report: Optional[str] = None
    player1_hot_streak: Optional[HotStreakData] = None
    player2_hot_streak: Optional[HotStreakData] = None
    head_to_head: Optional[HeadToHeadSummary] = None
    player1_career: Optional[CareerSummary] = None
    player2_career: Optional[CareerSummary] = None
    player1_efficiency: Optional[EfficiencyMetrics] = None
    player2_efficiency: Optional[EfficiencyMetrics] = None
    fetch_summary: Optional[Dict[str, Any]] = None
