export interface TeamStatSummary {
  team_id: number;
  team_name: string;
  team_abbreviation?: string;
  value: number;
}

export interface TeamStatCategory {
  category_name: string;
  teams: TeamStatSummary[];
}

export interface TeamStatsResponse {
  season: string;
  categories: TeamStatCategory[];
}

