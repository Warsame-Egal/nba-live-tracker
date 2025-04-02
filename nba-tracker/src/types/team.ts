// Player
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

export interface TeamDetails {
  team_id: number;
  team_name: string;
  team_city: string;
  abbreviation?: string;
  year_founded?: number;
  arena?: string;
  arena_capacity?: number;
  owner?: string;
  general_manager?: string;
  head_coach?: string;
  conference?: string;
  division?: string;
  wins: number;
  losses: number;
  win_pct: number;
  home_record: string;
  road_record: string;
  last_10: string;
  current_streak: string;
}

// Coach
export interface Coach {
  coach_id: number;
  name: string;
  role: string;
  is_assistant: boolean;
}

// Roster
export interface TeamRoster {
  team_id: number;
  team_name: string;
  season: string;
  players: Player[];
  coaches: Coach;
}

// Clinch Status Enum
export type ClinchStatus = '-' | 'c' | 'x';

// Standing Record
export interface StandingRecord {
  season_id: string;
  team_id: number;
  team_city: string;
  team_name: string;
  conference: string;
  conference_record: string;
  playoff_rank: number;
  clinch_indicator?: ClinchStatus;
  division: string;
  division_record: string;
  oct?: string;
  nov?: string;
  dec?: string;
  jan?: string;
  feb?: string;
  mar?: string;
  apr?: string;
  may?: string;
  jun?: string;
  jul?: string;
  aug?: string;
  sep?: string;
}

// API Response
export interface StandingsResponse {
  standings: StandingRecord[];
}
