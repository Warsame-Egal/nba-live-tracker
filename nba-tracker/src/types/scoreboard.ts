export interface ScoreboardResponse {
  scoreboard: ScoreboardData;
}

// Main scoreboard structure
export interface ScoreboardData {
  gameDate: string;
  games: Game[];
}

// each game
export interface Game {
  gameId: string;
  gameCode: string;
  gameStatus: number;
  gameStatusText: string;
  period: number;
  gameClock: string;
  gameTimeUTC: string;
  gameEt: string;
  regulationPeriods: number;
  ifNecessary: boolean;
  seriesGameNumber: string;
  gameLabel: string;
  gameSubLabel: string;
  seriesText: string;
  seriesConference: string;
  poRoundDesc: string;
  gameSubtype: string;
  isNeutral: boolean;
  homeTeam: HomeTeam;
  awayTeam: AwayTeam;
  gameLeaders: GameLeaders;
  pbOdds: PbOdds;
}

// game leaders (top performers)
export interface GameLeaders {
  homeLeaders: HomeLeaders;
  awayLeaders: AwayLeaders;
}

// home team details
export interface HomeTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
  score: number;
  seed?: number;
  inBonus?: string;
  timeoutsRemaining: number;
  periods: Period[];
}

// away team details
export interface AwayTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
  score: number;
  seed?: number;
  inBonus?: string;
  timeoutsRemaining: number;
  periods: Period[];
}

export interface Period {
  period: number;
  periodType: string;
  score: number;
}

// game leaders
export interface GameLeaders {
  homeLeaders: HomeLeaders;
  awayLeaders: AwayLeaders;
}

// home team leaders
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

// away team leaders
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

// for betting odds
export interface PbOdds {
  team?: string;
  odds: number;
  suspended: number;
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
  minutes?: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
}
