export interface ScoreboardResponse {
  scoreboard: ScoreboardData;
}

export interface ScoreboardData {
  gameDate: string;
  games: Game[];
}

export interface Game {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  period: number;
  gameClock: string;
  gameTimeUTC: string;
  gameEt: string;
  homeTeam: HomeTeam;
  awayTeam: AwayTeam;
  gameLeaders: GameLeaders;
}

export interface GameLeaders {
  homeLeaders: HomeLeaders | null;
  awayLeaders: AwayLeaders | null;
}

export interface HomeTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
  score: number;
}

export interface AwayTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
  score: number;
}

export interface HomeLeaders {
  personId: number;
  name: string;
  jerseyNum: string;
  position: string;
  teamTricode: string;
  points: number;
  rebounds: number;
  assists: number;
}

export interface AwayLeaders {
  personId: number;
  name: string;
  jerseyNum: string;
  position: string;
  teamTricode: string;
  points: number;
  rebounds: number;
  assists: number;
}

export interface BoxScoreResponse {
  game_id: string;
  status: string;
  home_team: TeamBoxScoreStats;
  away_team: TeamBoxScoreStats;
}

export interface TeamBoxScoreStats {
  team_id: number;
  team_name: string;
  score: number;
  field_goal_pct: number;
  three_point_pct: number;
  free_throw_pct: number;
  rebounds_total: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  players: PlayerBoxScoreStats[];
}

export interface PlayerBoxScoreStats {
  player_id: number;
  name: string;
  position: string;
  jerseyNum?: string;
  minutes?: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
}
