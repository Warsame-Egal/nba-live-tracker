export interface ShotDetail {
  game_id?: string;
  game_event_id?: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  period: number;
  minutes_remaining: number;
  seconds_remaining: number;
  event_type?: string;
  action_type?: string;
  shot_type?: string;
  shot_zone_basic?: string;
  shot_zone_area?: string;
  shot_zone_range?: string;
  shot_distance?: number;
  loc_x?: number; // X coordinate on court
  loc_y?: number; // Y coordinate on court
  shot_attempted_flag: number;
  shot_made_flag: number;
  game_date?: string;
  htm?: string; // Home team abbreviation
  vtm?: string; // Visitor team abbreviation
}

export interface LeagueAverage {
  grid_type?: string;
  shot_zone_basic?: string;
  shot_zone_area?: string;
  shot_zone_range?: string;
  fga?: number;
  fgm?: number;
  fg_pct?: number;
}

export interface ShotChartResponse {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  season: string;
  season_type: string;
  shots: ShotDetail[];
  league_averages: LeagueAverage[];
}

