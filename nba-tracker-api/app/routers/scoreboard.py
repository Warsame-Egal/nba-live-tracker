from typing import List
from fastapi import APIRouter, HTTPException
from app.services.scoreboard import (
    getScoreboard, getTeamGamesByDate, getMatchupGames,
    getTeamInfo, getLiveTeam, getTeamRoster,
    searchPlayerByName, getPlayerDetails
)
from app.schemas.scoreboard import ScoreboardResponse
from app.schemas.player import TeamRoster, PlayerSummary
from app.schemas.team import TeamDetails
from app.schemas.schedule import ScheduleResponse

router = APIRouter()

@router.get("/scoreboard", response_model=ScoreboardResponse, tags=["scoreboard"],
            summary="Get Live NBA Scores",
            description="Fetch and return live NBA scores from the NBA API.")
async def scoreboard():
    """
    This endpoint fetches live game data, including team scores, game status, 
    period, and other relevant details.

    """
    try:
        return await getScoreboard()
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scoreboard/team/{team_id}/date/{game_date}", response_model=ScheduleResponse, tags=["schedule"],
            summary="Get Team Games by Date", description="Retrieve all games played by a team on a given date.")
async def team_games_by_date(team_id: int, game_date: str):
    """
    API route to fetch and return all games played by a team on a given date.
    """
    try:
        return getTeamGamesByDate(team_id, game_date)
    except HTTPException as e:
        raise e
    
@router.get("/scoreboard/matchup/{team1_id}/{team2_id}", response_model=ScheduleResponse, tags=["schedule"],
            summary="Get Head-to-Head Matchups", description="Retrieve past games where two teams played against each other.")
async def get_matchup_games(team1_id: int, team2_id: int):
    """
    Fetches all games where two teams have faced each other.
    """
    try:
        return getMatchupGames(team1_id, team2_id)
    except HTTPException as e:
        raise e

@router.get("/scoreboard/team/{team_id}/info", response_model=ScheduleResponse, tags=["schedule"],
            summary="Get Team's Full Season Schedule", description="Retrieve all time games from a team season schedule for a team.")
async def get_team_info(team_id: int):
    """
    Fetches all games played by a specific team in the current or past season.
    """
    try:
        return getTeamInfo(team_id)
    except HTTPException as e:
        raise e
    
@router.get("/scoreboard/team/{team_id}", response_model=TeamDetails, tags=["teams"],
            summary="Get Live Team ", description="Fetch a team's record, ranking, and performance for a team that is playing today")
async def live_team(team_id: int):
    """
    Fetches team details (rank, record, performance).
    """
    try:
        return getLiveTeam(team_id)
    except HTTPException as e:
        raise e
    
@router.get("/scoreboard/team/{team_id}/roster/{season}", response_model=TeamRoster, tags=["teams"],
            summary="Get Team Roster", description="Fetch the full roster and coaching staff for a given team and season.")
async def team_roster(team_id: int, season: str):
    """Fetches team roster (players & coaches) for a given season."""
    try:
        return getTeamRoster(team_id, season)
    except HTTPException as e:
        raise e

@router.get("/scoreboard/player/{player_id}/details", response_model=PlayerSummary, tags=["players"],
            summary="Get Player Details", description="Retrieve detailed information about a specific player.")
async def get_player_details(player_id: int):
    """Fetch details for a specific player using PlayerIndex API."""
    try:
        return getPlayerDetails(player_id)
    except HTTPException as e:
        raise e
    
@router.get("/scoreboard/player/search", response_model=List[PlayerSummary], tags=["players"],
            summary="Search Players", description="Search for a player by name.")
async def search_player(name: str):
    """Search for a player by name using PlayerIndex API."""
    try:
        return searchPlayerByName(name)
    except HTTPException as e:
        raise e
