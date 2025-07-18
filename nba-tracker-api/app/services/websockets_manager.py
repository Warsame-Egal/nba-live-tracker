import asyncio
import copy
import json
import time
from typing import Dict, List, Set

from fastapi import WebSocket

from app.services.scoreboard import getPlayByPlay, getScoreboard
from app.database import async_session_factory


class ScoreboardWebSocketManager:
    """Manages WebSocket connections for real-time NBA scoreboard updates."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.current_games: List[Dict] = []
        self._lock = asyncio.Lock()
        self.last_update_timestamp: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket):
        """Adds a new WebSocket connection and sends initial data."""
        await websocket.accept()
        print(f"New WebSocket connection: {websocket}")
        self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Removes a WebSocket connection."""
        self.active_connections.discard(websocket)
        print(f"WebSocket disconnected: {websocket}")

    async def send_initial_scoreboard(self, websocket: WebSocket):
        """Sends the latest scoreboard data to a newly connected client."""
        try:
            async with async_session_factory() as session:
                current_games = await getScoreboard(session)
                games_data = current_games.model_dump()
                print(f"Sending initial games data: {games_data}")
                await websocket.send_json(games_data)
        except Exception as e:
            print(f"Error sending initial games data: {e}")

    def has_game_data_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """Returns True if the scoreboard data has changed significantly."""
        current_time = time.time()
        has_changes = False

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
                print(f"KeyError in has_game_data_changed(): {e}. Game data: {json.dumps(new_game, indent=2)}")

        return has_changes

    async def broadcast_updates(self):
        """Continuously fetches and broadcasts scoreboard updates to clients."""
        print("WebSocket scoreboard broadcasting started...")

        while True:
            try:
                # If no clients are connected, sleep longer to avoid
                # requests that could trigger rate limiting.
                if not self.active_connections:
                    await asyncio.sleep(30)
                    continue

                async with async_session_factory() as session:
                    scoreboard_data = await getScoreboard(session)
                    standardized_data = scoreboard_data.model_dump()

                async with self._lock:
                    previous_games = copy.deepcopy(self.current_games)
                    self.current_games = standardized_data["scoreboard"]["games"]

                if not self.has_game_data_changed(self.current_games, previous_games):
                    await asyncio.sleep(30)
                    continue

                print(f"Broadcasting {len(self.current_games)} updated games")

                disconnected_clients = []
                for connection in list(self.active_connections):
                    try:
                        await connection.send_json(standardized_data)
                    except Exception as e:
                        print(f"WebSocket Broadcast Error: {e}")
                        disconnected_clients.append(connection)

                for connection in disconnected_clients:
                    await self.disconnect(connection)

                await asyncio.sleep(30)

            except Exception as e:
                print(f"Broadcast Loop Error: {e}")
                await asyncio.sleep(5)


class PlayByPlayWebSocketManager:
    """Manages WebSocket connections for real-time NBA Play-by-Play updates."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # {game_id: set(WebSockets)}
        self.current_playbyplay: Dict[str, List[Dict]] = {}  # {game_id: list of plays}
        self._lock = asyncio.Lock()
        self.last_update_timestamp: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        """Adds a new WebSocket connection for a specific game."""
        await websocket.accept()
        print(f"New Play-by-Play WebSocket connection: {websocket} for game {game_id}")

        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()

        self.active_connections[game_id].add(websocket)
        await self.send_initial_playbyplay(websocket, game_id)

    async def disconnect(self, websocket: WebSocket, game_id: str):
        """Removes a WebSocket connection from a specific game."""
        if game_id in self.active_connections:
            self.active_connections[game_id].discard(websocket)
            print(f"WebSocket disconnected: {websocket} for game {game_id}")

            if not self.active_connections[game_id]:  # If no more connections, clean up data
                del self.active_connections[game_id]
                del self.current_playbyplay[game_id]

    async def send_initial_playbyplay(self, websocket: WebSocket, game_id: str):
        """Sends the latest Play-by-Play data to a newly connected client."""
        try:
            playbyplay_data = await getPlayByPlay(game_id)
            plays_data = playbyplay_data.model_dump()
            print(f"Sending initial Play-by-Play data: {plays_data}")

            await websocket.send_json(plays_data)
        except Exception as e:
            print(f"Error sending initial Play-by-Play data: {e}")

    def has_playbyplay_changed(self, new_data: List[Dict], old_data: List[Dict]) -> bool:
        """Checks if Play-by-Play data has changed significantly."""
        current_time = time.time()
        has_changes = False

        new_action_numbers = {play["action_number"] for play in new_data}
        old_action_numbers = {play["action_number"] for play in old_data}

        if new_action_numbers != old_action_numbers:
            if (current_time - self.last_update_timestamp.get("playbyplay", 0)) >= 2.0:
                self.last_update_timestamp["playbyplay"] = current_time
                return True

        return has_changes

    async def broadcast_playbyplay_updates(self):
        """Continuously fetches and broadcasts Play-by-Play updates."""
        print("WebSocket Play-by-Play broadcasting started...")

        while True:
            try:
                async with self._lock:
                    for game_id in list(self.active_connections.keys()):
                        playbyplay_data = await getPlayByPlay(game_id)
                        standardized_data = playbyplay_data.model_dump()

                        previous_playbyplay = copy.deepcopy(self.current_playbyplay.get(game_id, []))
                        self.current_playbyplay[game_id] = standardized_data["plays"]

                        if not self.has_playbyplay_changed(self.current_playbyplay[game_id], previous_playbyplay):
                            continue

                        print(f"Broadcasting {len(self.current_playbyplay[game_id])} new plays for game {game_id}")

                        disconnected_clients = []
                        for connection in list(self.active_connections[game_id]):
                            try:
                                await connection.send_json(standardized_data)
                            except Exception as e:
                                print(f"WebSocket Broadcast Error: {e}")
                                disconnected_clients.append(connection)

                        for connection in disconnected_clients:
                            await self.disconnect(connection, game_id)

                await asyncio.sleep(2)  # Fetch every 2 seconds

            except Exception as e:
                print(f"Broadcast Loop Error: {e}")
                await asyncio.sleep(5)


# Singleton playbypLay instance
playbyplay_websocket_manager = PlayByPlayWebSocketManager()

# Singleton scoreboard instance
scoreboard_websocket_manager = ScoreboardWebSocketManager()
