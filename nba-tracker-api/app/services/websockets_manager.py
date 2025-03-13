import asyncio
import json
import time
import copy
from typing import List, Dict, Set
from fastapi import WebSocket
from app.services.scoreboard import getScoreboard

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
            current_games = await getScoreboard()
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
                    if game_id not in self.last_update_timestamp or (current_time - self.last_update_timestamp[game_id]) >= 5.0:
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
                scoreboard_data = await getScoreboard()
                standardized_data = scoreboard_data.model_dump()

                async with self._lock:
                    previous_games = copy.deepcopy(self.current_games)
                    self.current_games = standardized_data["scoreboard"]["games"]

                if not self.has_game_data_changed(self.current_games, previous_games):
                    await asyncio.sleep(2)
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

                await asyncio.sleep(2)

            except Exception as e:
                print(f"Broadcast Loop Error: {e}")
                await asyncio.sleep(5)

# Singleton instance
scoreboard_websocket_manager = ScoreboardWebSocketManager()
