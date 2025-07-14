from typing import Optional

from pydantic import BaseModel


class PlayerBase(BaseModel):
    """Shared properties for a player."""

    name: str
    team: str
    position: Optional[str] = None
    jersey_number: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    age: Optional[int] = None


class PlayerCreate(PlayerBase):
    """Schema for creating a new player."""

    pass


class Player(PlayerBase):
    """Schema representing a player retrieved from the database."""

    id: int

    class Config:
        from_attributes = True