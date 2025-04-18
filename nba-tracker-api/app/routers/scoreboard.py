from typing import List

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.schemas.player import PlayerSummary, TeamRoster
from app.schemas.scoreboard import (
    BoxScoreResponse,
    GameLeadersResponse,
    PlayByPlayResponse,
    ScoreboardResponse,
    TeamGameStatsResponse,
)
from app.schemas.team import TeamDetails
from app.services.scoreboard import (
    fetchPlayersByName,
    fetchTeamRoster,
    getBoxScore,
    getCurrentTeamRecord,
    getGameLeaders,
    getPlayByPlay,
    getScoreboard,
    getTeamStats,
)
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)

router = APIRouter()


# WebSocket Endpoint for Real-Time Score Updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket connection handler for live NBA scoreboard updates.

    This function:
    - Accepts WebSocket connections from clients.
    - Sends the latest scoreboard data when a client connects.
    - Listens for incoming messages from the client (currently just logs received data).
    - Handles disconnections gracefully.
    """

    # Accept and register the new WebSocket connection
    await scoreboard_websocket_manager.connect(websocket)

    try:
        # Send the latest scoreboard data to the newly connected client
        await scoreboard_websocket_manager.send_initial_scoreboard(websocket)

        # Keep the WebSocket connection open and listen for incoming messages
        while True:
            data = await websocket.receive_text()  # Receive message from client
            print(f"Received: {data}")  # Log incoming messages (if needed for debugging)

    except WebSocketDisconnect:
        # Handle client disconnection
        print(f"Client disconnected: {websocket}")
        await scoreboard_websocket_manager.disconnect(websocket)


# API Endpoint for Live Scoreboard Data (REST)
@router.get(
    "/scoreboard",
    response_model=ScoreboardResponse,
    tags=["scoreboard"],
    summary="Get Live NBA Scores",
    description="Fetch and return live NBA scores from the NBA API.",
)
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


@router.get(
    "/scoreboard/team/{team_id}/record",
    response_model=TeamDetails,
    tags=["teams"],
    summary="Get Current Team Record",
    description="Fetch the current season's record, ranking, and performance for a team.",
)
async def currentTeamRecord(team_id: int):
    """
    API route to retrieve a team's real-time standings
      and performance metrics.
    """
    try:
        return await getCurrentTeamRecord(team_id)
    except HTTPException as e:
        raise e


@router.get(
    "/scoreboard/team/{team_id}/roster/{season}",
    response_model=TeamRoster,
    tags=["teams"],
    summary="Get Team Roster",
    description="Fetch the full roster and coaching staff for a given team and season.",
)
async def getTeamRoster(team_id: int, season: str):
    """
    API endpoint to retrieve the full roster of a given
      NBA team for a specific season.
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


@router.get(
    "/scoreboard/game/{game_id}/boxscore",
    response_model=BoxScoreResponse,
    tags=["boxscore"],
    summary="Get Box Score for a Game",
    description="Retrieve detailed game stats including team and player performance.",
)
async def get_game_boxscore(game_id: str):
    """
    API route to fetch the full box score for a given NBA game.

    Args:
        game_id (str): Unique game identifier.

    Returns:
        BoxScoreResponse: Full box score containing team and player stats.
    """
    try:
        return await getBoxScore(game_id)
    except HTTPException as e:
        raise e


@router.get(
    "/scoreboard/game/{game_id}/team/{team_id}/stats",
    response_model=TeamGameStatsResponse,
    tags=["boxscore"],
    summary="Get Team Statistics for a Game",
    description="Retrieve detailed statistics for a specific team in a given NBA game.",
)
async def get_game_team_stats(game_id: str, team_id: int):
    """
    API route to fetch the statistics of a specific team in a given NBA game.

    Args:
        game_id (str): Unique game identifier.
        team_id (int): Unique team identifier.

    Returns:
        TeamGameStatsResponse: The team's box score stats.
    """
    try:
        return await getTeamStats(game_id, team_id)
    except HTTPException as e:
        raise e


@router.get(
    "/scoreboard/game/{game_id}/leaders",
    response_model=GameLeadersResponse,
    tags=["boxscore"],
    summary="Get Game Leaders",
    description="Retrieve the top-performing players in points, assists, and rebounds for a given NBA game.",
)
async def get_game_leaders(game_id: str):
    """
    API route to fetch the top players in points, assists,
      and rebounds for a given NBA game.

    Args:
        game_id (str): Unique game identifier.

    Returns:
        GameLeadersResponse: The top-performing players in the game.
    """
    try:
        return await getGameLeaders(game_id)
    except HTTPException as e:
        raise e


@router.get(
    "/scoreboard/game/{game_id}/play-by-play",
    response_model=PlayByPlayResponse,
    tags=["play-by-play"],
    summary="Get Play-by-Play Breakdown",
    description="Retrieve real-time play-by-play breakdown, including scoring events, assists, and turnovers.",
)
async def get_game_play_by_play(game_id: str):
    """
    API route to fetch real-time play-by-play breakdown for a given NBA game.

    Args:
        game_id (str): Unique game identifier.

    Returns:
        PlayByPlayResponse: List of play-by-play events.
    """
    try:
        return await getPlayByPlay(game_id)
    except HTTPException as e:
        raise e


@router.websocket("/ws/{game_id}/play-by-play")
async def playbyplay_websocket_endpoint(websocket: WebSocket, game_id: str):
    """
    WebSocket connection handler for live NBA Play-by-Play updates.

    - Accepts WebSocket connections from clients.
    - Sends real-time play-by-play data to connected clients.
    - Handles disconnections gracefully.
    """
    await playbyplay_websocket_manager.connect(websocket, game_id)

    try:
        # Continuously send real-time Play-by-Play updates
        while True:
            data = await websocket.receive_text()
            print(f"Received from client: {data}")
    except WebSocketDisconnect:
        await playbyplay_websocket_manager.disconnect(websocket, game_id)
