export interface SeasonLeader {
  player_id: number;
  player_name: string;
  team_abbreviation?: string;
  position?: string;
  value: number;
}

export interface SeasonLeadersCategory {
  category: string;
  leaders: SeasonLeader[];
}

export interface SeasonLeadersResponse {
  season: string;
  categories: SeasonLeadersCategory[];
}



