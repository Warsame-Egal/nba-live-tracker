import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from typing import List, Dict, Any, Optional

from app.schemas.player import TeamRoster
from app.schemas.scoreboard import BoxScoreResponse, PlayByPlayResponse
from app.services.scoreboard import fetchTeamRoster, getBoxScore, getPlayByPlay
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)
from app.services.batched_insights import (
    generate_batched_insights,
    generate_lead_change_explanation,
)
from app.services.data_cache import data_cache

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


# Get batched insights for all live games
@router.get(
    "/scoreboard/insights",
    tags=["insights"],
    summary="Get Batched AI Insights",
    description="Get AI-generated insights for all live games in one call. Cached for 60 seconds.",
)
async def get_batched_insights():
    """
    Get AI-generated insights for all currently live games.
    Returns insights only for games with meaningful changes.
    
    Returns:
        Dict with timestamp and insights list
    """
    try:
        # Get current scoreboard
        scoreboard_data = await data_cache.get_scoreboard()
        
        if not scoreboard_data:
            return {
                "timestamp": "",
                "insights": []
            }
        
        # Extract live games only (gameStatus == 2)
        live_games = [
            game for game in scoreboard_data.scoreboard.games
            if game.gameStatus == 2
        ]
        
        if not live_games:
            return {
                "timestamp": "",
                "insights": []
            }
        
        # Format games for batched insights
        games_for_insights = []
        for game in live_games:
            home_team = game.homeTeam
            away_team = game.awayTeam
            
            # Extract win probabilities if available (from gameLeaders or calculate from score)
            home_score = home_team.score or 0
            away_score = away_team.score or 0
            
            # Simple win probability based on score difference (if no actual prob available)
            total_score = home_score + away_score
            if total_score > 0:
                win_prob_home = home_score / total_score
                win_prob_away = away_score / total_score
            else:
                win_prob_home = 0.5
                win_prob_away = 0.5
            
            games_for_insights.append({
                "game_id": game.gameId,
                "home_team": f"{home_team.teamCity} {home_team.teamName}".strip(),
                "away_team": f"{away_team.teamCity} {away_team.teamName}".strip(),
                "home_score": home_score,
                "away_score": away_score,
                "quarter": game.period,
                "time_remaining": game.gameClock or "",
                "win_prob_home": win_prob_home,
                "win_prob_away": win_prob_away,
                "last_event": game.gameStatusText,
            })
        
        # Generate batched insights
        return await generate_batched_insights(games_for_insights)
        
    except Exception as e:
        logger.error(f"Error generating batched insights: {e}", exc_info=True)
        return {
            "timestamp": "",
            "insights": []
        }


# Get lead change explanation for a specific game
@router.get(
    "/scoreboard/game/{game_id}/lead-change",
    tags=["insights"],
    summary="Get Lead Change Explanation",
    description="Get AI-generated explanation for why the lead changed. Cached for 60 seconds per game.",
)
async def get_lead_change_explanation(game_id: str):
    """
    Get on-demand explanation for why the lead changed in a game.
    Uses last 5 plays to explain the change.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        Dict with summary and key_factors explaining the lead change
    """
    try:
        # Get current game data
        scoreboard_data = await data_cache.get_scoreboard()
        
        if not scoreboard_data:
            raise HTTPException(status_code=404, detail="Scoreboard data not available")
        
        # Find the game
        game = None
        for g in scoreboard_data.scoreboard.games:
            if g.gameId == game_id:
                game = g
                break
        
        if not game:
            raise HTTPException(status_code=404, detail=f"Game {game_id} not found")
        
        # Get play-by-play for last 5 plays
        playbyplay_data = await data_cache.get_playbyplay(game_id)
        
        last_5_plays = []
        if playbyplay_data and playbyplay_data.plays:
            # Get last 5 plays (most recent first)
            sorted_plays = sorted(playbyplay_data.plays, key=lambda p: p.action_number, reverse=True)
            last_5_plays = sorted_plays[:5]
            
            # Convert to dict format
            last_5_plays = [
                {
                    "action_type": play.action_type,
                    "description": play.description,
                    "team_tricode": play.team_tricode,
                }
                for play in last_5_plays
            ]
        
        home_team = game.homeTeam
        away_team = game.awayTeam
        current_home_score = home_team.score or 0
        current_away_score = away_team.score or 0
        
        # Get previous scores from cache if available
        from app.services.batched_insights import _insights_cache
        previous_scores = _insights_cache.get_previous_scores(game_id)
        
        if previous_scores:
            previous_home_score, previous_away_score = previous_scores
        else:
            # No previous scores tracked - use current as previous (first call)
            previous_home_score = current_home_score
            previous_away_score = current_away_score
        
        # Update tracking
        _insights_cache.last_scores[game_id] = (current_home_score, current_away_score)
        
        # Generate explanation
        explanation = await generate_lead_change_explanation(
            game_id=game_id,
            home_team=f"{home_team.teamCity} {home_team.teamName}".strip(),
            away_team=f"{away_team.teamCity} {away_team.teamName}".strip(),
            previous_home_score=previous_home_score,
            previous_away_score=previous_away_score,
            current_home_score=current_home_score,
            current_away_score=current_away_score,
            last_5_plays=last_5_plays,
            quarter=game.period,
            time_remaining=game.gameClock or "",
        )
        
        if not explanation:
            raise HTTPException(status_code=500, detail="Failed to generate lead change explanation")
        
        return explanation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating lead change explanation for game {game_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating explanation: {str(e)}")
