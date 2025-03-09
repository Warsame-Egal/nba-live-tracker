// a player
export interface Player {
  player_id: number;
  name: string;
  jersey_number: string;
  position: string;
  height: string;
  weight: number;
  birth_date: string;
  age: number;
  experience: string;
  school: string;
}

// team details
export interface TeamDetails {
  team_id: number;
  team_name: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  win_pct: number;
  home_record: string;
  road_record: string;
  last_10: string;
  current_streak: string;
}

// a coach
export interface Coach {
  coach_id: number;
  name: string;
  role: string;
  is_assistant: boolean;
}

// the team roster
export interface TeamRoster {
  team_id: number;
  team_name: string;
  season: string;
  players: Player[];
  coaches: Coach;
}