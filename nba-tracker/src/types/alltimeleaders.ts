export interface AllTimeLeader {
  player_id: number;
  player_name: string;
  value: number;
  rank: number;
}

export interface AllTimeLeaderCategory {
  category_name: string;
  leaders: AllTimeLeader[];
}

export interface AllTimeLeadersResponse {
  categories: AllTimeLeaderCategory[];
}

