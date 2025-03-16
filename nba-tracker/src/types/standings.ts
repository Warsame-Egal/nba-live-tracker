export enum ClinchStatus {
    DASH = "-",
    CLINCHED = "c",
    ELIMINATED = "x",
  }
  
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
  
  export interface StandingsResponse {
    standings: StandingRecord[];
  }
  