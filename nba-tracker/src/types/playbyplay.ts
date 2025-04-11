export interface PlayByPlayResponse {
  gameId: string;
  plays: PlayByPlayEvent[];
}

export interface PlayByPlayEvent {
  actionNumber: number;
  clock: string;
  period: number;
  teamId?: number;
  teamTricode?: string;
  actionType: string; // Example: 'shot', 'turnover', 'foul'
  description: string; // Example: 'LeBron James made a 3pt shot'
  playerId?: number;
  playerName?: string;
  scoreHome?: string; // Example: "102"
  scoreAway?: string; // Example: "99"
}
