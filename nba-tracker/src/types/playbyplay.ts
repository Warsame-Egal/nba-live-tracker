export interface PlayByPlayResponse {
  gameId: string;
  plays: PlayByPlayEvent[];
}

export interface PlayByPlayEvent {
  action_number: number;
  clock: string;
  period: number;
  team_id?: number;
  team_tricode?: string;
  action_type: string;
  description: string;
  player_id?: number;
  player_name?: string;
  score_home?: string;
  score_away?: string;
}
