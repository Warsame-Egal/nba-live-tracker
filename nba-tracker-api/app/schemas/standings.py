from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class ClinchStatus(str, Enum):
    """Enum representing the playoff clinch indicator."""
    DASH = "-"   # No clinch indicator
    CLINCHED = "c"  # Clinched Playoff Spot
    ELIMINATED = "x"  # Eliminated from Playoffs

class StandingRecord(BaseModel):
    """Represents the standings of an NBA team for a given season."""
    season_id: str = Field(..., description="NBA season ID (e.g., '22024').", example="22024")
    team_id: int = Field(..., description="Unique identifier for the team.", example=1610612739)
    team_city: str = Field(..., description="City of the team.", example="Cleveland")
    team_name: str = Field(..., description="Official team name.", example="Cavaliers")
    conference: str = Field(..., description="Team's conference (East/West).", example="East")
    conference_record: str = Field(..., description="Record within the conference (W-L).", example="38-7")
    playoff_rank: int = Field(..., description="Team's rank in the playoff standings.", example=1)
    clinch_indicator: Optional[ClinchStatus] = Field(None, description="Playoff clinch status.", example="c")
    division: str = Field(..., description="Division within the conference.", example="Central")
    division_record: str = Field(..., description="Record within the division (W-L).", example="11-1")

    # Monthly Records (Optional)
    oct: Optional[str] = Field(None, description="October record.", example="5-0")
    nov: Optional[str] = Field(None, description="November record.", example="12-3")
    dec: Optional[str] = Field(None, description="December record.", example="12-1")
    jan: Optional[str] = Field(None, description="January record.")
    feb: Optional[str] = Field(None, description="February record.")
    mar: Optional[str] = Field(None, description="March record.")
    apr: Optional[str] = Field(None, description="April record.")
    may: Optional[str] = Field(None, description="May record.")
    jun: Optional[str] = Field(None, description="June record.")
    jul: Optional[str] = Field(None, description="July record.")
    aug: Optional[str] = Field(None, description="August record.")
    sep: Optional[str] = Field(None, description="September record.")
    
class StandingsResponse(BaseModel):
    """Response schema for retrieving NBA standings for a season."""
    standings: List[StandingRecord] = Field(..., description="List of team standings for the requested season.")
