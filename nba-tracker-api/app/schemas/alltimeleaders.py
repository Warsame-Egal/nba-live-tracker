from typing import List
from pydantic import BaseModel, Field


class AllTimeLeader(BaseModel):
    """A single all-time leader entry."""
    
    player_id: int = Field(..., description="NBA player ID")
    player_name: str = Field(..., description="Player's full name")
    value: float = Field(..., description="The stat value (e.g., total points)")
    rank: int = Field(..., description="All-time rank for this stat")


class AllTimeLeaderCategory(BaseModel):
    """A category of all-time leaders."""
    
    category_name: str = Field(..., description="Name of the stat category (e.g., 'Points')")
    leaders: List[AllTimeLeader] = Field(..., description="List of top all-time players for this category")


class AllTimeLeadersResponse(BaseModel):
    """Response containing all-time leaders for various categories."""
    
    categories: List[AllTimeLeaderCategory] = Field(..., description="List of leader categories and their players")

