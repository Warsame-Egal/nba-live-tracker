/** Types for GET /api/v1/game/{gameId}/detail */

export interface QuarterScores {
  home: number[];
  away: number[];
}

export interface TeamScore {
  name: string;
  abbreviation?: string | null;
  score: number;
  record?: string | null;
}

export interface ScoreSection {
  home_team: TeamScore;
  away_team: TeamScore;
  period?: number | null;
  clock?: string | null;
  quarter_scores?: QuarterScores | null;
}

export interface PlayerImpact {
  player_name: string;
  player_id: number;
  team: string;
  team_side?: string;
  game_score: number;
  plus_minus?: number | null;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  impact_label: string;
  highlight: string;
}

export interface PlayByPlayEventDict {
  action_number?: number;
  clock?: string;
  period?: number;
  team_id?: number;
  team_tricode?: string;
  action_type?: string;
  description?: string;
  player_id?: number;
  player_name?: string;
  score_home?: string | null;
  score_away?: string | null;
}

export interface GameDetailResponse {
  game_id: string;
  status: string;
  score: ScoreSection;
  box_score: Record<string, unknown> | null;
  player_impacts: PlayerImpact[];
  key_moments: KeyMomentDict[];
  win_probability: WinProbabilityDict | null;
  game_summary: string | null;
  play_by_play?: PlayByPlayEventDict[] | null;
  momentum_data?: Record<string, unknown> | null;
  game_preview?: Record<string, unknown> | null;
}

export interface KeyMomentDict {
  type?: string;
  play?: Record<string, unknown>;
  timestamp?: string;
  context?: string | null;
}

export interface WinProbabilityHistoryEntry {
  home_win_prob?: number;
  away_win_prob?: number;
  game_time?: number;
  event_num?: number;
}

export interface WinProbabilityDict {
  home_win_prob?: number;
  away_win_prob?: number;
  timestamp?: string;
  probability_history?: WinProbabilityHistoryEntry[];
}
