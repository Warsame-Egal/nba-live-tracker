import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.schemas.player import TeamRoster
from app.schemas.scoreboard import BoxScoreResponse, PlayByPlayResponse
from app.services.scoreboard import fetchTeamRoster, getBoxScore, getPlayByPlay
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# WebSocket endpoint for live score updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket connection for live NBA scoreboard updates.
    
    When a client connects:
    - They get the latest scores right away
    - They receive updates automatically when scores change
    - Connection stays open until client disconnects
    """

    # Accept the connection and register it
    await scoreboard_websocket_manager.connect(websocket)

    try:
        # Send the latest scores to the newly connected client
        await scoreboard_websocket_manager.send_initial_scoreboard(websocket)

        # Check if connection is still active after sending initial data
        if websocket not in scoreboard_websocket_manager.active_connections:
            return

        # Keep connection open and listen for messages from client
        while True:
            try:
                data = await websocket.receive_text()  # Get message from client
                logger.debug(f"Received message from client: {data}")
            except RuntimeError as e:
                # Connection was closed or not properly accepted
                if "not connected" in str(e).lower() or "accept" in str(e).lower():
                    logger.debug(f"WebSocket connection closed: {e}")
                    break
                raise

    except WebSocketDisconnect:
        # Client disconnected - clean up the connection
        logger.info(f"Client disconnected from scoreboard WebSocket")
    except Exception as e:
        # Log any other errors
        logger.error(f"Error in scoreboard WebSocket: {e}", exc_info=True)
    finally:
        # Always clean up the connection
        await scoreboard_websocket_manager.disconnect(websocket)


# Get team roster endpoint
@router.get(
    "/scoreboard/team/{team_id}/roster/{season}",
    response_model=TeamRoster,
    tags=["teams"],
    summary="Get Team Roster",
    description="Get the full roster (players and coaches) for a team in a season.",
)
async def getTeamRoster(team_id: int, season: str):
    """
    Get all players and coaches on a team for a specific season.
    
    Args:
        team_id: The NBA team ID
        season: The season year like "2024-25"
        
    Returns:
        TeamRoster: All players and coaches on the team
    """
    try:
        return await fetchTeamRoster(team_id, season)
    except HTTPException as e:
        raise e


# Get box score endpoint
@router.get(
    "/scoreboard/game/{game_id}/boxscore",
    response_model=BoxScoreResponse,
    tags=["boxscore"],
    summary="Get Box Score for a Game",
    description="Get detailed stats for a game including all player stats.",
)
async def get_game_boxscore(game_id: str):
    """
    Get the full box score (detailed stats) for a specific game.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        BoxScoreResponse: Complete stats for both teams and all players
    """
    try:
        return await getBoxScore(game_id)
    except HTTPException as e:
        raise e


# Get play-by-play endpoint
@router.get(
    "/scoreboard/game/{game_id}/play-by-play",
    response_model=PlayByPlayResponse,
    tags=["play-by-play"],
    summary="Get Play-by-Play for a Game",
    description="Get all play-by-play events for a specific game. Works for both live and completed games.",
)
async def get_game_playbyplay(game_id: str):
    """
    Get the play-by-play (all game events) for a specific game.
    Works for both live and completed games.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        PlayByPlayResponse: List of all plays/events that happened in the game
    """
    try:
        return await getPlayByPlay(game_id)
    except HTTPException as e:
        raise e


# WebSocket endpoint for play-by-play updates
@router.websocket("/ws/{game_id}/play-by-play")
async def playbyplay_websocket_endpoint(websocket: WebSocket, game_id: str):
    """
    WebSocket connection for live play-by-play updates for a specific game.
    
    When a client connects:
    - They get all plays that have happened so far
    - They receive new plays automatically as they happen
    - Connection stays open until client disconnects
    
    Args:
        game_id: The game to watch for play-by-play updates
    """
    await playbyplay_websocket_manager.connect(websocket, game_id)

    try:
        # Check if connection is still active after initial connection
        if game_id not in playbyplay_websocket_manager.active_connections or websocket not in playbyplay_websocket_manager.active_connections[game_id]:
            return

        # Keep connection open and listen for messages from client
        while True:
            try:
                data = await websocket.receive_text()
                logger.debug(f"Received message from client for game {game_id}: {data}")
            except RuntimeError as e:
                # Connection was closed or not properly accepted
                if "not connected" in str(e).lower() or "accept" in str(e).lower():
                    logger.debug(f"WebSocket connection closed: {e}")
                    break
                raise
    except WebSocketDisconnect:
        # Client disconnected - clean up the connection
        logger.info(f"Client disconnected from play-by-play WebSocket for game {game_id}")
    except Exception as e:
        # Log any other errors
        logger.error(f"Error in play-by-play WebSocket: {e}", exc_info=True)
    finally:
        # Always clean up the connection
        await playbyplay_websocket_manager.disconnect(websocket, game_id)
