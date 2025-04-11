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

export interface GameSummary {
  game_id: string;
  game_date: string;
  matchup: string;
  game_status: string;
  arena?: string;
  home_team: TeamSummary;
  away_team: TeamSummary;
  top_scorer?: TopScorer;
}

export interface GamesResponse {
  games: GameSummary[];
}

export interface WeeklyCalendarProps {
  selectedDate: string; // "YYYY-MM-DD"
  setSelectedDate: (date: string) => void;
}
