from typing import List, Optional

from pydantic import BaseModel, Field


class PlayerGameStats(BaseModel):
    player_id: int = Field(..., description="Unique NBA player ID.")
    player_name: str = Field(..., description="Full name of the player.")
    team_id: int = Field(..., description="Team ID of the player.")
    team_abbreviation: str = Field(
        ..., description="Team abbreviation (LAL, BOS, etc.)."
    )
    points: Optional[int] = Field(0, description="Points scored in the game.")
    rebounds: Optional[int] = Field(0, description="Total rebounds.")
    assists: Optional[int] = Field(0, description="Total assists.")
    minutes: Optional[str] = Field(None, description="Minutes played in the game.")
    steals: Optional[int] = Field(0, description="Total steals.")
    blocks: Optional[int] = Field(0, description="Total blocks.")
    turnovers: Optional[int] = Field(0, description="Total turnovers.")


class GameSummary(BaseModel):
    game_date_est: str = Field(..., description="Game date in EST format.")
    game_id: str = Field(..., description="Unique ID for the NBA game.")
    game_status_text: str = Field(
        ..., description="Status of the game (e.g., Final, In Progress)."
    )
    home_team_id: int = Field(..., description="Team ID for the home team.")
    visitor_team_id: int = Field(..., description="Team ID for the visiting team.")
    season: str = Field(..., description="NBA season (e.g., 2023-24).")


class PlayerGameEntry(BaseModel):
    player_id: int = Field(..., description="Unique NBA player ID.")
    first_name: str = Field(..., description="Player's first name.")
    last_name: str = Field(..., description="Player's last name.")
    team_abbreviation: str = Field(
        ..., description="Team abbreviation (LAL, BOS, etc.)."
    )
    team_id: int = Field(..., description="Team ID of the player.")
    jersey_num: Optional[str] = Field(None, description="Player's jersey number.")
    position: Optional[str] = Field(None, description="Player's position (G, F, C).")


class GameDetailsResponse(BaseModel):
    game_summary: GameSummary
    players: List[PlayerGameEntry]
