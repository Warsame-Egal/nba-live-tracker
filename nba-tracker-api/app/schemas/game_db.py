from datetime import datetime
from pydantic import BaseModel

class GameDB(BaseModel):
    id: int
    date: datetime
    home_team_id: int
    away_team_id: int

    class Config:
        from_attributes = True