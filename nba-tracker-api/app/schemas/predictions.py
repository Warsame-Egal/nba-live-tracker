from typing import List, Optional
from pydantic import BaseModel, Field


class GamePredictionInsight(BaseModel):
    """Insight about why the prediction was made."""
    
    title: str = Field(..., description="Title of the insight (e.g., 'Home Court Advantage')")
    description: str = Field(..., description="Description of the insight")
    impact: str = Field(..., description="Impact on prediction (e.g., 'Favors Home Team')")


class GamePrediction(BaseModel):
    """Prediction for a single game."""
    
    game_id: str = Field(..., description="NBA game ID")
    home_team_id: int = Field(..., description="Home team ID")
    home_team_name: str = Field(..., description="Home team name")
    away_team_id: int = Field(..., description="Away team ID")
    away_team_name: str = Field(..., description="Away team name")
    game_date: str = Field(..., description="Game date in YYYY-MM-DD format")
    
    # Predictions
    home_win_probability: float = Field(..., description="Home team win probability (0-1)", ge=0, le=1)
    away_win_probability: float = Field(..., description="Away team win probability (0-1)", ge=0, le=1)
    predicted_home_score: float = Field(..., description="Predicted home team score")
    predicted_away_score: float = Field(..., description="Predicted away team score")
    confidence: float = Field(..., description="Prediction confidence (0-1)", ge=0, le=1)
    
    # Insights
    insights: List[GamePredictionInsight] = Field(default_factory=list, description="Key insights about the prediction")
    
    # Team stats used for prediction
    home_team_win_pct: float = Field(..., description="Home team win percentage")
    away_team_win_pct: float = Field(..., description="Away team win percentage")
    home_team_net_rating: Optional[float] = Field(None, description="Home team net rating")
    away_team_net_rating: Optional[float] = Field(None, description="Away team net rating")


class PredictionsResponse(BaseModel):
    """Response for game predictions."""
    
    date: str = Field(..., description="Date for predictions (YYYY-MM-DD)")
    predictions: List[GamePrediction] = Field(..., description="List of game predictions")
    season: str = Field(..., description="Season (e.g., '2024-25')")

