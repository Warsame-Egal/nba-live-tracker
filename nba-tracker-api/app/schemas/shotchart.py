from typing import List, Optional
from pydantic import BaseModel


class ShotDetail(BaseModel):
    """Individual shot data with X/Y coordinates"""
    grid_type: Optional[str] = None  # Grid type (from API)
    game_id: Optional[str] = None
    game_event_id: Optional[int] = None
    player_id: int
    player_name: str
    team_id: int
    team_name: str
    period: int
    minutes_remaining: int
    seconds_remaining: int
    event_type: Optional[str] = None
    action_type: Optional[str] = None
    shot_type: Optional[str] = None
    shot_zone_basic: Optional[str] = None
    shot_zone_area: Optional[str] = None
    shot_zone_range: Optional[str] = None
    shot_distance: Optional[float] = None
    loc_x: Optional[int] = None  # X coordinate on court
    loc_y: Optional[int] = None  # Y coordinate on court
    shot_attempted_flag: int
    shot_made_flag: int
    game_date: Optional[str] = None
    htm: Optional[str] = None  # Home team abbreviation
    vtm: Optional[str] = None  # Visitor team abbreviation


class LeagueAverage(BaseModel):
    """League average shooting by zone"""
    grid_type: Optional[str] = None
    shot_zone_basic: Optional[str] = None
    shot_zone_area: Optional[str] = None
    shot_zone_range: Optional[str] = None
    fga: Optional[int] = None
    fgm: Optional[int] = None
    fg_pct: Optional[float] = None


class ShotChartResponse(BaseModel):
    """Response containing shot chart data"""
    player_id: int
    player_name: str
    team_id: int
    team_name: str
    season: str
    season_type: str
    shots: List[ShotDetail]
    league_averages: List[LeagueAverage]

