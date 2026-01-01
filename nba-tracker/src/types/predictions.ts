export interface GamePredictionInsight {
  title: string;
  description: string;
  impact: string;
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
}

export interface PredictionsResponse {
  date: string;
  predictions: GamePrediction[];
  season: string;
}

