"""
Data cache service for NBA API data.

Polls the NBA API in the background and caches the latest data.
WebSocket handlers read from this cache instead of making API calls directly.
"""

import asyncio
import logging
import time
from collections import OrderedDict
from typing import Dict, Optional

from app.services.scoreboard import getPlayByPlay, getScoreboard
from app.schemas.scoreboard import PlayByPlayResponse, ScoreboardResponse

logger = logging.getLogger(__name__)


class LRUCache:
    """
    LRU (Least Recently Used) cache for play-by-play data.
    
    When the cache gets full, it removes the oldest game that hasn't been accessed recently.
    This keeps memory usage under control while keeping the most active games in memory.
    """
    
    def __init__(self, max_size: int):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._timestamps: Dict[str, float] = {}  # Track when entries were added
    
    def get(self, key: str) -> Optional[PlayByPlayResponse]:
        """
        Get value from cache, moving it to end (most recently used).
        
        Moving to end means this game was just accessed, so it won't be removed
        when the cache gets full (oldest items are removed first).
        """
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None
    
    def set(self, key: str, value: PlayByPlayResponse):
        """Set value in cache, evicting oldest if at capacity."""
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        self._timestamps[key] = time.time()
        
        if len(self._cache) > self._max_size:
            oldest_key, _ = self._cache.popitem(last=False)
            self._timestamps.pop(oldest_key, None)
            logger.debug(f"LRU eviction: removed game {oldest_key} from play-by-play cache")
    
    def remove(self, key: str):
        """Remove a specific key from cache."""
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)
    
    def keys(self):
        """Get all keys in cache."""
        return list(self._cache.keys())
    
    def get_timestamp(self, key: str) -> Optional[float]:
        """Get timestamp when entry was added."""
        return self._timestamps.get(key)
    
    def clear_old_entries(self, max_age_seconds: float) -> int:
        """Remove entries older than max_age_seconds. Returns number removed."""
        current_time = time.time()
        keys_to_remove = [
            key for key, timestamp in self._timestamps.items()
            if current_time - timestamp > max_age_seconds
        ]
        for key in keys_to_remove:
            self.remove(key)
        return len(keys_to_remove)


class DataCache:
    """Manages background polling and caching of NBA API data."""
    
    def __init__(self):
        self._scoreboard_cache: Optional[ScoreboardResponse] = None
        self._playbyplay_cache = LRUCache(max_size=50)  # Limit to 50 active games
        self._lock = asyncio.Lock()
        self._active_game_ids: set = set()
        
        self.SCOREBOARD_POLL_INTERVAL = 8
        self.PLAYBYPLAY_POLL_INTERVAL = 5
        self.CLEANUP_INTERVAL = 300  # 5 minutes
        
        self._scoreboard_task: Optional[asyncio.Task] = None
        self._playbyplay_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
    
    async def get_scoreboard(self) -> Optional[ScoreboardResponse]:
        """Get latest cached scoreboard data. Returns None if not available yet."""
        async with self._lock:
            return self._scoreboard_cache
    
    async def get_playbyplay(self, game_id: str) -> Optional[PlayByPlayResponse]:
        """Get latest cached play-by-play data for a game. Returns None if not available yet."""
        async with self._lock:
            return self._playbyplay_cache.get(game_id)
    
    async def _cleanup_finished_games(self):
        """Remove finished games from play-by-play cache immediately."""
        async with self._lock:
            scoreboard_data = self._scoreboard_cache
            if not scoreboard_data or not scoreboard_data.scoreboard:
                return
            
            finished_game_ids = [
                game.gameId 
                for game in scoreboard_data.scoreboard.games
                if game.gameStatus == 3  # Final
            ]
            
            removed_count = 0
            for game_id in finished_game_ids:
                if self._playbyplay_cache.get(game_id) is not None:
                    self._playbyplay_cache.remove(game_id)
                    removed_count += 1
                self._active_game_ids.discard(game_id)
            
            if removed_count > 0:
                logger.info(f"Cleaned up {removed_count} finished games from play-by-play cache")
    
    async def _periodic_cleanup(self):
        """
        Periodic cleanup task that runs every 5 minutes.
        
        This prevents memory from growing too large by removing old data that's no longer needed.
        Finished games are cleaned up immediately, but this catches any edge cases.
        """
        logger.info("Periodic cache cleanup started")
        
        while True:
            try:
                await asyncio.sleep(self.CLEANUP_INTERVAL)
                
                # Clean up finished games (in case they weren't caught immediately)
                await self._cleanup_finished_games()
                
                # Remove games older than 24 hours (safety net for any games that slipped through)
                async with self._lock:
                    removed = self._playbyplay_cache.clear_old_entries(max_age_seconds=86400)  # 24 hours
                    if removed > 0:
                        logger.info(f"Removed {removed} old games (older than 24 hours) from play-by-play cache")
                
            except asyncio.CancelledError:
                logger.info("Periodic cache cleanup cancelled")
                raise
            except Exception as e:
                logger.error(f"Error in periodic cache cleanup: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
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
                        # Save the old list of active games so we can detect when games finish
                        old_active_games = self._active_game_ids.copy()
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
                            
                            # Check if any games finished (were active, now not in active list)
                            # This happens when a game goes from status 2 (In Progress) to 3 (Final)
                            finished_games = old_active_games - self._active_game_ids
                            if finished_games:
                                # Clean up finished games immediately to free memory
                                for game_id in finished_games:
                                    self._playbyplay_cache.remove(game_id)
                                logger.info(f"Immediately cleaned up {len(finished_games)} finished games from play-by-play cache")
                    
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
                # Clean up finished games before polling
                await self._cleanup_finished_games()
                
                async with self._lock:
                    games_to_poll = list(self._active_game_ids)
                
                for game_id in games_to_poll:
                    # Double-check game is still active before polling
                    async with self._lock:
                        scoreboard_data = self._scoreboard_cache
                        if scoreboard_data and scoreboard_data.scoreboard:
                            game = next(
                                (g for g in scoreboard_data.scoreboard.games if g.gameId == game_id),
                                None
                            )
                            # Skip if game is finished
                            if not game or game.gameStatus != 2:
                                self._playbyplay_cache.remove(game_id)
                                self._active_game_ids.discard(game_id)
                                continue
                    
                    try:
                        playbyplay_data = await asyncio.wait_for(
                            getPlayByPlay(game_id),
                            timeout=10.0
                        )
                        
                        async with self._lock:
                            # Only cache if game is still active
                            scoreboard_data = self._scoreboard_cache
                            if scoreboard_data and scoreboard_data.scoreboard:
                                game = next(
                                    (g for g in scoreboard_data.scoreboard.games if g.gameId == game_id),
                                    None
                                )
                                if game and game.gameStatus == 2:
                                    self._playbyplay_cache.set(game_id, playbyplay_data)
                                    logger.debug(f"Play-by-play cache updated for game {game_id}")
                                else:
                                    logger.debug(f"Skipping cache update for finished game {game_id}")
                        
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
        
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("Started periodic cache cleanup")
    
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
        
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Data cache polling stopped")


# Single global instance used by the whole app
data_cache = DataCache()
