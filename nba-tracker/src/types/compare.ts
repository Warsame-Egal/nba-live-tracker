export interface PlayerSearchResult {
  id: number;
  full_name: string;
  is_active: boolean;
}

export interface PlayerBio {
  id: number;
  full_name: string;
  team: string;
  team_abbreviation: string;
  position: string;
  height: string;
  weight: string;
  jersey: string;
  headshot_url: string;
}

export interface SeasonAverages {
  gp: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  plus_minus: number;
}

export interface RadarData {
  scoring: number;
  efficiency: number;
  playmaking: number;
  rebounding: number;
  defense: number;
  three_point: number;
}

export interface GameLogEntry {
  date: string;
  opponent: string;
  pts: number;
  reb: number;
  ast: number;
  stl?: number;
  blk?: number;
  tov?: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct?: number;
  plus_minus?: number;
  min: number;
  result: string;
  game_id?: number | null;
}

export interface StatDelta {
  value: number;
  pct: number;
  trend: string;
}

export interface HotStreakData {
  last_5_averages: Record<string, number>;
  season_averages: Record<string, number>;
  deltas: Record<string, StatDelta>;
  overall_trend: string;
  summary: string;
}

export interface ComparisonResponse {
  player1: PlayerBio;
  player2: PlayerBio;
  player1_averages: SeasonAverages;
  player2_averages: SeasonAverages;
  player1_radar: RadarData;
  player2_radar: RadarData;
  player1_games: GameLogEntry[];
  player2_games: GameLogEntry[];
  scouting_report: string | null;
  player1_hot_streak?: HotStreakData | null;
  player2_hot_streak?: HotStreakData | null;
  head_to_head?: HeadToHeadSummary | null;
  player1_career?: CareerSummary | null;
  player2_career?: CareerSummary | null;
  player1_efficiency?: EfficiencyMetrics | null;
  player2_efficiency?: EfficiencyMetrics | null;
  fetch_summary?: Record<string, { status: string; latency_ms?: number; error?: string }> | null;
}

export interface HeadToHeadGame {
  date: string;
  player1_stats: GameLogEntry;
  player2_stats: GameLogEntry;
}

export interface HeadToHeadSummary {
  games_played: number;
  player1_h2h_averages: SeasonAverages | null;
  player2_h2h_averages: SeasonAverages | null;
  games: HeadToHeadGame[];
}

export interface CareerSeasonEntry {
  season: string;
  team: string;
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  stl?: number;
  blk?: number;
  fg_pct?: number;
  fg3_pct?: number;
}

export interface CareerSummary {
  seasons_played: number;
  career_averages: Record<string, number>;
  career_totals: Record<string, number>;
  peak_season: CareerSeasonEntry | null;
  best_seasons: CareerSeasonEntry[];
  consistency_score: number;
  seasons: CareerSeasonEntry[];
}

export interface EfficiencyMetrics {
  pts_per_minute: number;
  ast_to_tov: number;
  defensive_impact: number;
  scoring_efficiency: number;
  usage_estimate: number;
}
