export interface GamePredictionInsight {
  title: string;
  description: string;
  impact: string;
}

export interface KeyDriver {
  factor: string;
  impact: string;
  magnitude: 'High' | 'Moderate' | 'Low';
}

export interface RiskFactor {
  factor: string;
  explanation: string;
}

export interface GamePrediction {
  game_id: string;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  game_date: string;
  home_win_probability: number;
  away_win_probability: number;
  predicted_home_score: number;
  predicted_away_score: number;
  confidence: number;
  insights: GamePredictionInsight[];
  home_team_win_pct: number;
  away_team_win_pct: number;
  home_team_net_rating?: number;
  away_team_net_rating?: number;
  // Enhanced AI analysis (optional)
  confidence_tier?: 'high' | 'medium' | 'low';
  confidence_explanation?: string;
  key_drivers?: KeyDriver[];
  risk_factors?: RiskFactor[];
  matchup_narrative?: string;
}

export interface PredictionsResponse {
  date: string;
  predictions: GamePrediction[];
  season: string;
}

