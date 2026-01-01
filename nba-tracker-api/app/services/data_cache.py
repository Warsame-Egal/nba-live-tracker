"""
Data cache service for NBA API data.

Polls the NBA API in the background and caches the latest data.
WebSocket handlers read from this cache instead of making API calls directly.
"""

import asyncio
import logging
from typing import Dict, Optional

from app.services.scoreboard import getPlayByPlay, getScoreboard
from app.schemas.scoreboard import PlayByPlayResponse, ScoreboardResponse

logger = logging.getLogger(__name__)


class DataCache:
    """Manages background polling and caching of NBA API data."""
    
    def __init__(self):
        self._scoreboard_cache: Optional[ScoreboardResponse] = None
        self._playbyplay_cache: Dict[str, PlayByPlayResponse] = {}
        self._lock = asyncio.Lock()
        self._active_game_ids: set = set()
        
        self.SCOREBOARD_POLL_INTERVAL = 8
        self.PLAYBYPLAY_POLL_INTERVAL = 5
        
        self._scoreboard_task: Optional[asyncio.Task] = None
        self._playbyplay_task: Optional[asyncio.Task] = None
    
    async def get_scoreboard(self) -> Optional[ScoreboardResponse]:
        """Get latest cached scoreboard data. Returns None if not available yet."""
        async with self._lock:
            return self._scoreboard_cache
    
    async def get_playbyplay(self, game_id: str) -> Optional[PlayByPlayResponse]:
        """Get latest cached play-by-play data for a game. Returns None if not available yet."""
        async with self._lock:
            return self._playbyplay_cache.get(game_id)
    
    async def _poll_scoreboard(self):
        """Background task that polls NBA API for scoreboard data every 8 seconds."""
        logger.info("Scoreboard polling started")
        
        while True:
            try:
                try:
                    scoreboard_data = await asyncio.wait_for(
                        getScoreboard(), 
                        timeout=10.0
                    )
                    
                    async with self._lock:
                        self._scoreboard_cache = scoreboard_data
                        
                        # Track active games for play-by-play polling
                        # gameStatus: 1=Scheduled, 2=In Progress, 3=Final
                        if scoreboard_data and scoreboard_data.scoreboard:
                            active_games = [
                                game.gameId 
                                for game in scoreboard_data.scoreboard.games
                                if game.gameStatus == 2
                            ]
                            self._active_game_ids = set(active_games)
                    
                    logger.debug(f"Scoreboard cache updated: {len(scoreboard_data.scoreboard.games) if scoreboard_data and scoreboard_data.scoreboard else 0} games")
                    
                except asyncio.TimeoutError:
                    logger.warning("Timeout fetching scoreboard, will retry")
                except Exception as e:
                    logger.warning(f"Error fetching scoreboard: {e}, will retry")
                
                await asyncio.sleep(self.SCOREBOARD_POLL_INTERVAL)
                
            except asyncio.CancelledError:
                logger.info("Scoreboard polling cancelled")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in scoreboard polling: {e}")
                await asyncio.sleep(5)
    
    async def _poll_playbyplay(self):
        """Background task that polls NBA API for play-by-play data every 5 seconds."""
        logger.info("Play-by-play polling started")
        
        while True:
            try:
                async with self._lock:
                    games_to_poll = list(self._active_game_ids)
                
                for game_id in games_to_poll:
                    try:
                        playbyplay_data = await asyncio.wait_for(
                            getPlayByPlay(game_id),
                            timeout=10.0
                        )
                        
                        async with self._lock:
                            self._playbyplay_cache[game_id] = playbyplay_data
                        
                        logger.debug(f"Play-by-play cache updated for game {game_id}")
                        
                    except asyncio.TimeoutError:
                        logger.debug(f"Timeout fetching play-by-play for game {game_id}")
                    except Exception as e:
                        logger.debug(f"Error fetching play-by-play for game {game_id}: {e}")
                    
                    await asyncio.sleep(0.5)
                
                await asyncio.sleep(self.PLAYBYPLAY_POLL_INTERVAL)
                
            except asyncio.CancelledError:
                logger.info("Play-by-play polling cancelled")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in play-by-play polling: {e}")
                await asyncio.sleep(5)
    
    def start_polling(self):
        """Start background polling tasks. Called once on app startup."""
        if self._scoreboard_task is None or self._scoreboard_task.done():
            self._scoreboard_task = asyncio.create_task(self._poll_scoreboard())
            logger.info("Started scoreboard polling")
        
        if self._playbyplay_task is None or self._playbyplay_task.done():
            self._playbyplay_task = asyncio.create_task(self._poll_playbyplay())
            logger.info("Started play-by-play polling")
    
    async def stop_polling(self):
        """Stop background polling tasks. Called on app shutdown."""
        logger.info("Stopping data cache polling...")
        
        if self._scoreboard_task and not self._scoreboard_task.done():
            self._scoreboard_task.cancel()
            try:
                await self._scoreboard_task
            except asyncio.CancelledError:
                pass
        
        if self._playbyplay_task and not self._playbyplay_task.done():
            self._playbyplay_task.cancel()
            try:
                await self._playbyplay_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Data cache polling stopped")


# Single global instance used by the whole app
data_cache = DataCache()
