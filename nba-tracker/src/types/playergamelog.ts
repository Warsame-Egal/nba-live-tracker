export interface PlayerGameLogEntry {
  game_id: string;
  game_date: string;
  matchup: string;
  win_loss?: string;
  minutes?: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  field_goals_made?: number;
  field_goals_attempted?: number;
  field_goal_pct?: number;
  three_pointers_made?: number;
  three_pointers_attempted?: number;
  three_point_pct?: number;
  free_throws_made?: number;
  free_throws_attempted?: number;
  free_throw_pct?: number;
  plus_minus?: number;
}

export interface PlayerGameLogResponse {
  player_id: number;
  season: string;
  games: PlayerGameLogEntry[];
}


