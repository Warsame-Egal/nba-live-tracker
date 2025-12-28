export interface StandingRecord {
  season_id: string;
  team_id: number;
  team_city: string;
  team_name: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  win_pct: number;
  playoff_rank: number;
  home_record: string;
  road_record: string;
  division_record: string;
  conference_record: string;
  l10_record: string;
  current_streak: number;
  current_streak_str: string;
  games_back: string;
}

export interface StandingsResponse {
  standings: StandingRecord[];
}
