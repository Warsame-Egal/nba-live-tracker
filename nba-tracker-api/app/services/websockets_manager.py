import asyncio
import copy
import json
import logging
import time
from typing import Dict, List, Set

from fastapi import WebSocket

from app.services.scoreboard import getPlayByPlay, getScoreboard

# Set up logger for this file
logger = logging.getLogger(__name__)


class ScoreboardWebSocketManager:
    """
    Manages WebSocket connections for live NBA scoreboard updates.
    
    This class keeps track of all connected clients and sends them
    real-time score updates when games change.
    """

    def __init__(self):
        # Keep track of all active WebSocket connections
        self.active_connections: Set[WebSocket] = set()
        # Store the current game data
        self.current_games: List[Dict] = []
        # Lock to prevent multiple updates at the same time
        self._lock = asyncio.Lock()
        # Track when we last sent updates for each game (to avoid spamming)
        self.last_update_timestamp: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket):
        """
        Add a new client connection and send them the latest scores.
        
        Args:
            websocket: The WebSocket connection from the client
        """
        await websocket.accept()
        logger.info(f"New client connected for scoreboard updates: {websocket.client}")
        self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        """
        Remove a client connection when they disconnect.
        
        Args:
            websocket: The WebSocket connection to remove
        """
        try:
            # Try to close the connection gracefully if it's still open
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            # Connection might already be closed, ignore
            pass
        finally:
            self.active_connections.discard(websocket)
            logger.info(f"Client disconnected from scoreboard updates: {websocket.client}")

    async def send_initial_scoreboard(self, websocket: WebSocket):
        """
        Send the latest scoreboard data to a newly connected client.
        This gives them the current scores right away.
        
        Args:
            websocket: The WebSocket connection to send data to
        """
        try:
            # Check if connection is still active
            if websocket not in self.active_connections:
                logger.debug("Client disconnected before initial scoreboard could be sent")
                return
            
            # Get the latest scores from the NBA API (with timeout to prevent hanging)
            try:
                current_games = await asyncio.wait_for(getScoreboard(), timeout=10.0)
                games_data = current_games.model_dump()
                logger.debug(f"Sending initial scoreboard data to new client")
                await websocket.send_json(games_data)
            except asyncio.TimeoutError:
                logger.warning("Timeout fetching initial scoreboard data")
                # Send empty scoreboard if timeout
                await websocket.send_json({"scoreboard": {"gameDate": "", "games": []}})
        except Exception as e:
            # This is usually harmless - client may have disconnected quickly
            # Log as warning instead of error since it's expected behavior
            error_msg = str(e) if str(e) else type(e).__name__
            logger.warning(f"Could not send initial scoreboard data (client may have disconnected): {error_msg}")
            # Clean up the connection if it's still in our set
            self.active_connections.discard(websocket)

    def has_game_data_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """
        Check if the game scores or status have changed.
        We only send updates if something actually changed.
        
        Args:
            new_data: The latest game data from NBA API
            old_data: The previous game data we had
            
        Returns:
            True if scores or game status changed, False otherwise
        """
        current_time = time.time()
        has_changes = False

        # Convert lists to dictionaries for easier lookup
        new_map = {game["gameId"]: game for game in new_data}
        old_map = {game["gameId"]: game for game in old_data}

        # Check each game to see if anything changed
        for game_id, new_game in new_map.items():
            # If this is a new game, we need to send an update
            if game_id not in old_map:
                return True

            old_game = old_map[game_id]

            try:
                # Get the scores for both teams
                new_home_score = new_game["homeTeam"].get("score", 0)
                new_away_score = new_game["awayTeam"].get("score", 0)
                old_home_score = old_game["homeTeam"].get("score", 0)
                old_away_score = old_game["awayTeam"].get("score", 0)

                # Check if score, period, or game status changed
                if (
                    new_game["gameStatus"] != old_game["gameStatus"]
                    or new_game["period"] != old_game["period"]
                    or new_home_score != old_home_score
                    or new_away_score != old_away_score
                ):
                    # Only send update if we haven't sent one in the last 5 seconds
                    # This prevents sending too many updates
                    if (
                        game_id not in self.last_update_timestamp
                        or (current_time - self.last_update_timestamp[game_id]) >= 5.0
                    ):
                        self.last_update_timestamp[game_id] = current_time
                        return True

            except KeyError as e:
                # If we're missing some data, log it but don't crash
                logger.warning(f"Missing data in game {game_id}: {e}. Game data: {json.dumps(new_game, indent=2)}")

        return has_changes

    async def broadcast_updates(self):
        """
        Continuously check for score updates and send them to all connected clients.
        This runs in the background and never stops until the app shuts down.
        """
        logger.info("Scoreboard WebSocket broadcasting started")

        while True:
            try:
                # If no clients are connected, wait longer before checking again
                # This saves API calls and prevents rate limiting
                if not self.active_connections:
                    # Use shorter sleep intervals that can be cancelled faster
                    for _ in range(30):
                        await asyncio.sleep(1)
                    continue

                # Get the latest scores from NBA API (with timeout to prevent hanging)
                try:
                    scoreboard_data = await asyncio.wait_for(getScoreboard(), timeout=10.0)
                    standardized_data = scoreboard_data.model_dump()
                except asyncio.TimeoutError:
                    logger.warning("Timeout fetching scoreboard data, skipping this update")
                    # Wait before retrying
                    for _ in range(30):
                        await asyncio.sleep(1)
                    continue
                except Exception as e:
                    logger.warning(f"Error fetching scoreboard data: {e}, skipping this update")
                    # Wait before retrying
                    for _ in range(30):
                        await asyncio.sleep(1)
                    continue

                # Save the current games and compare with previous
                async with self._lock:
                    previous_games = copy.deepcopy(self.current_games)
                    self.current_games = standardized_data["scoreboard"]["games"]

                # Only send updates if something actually changed
                if not self.has_game_data_changed(self.current_games, previous_games):
                    # Use shorter sleep intervals that can be cancelled faster
                    for _ in range(30):
                        await asyncio.sleep(1)
                    continue

                logger.info(f"Broadcasting score updates for {len(self.current_games)} games")

                # Send updates to all connected clients
                disconnected_clients = []
                for connection in list(self.active_connections):
                    try:
                        await connection.send_json(standardized_data)
                    except Exception as e:
                        # If sending fails, the client probably disconnected
                        logger.warning(f"Error sending update to client: {e}")
                        disconnected_clients.append(connection)

                # Clean up disconnected clients
                for connection in disconnected_clients:
                    await self.disconnect(connection)

                # Wait 30 seconds before checking for updates again
                # Use shorter sleep intervals that can be cancelled faster
                for _ in range(30):
                    await asyncio.sleep(1)

            except asyncio.CancelledError:
                # Task was cancelled, exit cleanly
                logger.info("Scoreboard broadcast task cancelled")
                raise
            except Exception as e:
                # If something goes wrong, log it and wait a bit before trying again
                logger.error(f"Error in scoreboard broadcast loop: {e}")
                # Use shorter sleep intervals that can be cancelled faster
                for _ in range(5):
                    await asyncio.sleep(1)


class PlayByPlayWebSocketManager:
    """
    Manages WebSocket connections for live play-by-play game updates.
    
    This class sends real-time game events (shots, fouls, etc.) to clients
    watching a specific game.
    """

    def __init__(self):
        # Track connections by game ID - each game can have multiple clients
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # {game_id: set(WebSockets)}
        # Store the current play-by-play data for each game
        self.current_playbyplay: Dict[str, List[Dict]] = {}  # {game_id: list of plays}
        # Lock to prevent multiple updates at the same time
        self._lock = asyncio.Lock()
        # Track when we last sent updates (to avoid sending too many)
        self.last_update_timestamp: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        """
        Add a new client connection for a specific game.
        
        Args:
            websocket: The WebSocket connection from the client
            game_id: The ID of the game they want to watch
        """
        await websocket.accept()
        logger.info(f"New client connected for play-by-play updates: game {game_id}, client {websocket.client}")

        # Create a set for this game if it doesn't exist
        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()

        self.active_connections[game_id].add(websocket)
        # Send them the current plays right away
        await self.send_initial_playbyplay(websocket, game_id)

    async def disconnect(self, websocket: WebSocket, game_id: str):
        """
        Remove a client connection when they disconnect.
        
        Args:
            websocket: The WebSocket connection to remove
            game_id: The game they were watching
        """
        try:
            # Try to close the connection gracefully if it's still open
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            # Connection might already be closed, ignore
            pass
        finally:
            if game_id in self.active_connections:
                self.active_connections[game_id].discard(websocket)
                logger.info(f"Client disconnected from play-by-play updates: game {game_id}, client {websocket.client}")

                # If no one is watching this game anymore, clean up the data
                if not self.active_connections[game_id]:
                    del self.active_connections[game_id]
                    # Only delete if the key exists (might have been cleaned up already)
                    if game_id in self.current_playbyplay:
                        del self.current_playbyplay[game_id]

    async def send_initial_playbyplay(self, websocket: WebSocket, game_id: str):
        """
        Send the current play-by-play data to a newly connected client.
        This gives them all the plays that have happened so far.
        
        Args:
            websocket: The WebSocket connection to send data to
            game_id: The game they want to watch
        """
        try:
            # Check if connection is still active
            if game_id not in self.active_connections or websocket not in self.active_connections[game_id]:
                logger.debug(f"Client disconnected before initial play-by-play could be sent for game {game_id}")
                return
            
            # Get the latest play-by-play data from NBA API (with timeout to prevent hanging)
            try:
                playbyplay_data = await asyncio.wait_for(getPlayByPlay(game_id), timeout=10.0)
                plays_data = playbyplay_data.model_dump()
                logger.debug(f"Sending initial play-by-play data for game {game_id}")
                await websocket.send_json(plays_data)
            except asyncio.TimeoutError:
                logger.warning(f"Timeout fetching initial play-by-play data for game {game_id}")
                # Send empty play-by-play if timeout
                await websocket.send_json({"game_id": game_id, "plays": []})
        except Exception as e:
            # This is usually harmless - client may have disconnected quickly
            # Log as warning instead of error since it's expected behavior
            error_msg = str(e) if str(e) else type(e).__name__
            logger.warning(f"Could not send initial play-by-play data for game {game_id} (client may have disconnected): {error_msg}")
            # Clean up the connection if it's still in our set
            if game_id in self.active_connections:
                self.active_connections[game_id].discard(websocket)

    def has_playbyplay_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """
        Check if there are new plays in the game.
        We only send updates if new plays were added.
        
        Args:
            new_data: The latest play-by-play data
            old_data: The previous play-by-play data
            
        Returns:
            True if there are new plays, False otherwise
        """
        current_time = time.time()
        has_changes = False

        # Get the action numbers (unique IDs for each play) from both lists
        new_action_numbers = {play["action_number"] for play in new_data}
        old_action_numbers = {play["action_number"] for play in old_data}

        # If the sets are different, there are new plays
        if new_action_numbers != old_action_numbers:
            # Only send update if we haven't sent one in the last 2 seconds
            if (current_time - self.last_update_timestamp.get("playbyplay", 0)) >= 2.0:
                self.last_update_timestamp["playbyplay"] = current_time
                return True

        return has_changes

    async def broadcast_playbyplay_updates(self):
        """
        Continuously check for new plays and send them to all clients watching each game.
        This runs in the background and never stops until the app shuts down.
        """
        logger.info("Play-by-play WebSocket broadcasting started")

        while True:
            try:
                async with self._lock:
                    # Check each game that has clients watching it
                    for game_id in list(self.active_connections.keys()):
                        # Skip if no clients are watching this game anymore
                        if game_id not in self.active_connections or not self.active_connections[game_id]:
                            continue
                        
                        # Get the latest play-by-play data from NBA API (with timeout to prevent hanging)
                        try:
                            playbyplay_data = await asyncio.wait_for(getPlayByPlay(game_id), timeout=10.0)
                        except asyncio.CancelledError:
                            raise
                        except asyncio.TimeoutError:
                            logger.warning(f"Timeout fetching play-by-play for game {game_id}, skipping this update")
                            continue
                        except Exception as e:
                            logger.warning(f"Error fetching play-by-play for game {game_id}: {e}")
                            continue
                        
                        standardized_data = playbyplay_data.model_dump()

                        # Save current plays and compare with previous
                        previous_playbyplay = copy.deepcopy(self.current_playbyplay.get(game_id, []))
                        self.current_playbyplay[game_id] = standardized_data["plays"]

                        # Only send updates if there are new plays
                        if not self.has_playbyplay_changed(self.current_playbyplay[game_id], previous_playbyplay):
                            continue

                        logger.info(f"Broadcasting {len(self.current_playbyplay[game_id])} plays for game {game_id}")

                        # Send updates to all clients watching this game
                        disconnected_clients = []
                        for connection in list(self.active_connections[game_id]):
                            try:
                                await connection.send_json(standardized_data)
                            except Exception as e:
                                # If sending fails, the client probably disconnected
                                logger.warning(f"Error sending play-by-play update to client: {e}")
                                disconnected_clients.append(connection)

                        # Clean up disconnected clients
                        for connection in disconnected_clients:
                            await self.disconnect(connection, game_id)

                # Wait 2 seconds before checking for new plays again
                # Use shorter sleep intervals that can be cancelled faster
                for _ in range(2):
                    await asyncio.sleep(1)

            except asyncio.CancelledError:
                # Task was cancelled, exit cleanly
                logger.info("Play-by-play broadcast task cancelled")
                raise
            except Exception as e:
                # If something goes wrong, log it and wait a bit before trying again
                logger.error(f"Error in play-by-play broadcast loop: {e}")
                # Use shorter sleep intervals that can be cancelled faster
                for _ in range(5):
                    await asyncio.sleep(1)


# Create single instances that the whole app uses
# These are "singletons" - only one instance exists
playbyplay_websocket_manager = PlayByPlayWebSocketManager()
scoreboard_websocket_manager = ScoreboardWebSocketManager()
