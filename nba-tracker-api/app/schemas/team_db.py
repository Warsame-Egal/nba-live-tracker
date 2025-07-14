from pydantic import BaseModel

class TeamDB(BaseModel):
    id: int
    name: str
    abbreviation: str

    class Config:
        from_attributes = True