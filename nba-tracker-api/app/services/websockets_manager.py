"""
WebSocket managers for broadcasting cached NBA data to clients.

These classes manage WebSocket connections and send cached data to clients.
They do not make NBA API calls - all data comes from the data_cache service.
"""

import asyncio
import copy
import json
import logging
import time
from typing import Dict, List, Set

from fastapi import WebSocket

from app.services.data_cache import data_cache
from app.services.batched_insights import generate_batched_insights
from app.services.key_moments import process_live_games, get_key_moments_for_game
from app.services.win_probability import get_win_probability_for_multiple_games

logger = logging.getLogger(__name__)


class ScoreboardWebSocketManager:
    """Manages WebSocket connections for live scoreboard updates."""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.current_games: List[Dict] = []
        self._lock = asyncio.Lock()
        self.last_update_timestamp: Dict[str, float] = {}
        self.last_win_prob_update: float = 0.0  # Track when we last sent win probability updates
    
    async def connect(self, websocket: WebSocket):
        """Add a new client connection."""
        await websocket.accept()
        logger.info(f"New scoreboard client connected: {websocket.client}")
        self.active_connections.add(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a client connection."""
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            pass
        finally:
            self.active_connections.discard(websocket)
            logger.info(f"Client disconnected from scoreboard: {websocket.client}")
    
    async def send_initial_scoreboard(self, websocket: WebSocket):
        """Send latest cached scoreboard data to a newly connected client."""
        try:
            if websocket not in self.active_connections:
                return
            
            scoreboard_data = await data_cache.get_scoreboard()
            
            if scoreboard_data:
                games_data = scoreboard_data.model_dump()
                await websocket.send_json(games_data)
            else:
                await websocket.send_json({"scoreboard": {"gameDate": "", "games": []}})
        except Exception as e:
            error_msg = str(e) if str(e) else type(e).__name__
            logger.warning(f"Could not send initial scoreboard: {error_msg}")
            self.active_connections.discard(websocket)
    
    def has_game_data_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """Check if game scores or status have changed."""
        current_time = time.time()
        
        new_map = {game["gameId"]: game for game in new_data}
        old_map = {game["gameId"]: game for game in old_data}
        
        for game_id, new_game in new_map.items():
            if game_id not in old_map:
                return True
            
            old_game = old_map[game_id]
            
            try:
                new_home_score = new_game["homeTeam"].get("score", 0)
                new_away_score = new_game["awayTeam"].get("score", 0)
                old_home_score = old_game["homeTeam"].get("score", 0)
                old_away_score = old_game["awayTeam"].get("score", 0)
                
                if (
                    new_game["gameStatus"] != old_game["gameStatus"]
                    or new_game["period"] != old_game["period"]
                    or new_home_score != old_home_score
                    or new_away_score != old_away_score
                ):
                    if (
                        game_id not in self.last_update_timestamp
                        or (current_time - self.last_update_timestamp[game_id]) >= 5.0
                    ):
                        self.last_update_timestamp[game_id] = current_time
                        return True
            except KeyError as e:
                logger.warning(f"Missing data in game {game_id}: {e}")
        
        return False
    
    async def broadcast_updates(self):
        """Continuously check cache for score updates and send to all connected clients."""
        logger.info("Scoreboard broadcasting started")
        
        while True:
            try:
                if not self.active_connections:
                    await asyncio.sleep(5)
                    continue
                
                scoreboard_data = await data_cache.get_scoreboard()
                
                if not scoreboard_data:
                    await asyncio.sleep(2)
                    continue
                
                standardized_data = scoreboard_data.model_dump()
                
                async with self._lock:
                    previous_games = copy.deepcopy(self.current_games)
                    self.current_games = standardized_data["scoreboard"]["games"]
                
                if not self.has_game_data_changed(self.current_games, previous_games):
                    await asyncio.sleep(2)
                    continue
                
                logger.info(f"Broadcasting score updates for {len(self.current_games)} games")
                
                # Generate batched insights for live games
                insights_data = None
                try:
                    # Extract live games only (gameStatus == 2)
                    live_games = [
                        game for game in self.current_games
                        if game.get("gameStatus") == 2
                    ]
                    
                    if live_games:
                        # Format games for batched insights
                        games_for_insights = []
                        for game in live_games:
                            home_team = game.get("homeTeam", {})
                            away_team = game.get("awayTeam", {})
                            
                            # Extract win probabilities if available (from gameLeaders or calculate from score)
                            home_score = home_team.get("score", 0)
                            away_score = away_team.get("score", 0)
                            
                            # Simple win probability based on score difference (if no actual prob available)
                            total_score = home_score + away_score
                            if total_score > 0:
                                win_prob_home = home_score / total_score
                                win_prob_away = away_score / total_score
                            else:
                                win_prob_home = 0.5
                                win_prob_away = 0.5
                            
                            games_for_insights.append({
                                "game_id": game.get("gameId", ""),
                                "home_team": f"{home_team.get('teamCity', '')} {home_team.get('teamName', '')}".strip(),
                                "away_team": f"{away_team.get('teamCity', '')} {away_team.get('teamName', '')}".strip(),
                                "home_score": home_score,
                                "away_score": away_score,
                                "quarter": game.get("period", 1),
                                "time_remaining": game.get("gameClock", ""),
                                "win_prob_home": win_prob_home,
                                "win_prob_away": win_prob_away,
                                "last_event": game.get("gameStatusText", ""),
                            })
                        
                        # Generate batched insights (non-blocking)
                        insights_data = await generate_batched_insights(games_for_insights)
                        if insights_data:
                            logger.info(f"Generated insights_data: {insights_data}")
                            if insights_data.get("insights"):
                                logger.info(f"Sending {len(insights_data['insights'])} insights to clients")
                                for insight in insights_data["insights"]:
                                    logger.info(f"  - Game {insight.get('game_id')}: type={insight.get('type')}, text={insight.get('text', '')[:50]}...")
                            else:
                                logger.warning("insights_data has no 'insights' key or empty list")
                        else:
                            logger.warning("generate_batched_insights returned None or empty")
                except Exception as e:
                    logger.warning(f"Error generating batched insights: {e}", exc_info=True)
                
                # Process key moments detection for all live games (non-blocking)
                # This analyzes play-by-play events to find important moments like game-tying
                # shots, lead changes, scoring runs, etc. After detection, it batches all
                # moments that need AI context into one Groq call (same efficient pattern as
                # batched insights). If it fails, we just continue - key moments are nice to
                # have but not critical
                try:
                    await process_live_games()
                except Exception as e:
                    logger.warning(f"Error processing key moments: {e}", exc_info=True)
                
                # Get key moments for live games that were detected recently
                # We only send moments from the last 30 seconds to avoid spamming clients
                # with old moments they might have already seen
                key_moments_by_game = {}
                for game in live_games:
                    game_id = game.get("gameId", "")
                    if game_id:
                        try:
                            moments = await get_key_moments_for_game(game_id)
                            if moments:
                                # Only get moments from last 30 seconds (very recent)
                                from datetime import datetime, timedelta
                                cutoff = datetime.utcnow() - timedelta(seconds=30)
                                recent_moments = [
                                    m for m in moments
                                    if datetime.fromisoformat(m["timestamp"]) > cutoff
                                ]
                                if recent_moments:
                                    key_moments_by_game[game_id] = recent_moments
                        except Exception as e:
                            logger.debug(f"Error getting key moments for game {game_id}: {e}")
                
                # Send scoreboard data with insights and key moments
                disconnected_clients = []
                for connection in list(self.active_connections):
                    try:
                        # Send scoreboard data (scores, game status, etc.)
                        await connection.send_json(standardized_data)
                        
                        # Send AI insights separately if available
                        # These are general game insights, different from key moments
                        if insights_data and insights_data.get("insights"):
                            insights_message = {
                                "type": "insights",
                                "data": insights_data
                            }
                            logger.info(f"Sending insights message: {insights_message}")
                            await connection.send_json(insights_message)
                        
                        # Send key moments if any were detected recently
                        # Format: { type: "key_moments", data: { moments_by_game: { game_id: [moments] } } }
                        if key_moments_by_game:
                            key_moments_message = {
                                "type": "key_moments",
                                "data": {
                                    "moments_by_game": key_moments_by_game
                                }
                            }
                            await connection.send_json(key_moments_message)
                        
                        # Fetch and send win probability for live games
                        # Updates every 8 seconds to show real-time probability shifts
                        # (slightly less frequent than scoreboard updates to reduce API calls)
                        current_time = time.time()
                        if live_games and (current_time - self.last_win_prob_update) >= 8.0:
                            try:
                                game_ids = [game.get("gameId", "") for game in live_games if game.get("gameId")]
                                if game_ids:
                                    win_prob_data = await get_win_probability_for_multiple_games(game_ids)
                                    # Filter out None values (games without probability data)
                                    win_prob_by_game = {
                                        game_id: prob_data
                                        for game_id, prob_data in win_prob_data.items()
                                        if prob_data is not None
                                    }
                                    if win_prob_by_game:
                                        win_prob_message = {
                                            "type": "win_probability",
                                            "data": {
                                                "probabilities_by_game": win_prob_by_game
                                            }
                                        }
                                        await connection.send_json(win_prob_message)
                                        self.last_win_prob_update = current_time
                            except Exception as e:
                                logger.debug(f"Error fetching win probability: {e}")
                    except Exception as e:
                        logger.warning(f"Error sending update to client: {e}")
                        disconnected_clients.append(connection)
                
                for connection in disconnected_clients:
                    await self.disconnect(connection)
                
                await asyncio.sleep(2)
                
            except asyncio.CancelledError:
                logger.info("Scoreboard broadcast cancelled")
                raise
            except Exception as e:
                logger.error(f"Error in scoreboard broadcast: {e}")
                await asyncio.sleep(5)


class PlayByPlayWebSocketManager:
    """Manages WebSocket connections for live play-by-play updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.current_playbyplay: Dict[str, List[Dict]] = {}
        self._lock = asyncio.Lock()
        self.last_update_timestamp: Dict[str, float] = {}
    
    async def connect(self, websocket: WebSocket, game_id: str):
        """Add a new client connection for a specific game."""
        await websocket.accept()
        logger.info(f"New play-by-play client connected: game {game_id}, client {websocket.client}")
        
        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()
        
        self.active_connections[game_id].add(websocket)
        await self.send_initial_playbyplay(websocket, game_id)
    
    async def disconnect(self, websocket: WebSocket, game_id: str):
        """Remove a client connection."""
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            pass
        finally:
            if game_id in self.active_connections:
                self.active_connections[game_id].discard(websocket)
                logger.info(f"Client disconnected from play-by-play: game {game_id}")
                
                if not self.active_connections[game_id]:
                    del self.active_connections[game_id]
                    if game_id in self.current_playbyplay:
                        del self.current_playbyplay[game_id]
    
    async def send_initial_playbyplay(self, websocket: WebSocket, game_id: str):
        """Send latest cached play-by-play data to a newly connected client."""
        try:
            if game_id not in self.active_connections or websocket not in self.active_connections[game_id]:
                return
            
            playbyplay_data = await data_cache.get_playbyplay(game_id)
            
            if playbyplay_data:
                plays_data = playbyplay_data.model_dump()
                await websocket.send_json(plays_data)
            else:
                await websocket.send_json({"game_id": game_id, "plays": []})
        except Exception as e:
            error_msg = str(e) if str(e) else type(e).__name__
            logger.warning(f"Could not send initial play-by-play for game {game_id}: {error_msg}")
            if game_id in self.active_connections:
                self.active_connections[game_id].discard(websocket)
    
    def has_playbyplay_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """Check if there are new plays in the game."""
        current_time = time.time()
        
        new_action_numbers = {play["action_number"] for play in new_data}
        old_action_numbers = {play["action_number"] for play in old_data}
        
        if new_action_numbers != old_action_numbers:
            if (current_time - self.last_update_timestamp.get("playbyplay", 0)) >= 2.0:
                self.last_update_timestamp["playbyplay"] = current_time
                return True
        
        return False
    
    async def broadcast_playbyplay_updates(self):
        """Continuously check cache for new plays and send to all clients watching each game."""
        logger.info("Play-by-play broadcasting started")
        
        while True:
            try:
                async with self._lock:
                    for game_id in list(self.active_connections.keys()):
                        if game_id not in self.active_connections or not self.active_connections[game_id]:
                            continue
                        
                        playbyplay_data = await data_cache.get_playbyplay(game_id)
                        
                        if not playbyplay_data:
                            continue
                        
                        standardized_data = playbyplay_data.model_dump()
                        
                        previous_playbyplay = copy.deepcopy(self.current_playbyplay.get(game_id, []))
                        self.current_playbyplay[game_id] = standardized_data["plays"]
                        
                        if not self.has_playbyplay_changed(self.current_playbyplay[game_id], previous_playbyplay):
                            continue
                        
                        logger.info(f"Broadcasting {len(self.current_playbyplay[game_id])} plays for game {game_id}")
                        
                        disconnected_clients = []
                        for connection in list(self.active_connections[game_id]):
                            try:
                                await connection.send_json(standardized_data)
                            except Exception as e:
                                logger.warning(f"Error sending play-by-play update: {e}")
                                disconnected_clients.append(connection)
                        
                        for connection in disconnected_clients:
                            await self.disconnect(connection, game_id)
                
                await asyncio.sleep(2)
                
            except asyncio.CancelledError:
                logger.info("Play-by-play broadcast cancelled")
                raise
            except Exception as e:
                logger.error(f"Error in play-by-play broadcast: {e}")
                await asyncio.sleep(5)


# Single instances used by the whole app
playbyplay_websocket_manager = PlayByPlayWebSocketManager()
scoreboard_websocket_manager = ScoreboardWebSocketManager()
