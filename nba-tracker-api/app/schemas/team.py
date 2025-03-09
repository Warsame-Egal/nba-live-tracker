from pydantic import BaseModel, Field

class TeamDetails(BaseModel):
    team_id: int = Field(..., description="Unique ID for the team")
    team_name: str = Field(..., description="Team's full name")
    conference: str = Field(..., description="Conference the team belongs to (East/West)")
    division: str = Field(..., description="Division within the conference")
    wins: int = Field(..., description="Total wins in the current season")
    losses: int = Field(..., description="Total losses in the current season")
    win_pct: float = Field(..., description="Winning percentage")
    home_record: str = Field(..., description="Home record (Wins-Losses)")
    road_record: str = Field(..., description="Road record (Wins-Losses)")
    last_10: str = Field(..., description="Record in last 10 games")
    current_streak: str = Field(..., description="Current win/loss streak")