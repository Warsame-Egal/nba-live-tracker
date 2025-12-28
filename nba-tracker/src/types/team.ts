export interface Player {
  player_id: number;
  name: string;
  jersey_number?: string;
  position?: string;
  height?: string;
  weight?: number;
  birth_date?: string;
  age?: number;
  experience?: string;
  school?: string;
}

export interface TeamRoster {
  team_id: number;
  team_name: string;
  season: string;
  players: Player[];
  coaches?: Coach[];
}

export interface Coach {
  coach_id: number;
  name: string;
  role: string;
  is_assistant: boolean;
}
