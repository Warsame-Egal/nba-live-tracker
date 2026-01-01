export interface TeamGameLogEntry {
  game_id: string;
  game_date: string;
  matchup: string;
  win_loss?: string;
  points: number;
  rebounds: number;
  assists: number;
  field_goals_made?: number;
  field_goals_attempted?: number;
  field_goal_pct?: number;
  three_pointers_made?: number;
  three_pointers_attempted?: number;
  three_point_pct?: number;
  free_throws_made?: number;
  free_throws_attempted?: number;
  free_throw_pct?: number;
  turnovers: number;
  steals: number;
  blocks: number;
}

export interface TeamGameLogResponse {
  team_id: number;
  season: string;
  games: TeamGameLogEntry[];
}

