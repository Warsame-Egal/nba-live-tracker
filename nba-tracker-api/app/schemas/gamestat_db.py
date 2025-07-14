from pydantic import BaseModel

class GameStatDB(BaseModel):
    id: int
    player_id: int
    game_id: int
    points: int
    rebounds: int
    assists: int

    class Config:
        from_attributes = True