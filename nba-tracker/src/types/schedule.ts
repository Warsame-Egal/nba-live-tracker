export interface ScheduledGame {
    season_id: number;
    team_id: number;
    team_abbreviation: string;
    game_id: string;
    game_date: string;
    matchup?: string;
    win_loss?: string;
    points_scored?: number;
    field_goal_pct?: number;
    three_point_pct?: number;
  }
  
  export interface ScheduleResponse {
    games: ScheduledGame[];
  }
  