export interface Team {
    teamId: string;
    teamName: string;
  }
  
export interface Game {
    gameId: string;
    gameClock: string;
    homeTeam: Team;
    awayTeam: Team;
  }