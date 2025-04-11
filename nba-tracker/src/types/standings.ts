/**
 * Represents the standings of an NBA team.
 */
export interface StandingRecord {
  season_id: string;            // NBA season ID (e.g., "22024")
  team_id: number;              // Unique team ID
  team_city: string;            // City of the team
  team_name: string;            // Name of the team
  conference: string;           // "East" or "West"
  division: string;             // Division name

  // Performance
  wins: number;                 // Total wins
  losses: number;              // Total losses
  win_pct: number;             // Win percentage (e.g., 0.671)

  // Rankings
  playoff_rank: number;        // Rank in conference playoff standings

  // Records
  home_record: string;         // e.g., "25-10"
  road_record: string;         // e.g., "18-12"
  conference_record: string;   // e.g., "30-20"
  division_record: string;     // e.g., "12-4"
  l10_record: string;          // e.g., "8-2"

  // Streaks & Games Back
  current_streak: number;      // Number of games in current streak
  current_streak_str: string;  // e.g., "W4" or "L2"
  games_back: string;          // e.g., "0.0", "2.5"

  // Optional (retained from backend)
  pre_as?: string | null;      // Pre All-Star record (if used)
  post_as?: string | null;     // Post All-Star record (if used)
}

/**
 * Response type from the API for standings.
 */
export interface StandingsResponse {
  standings: StandingRecord[];
}
