export interface PlayerResult {
  id: number;
  name: string;
  team_id?: number;
  team_abbreviation?: string;
}

export interface TeamResult {
  id: number;
  name: string;
  abbreviation: string;
}

export interface SearchResults {
  players: PlayerResult[];
  teams: TeamResult[];
}
