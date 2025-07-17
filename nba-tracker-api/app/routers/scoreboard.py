from typing import List

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends

from app.schemas.player import TeamRoster
from app.schemas.scoreboard import BoxScoreResponse, PlayByPlayResponse
from app.services.scoreboard import fetchTeamRoster, getBoxScore, getPlayByPlay
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.database import get_db
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
        return await fetchTeamRoster(team_id, season)
    except HTTPException as e:
        raise e


@router.get(
    "/scoreboard/game/{game_id}/boxscore",
    response_model=BoxScoreResponse,
    tags=["boxscore"],
    summary="Get Box Score for a Game",
    description="Retrieve detailed game stats including team and player performance.",
)
async def get_game_boxscore(game_id: str, db: AsyncSession = Depends(get_db)):
    """
    API route to fetch the full box score for a given NBA game.

    Args:
        game_id (str): Unique game identifier.

    Returns:
        BoxScoreResponse: Full box score containing team and player stats.
    """
    try:
        return await getBoxScore(game_id, db)
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
    
