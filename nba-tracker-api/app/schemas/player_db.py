from pydantic import BaseModel

class PlayerDB(BaseModel):
    id: int
    name: str
    team_id: int | None = None
    position: str | None = None

    class Config:
        from_attributes = True