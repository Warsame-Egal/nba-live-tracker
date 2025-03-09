from typing import List
from fastapi import APIRouter, HTTPException, Query
from app.services.scoreboard import (
    getScoreboard, getTeamGamesByDate, getMatchupGames,
    getTeamInfo, getCurrentTeamRecord, fetchTeamRoster,
    getPlayerDetails, fetchPlayersByName
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


@router.get("/scoreboard/team/{team_id}/game-date/{game_date}", 
            response_model=ScheduleResponse, 
            tags=["scoreboard"],
            summary="Get Team's Games on a Specific Date", 
            description="Retrieve all games played by a team on a given date.")
async def teamGamesByDate(team_id: int, game_date: str):
    """
    API route to fetch and return all games played by a team on a given date.
    Args:
        team_id (int): Unique NBA team identifier.
        game_date (str): The game date in "YYYY-MM-DD" format.
    """
    try:
        return await getTeamGamesByDate(team_id, game_date)
    except HTTPException as e:
        raise e

    
@router.get("/scoreboard/matchup/{team1_id}/{team2_id}", response_model=ScheduleResponse, tags=["scoreboard"],
            summary="Get Head-to-Head Matchups", description="Retrieve past games where two teams played against each other.")
async def matchupGames(team1_id: int, team2_id: int):
    """
    API route to fetch and return all past matchups between two teams.
    """
    try:
        return await getMatchupGames(team1_id, team2_id)
    except HTTPException as e:
        raise e


@router.get("/scoreboard/team/{team_id}/info", response_model=ScheduleResponse, tags=["scoreboard"],
            summary="Get Team's Full Season Schedule", description="Retrieve all games played by a team across seasons.")
async def teamInfo(team_id: int):
    """
    API route to fetch and return all games played by a specific team across seasons.
    """
    try:
        return await getTeamInfo(team_id) 
    except HTTPException as e:
        raise e

    
@router.get("/scoreboard/team/{team_id}/record", response_model=TeamDetails, tags=["teams"],
            summary="Get Current Team Record",
            description="Fetch the current season's record, ranking, and performance for a team.")
async def currentTeamRecord(team_id: int):
    """
    API route to retrieve a team's real-time standings and performance metrics.
    """
    try:
        return await getCurrentTeamRecord(team_id)
    except HTTPException as e:
        raise e

    
@router.get("/scoreboard/team/{team_id}/roster/{season}", response_model=TeamRoster, tags=["teams"], 
            summary="Get Team Roster", description="Fetch the full roster and coaching staff for a given team and season.")
async def getTeamRoster(team_id: int, season: str):
    """
    API endpoint to retrieve the full roster of a given NBA team for a specific season.
    Args:
        team_id (int): The unique identifier for the NBA team.
        season (str): The NBA season identifier (e.g., "2023-24").
    Returns:
        TeamRoster: A structured response containing player details.
    """
    try:
        return fetchTeamRoster(team_id, season)
    except HTTPException as e:
        raise e

@router.get("/players/{player_id}/details", response_model=PlayerSummary, tags=["players"],
            summary="Get Player Details",
            description="Retrieve detailed information about a specific player.")
async def fetchPlayerDetails(player_id: int):
    """
    API route to fetch detailed information about a specific player.

    Args:
        player_id (int): Unique identifier for the player.

    Returns:
        PlayerSummary: Structured response with player details.
    """
    try:
        return await getPlayerDetails(player_id)
    except HTTPException as e:
        raise e
    
@router.get("/players/search", response_model=List[PlayerSummary], tags=["players"])
async def searchPlayers(name: str):
    """
    API route to search for players by name.

    Args:
        name (str): The player's full name, first name, or last name.

    Returns:
        List[PlayerSummary]: A list of players matching the search query.
    """
    try:
        return await fetchPlayersByName(name)
    except HTTPException as e:
        raise e