import { PlayerSummary } from './player';

export interface TeamResult {
  id: number;
  name: string;
  abbreviation: string;
}

export interface SearchResults {
  players: PlayerSummary[];
  teams: TeamResult[];
}