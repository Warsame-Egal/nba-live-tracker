export interface TeamSummary {
  team_id: number;
  team_abbreviation: string;
  points?: number;
}

export interface TopScorer {
  player_id: number;
  player_name: string;
  team_id: number;
  points: number;
  rebounds: number;
  assists: number;
}

export interface GameLeader {
  personId: number;
  name: string;
  jerseyNum?: string;
  position?: string;
  teamTricode?: string;
  points: number; // Season average PPG
  rebounds: number; // Season average RPG
  assists: number; // Season average APG
}

export interface GameLeaders {
  homeLeaders: GameLeader | null;
  awayLeaders: GameLeader | null;
}

export interface GameSummary {
  game_id: string;
  game_date: string;
  game_time_utc?: string;
  matchup: string;
  game_status: string;
  arena?: string;
  home_team: TeamSummary;
  away_team: TeamSummary;
  top_scorer?: TopScorer;
  gameLeaders?: GameLeaders;
}

export interface GamesResponse {
  games: GameSummary[];
}
