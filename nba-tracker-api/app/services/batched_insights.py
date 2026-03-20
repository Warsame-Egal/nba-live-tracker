"""
Batched AI insights service for live NBA games.
Generates insights for ALL games in ONE Groq API call with caching.
"""

import asyncio
import json
import logging
import time
from collections import OrderedDict
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

from app.services.groq_client import (
    GROQ_AVAILABLE,
    groq_is_ready,
    call_groq_api,
    get_groq_rate_limiter,
)
from app.services.groq_prompts import (
    get_batched_insights_system_message,
    build_batched_insights_prompt,
    get_lead_change_system_message,
    build_lead_change_prompt,
)
from app.config import get_groq_api_key
from app.constants import GAME_STATUS_FINAL
from app.services.data_cache import data_cache
from app.utils.json_recovery import recover_truncated_json

logger = logging.getLogger(__name__)


class BatchedInsightsCache:
    """Cache for batched insights and lead change explanations."""

    def __init__(self):
        self.batched_insights: OrderedDict[str, Tuple[Dict, float]] = OrderedDict()  # cache_key -> (data, timestamp)
        self.lead_change_cache: OrderedDict[str, Tuple[Dict, float]] = OrderedDict()  # game_id -> (data, timestamp)
        self.last_scores: Dict[str, Tuple[int, int]] = {}  # game_id -> (home_score, away_score)
        self.cache_ttl = 60.0  # 60 seconds TTL
        self.batched_insights_max_size = 50  # Maximum 50 cached insight batches
        self.lead_change_cache_max_size = 20  # Maximum 20 games (matches play-by-play cache)

    def get_batched_insights(self, cache_key: str) -> Optional[Dict]:
        """Get cached batched insights if still valid."""
        if cache_key in self.batched_insights:
            data, timestamp = self.batched_insights[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                self.batched_insights.move_to_end(cache_key)  # LRU
                return data
            self.batched_insights.pop(cache_key, None)
        return None

    def set_batched_insights(self, cache_key: str, data: Dict):
        """Cache batched insights with size limit enforcement."""
        self.batched_insights[cache_key] = (data, time.time())
        self.batched_insights.move_to_end(cache_key)

        if len(self.batched_insights) > self.batched_insights_max_size:
            oldest_key = next(iter(self.batched_insights))
            self.batched_insights.pop(oldest_key, None)
            logger.debug(f"Batched insights cache size limit: removed entry {oldest_key}")

    def get_lead_change_explanation(self, game_id: str) -> Optional[Dict]:
        """Get cached lead change explanation if still valid."""
        if game_id in self.lead_change_cache:
            data, timestamp = self.lead_change_cache[game_id]
            if time.time() - timestamp < self.cache_ttl:
                self.lead_change_cache.move_to_end(game_id)
                return data
            self.lead_change_cache.pop(game_id, None)
        return None

    def set_lead_change_explanation(self, game_id: str, data: Dict):
        """Cache lead change explanation with size limit enforcement."""
        self.lead_change_cache[game_id] = (data, time.time())
        self.lead_change_cache.move_to_end(game_id)

        if len(self.lead_change_cache) > self.lead_change_cache_max_size:
            oldest_key = next(iter(self.lead_change_cache))
            self.lead_change_cache.pop(oldest_key, None)
            logger.debug(f"Lead change cache size limit: removed entry {oldest_key}")

    def detect_lead_change(self, game_id: str, home_score: int, away_score: int) -> bool:
        """Detect if lead changed and update tracking."""
        if game_id in self.last_scores:
            old_home, old_away = self.last_scores[game_id]
            old_leader = "home" if old_home > old_away else ("away" if old_away > old_home else "tie")
            new_leader = "home" if home_score > away_score else ("away" if away_score > home_score else "tie")

            if old_leader != new_leader and old_leader != "tie" and new_leader != "tie":
                # Lead changed - invalidate cache
                if game_id in self.lead_change_cache:
                    del self.lead_change_cache[game_id]
                self.last_scores[game_id] = (home_score, away_score)
                return True

        self.last_scores[game_id] = (home_score, away_score)
        return False

    def get_previous_scores(self, game_id: str) -> Optional[Tuple[int, int]]:
        """Get previous scores for a game if available."""
        return self.last_scores.get(game_id)

    async def cleanup_finished_games(self):
        """Remove finished games from all caches."""
        try:
            scoreboard_data = await data_cache.get_scoreboard()
            if not scoreboard_data or not scoreboard_data.scoreboard:
                return

            finished_game_ids = [
                game.gameId for game in scoreboard_data.scoreboard.games if game.gameStatus == GAME_STATUS_FINAL
            ]

            removed_insights = 0
            removed_lead_changes = 0
            removed_scores = 0

            for game_id in finished_game_ids:
                # Remove from batched insights (check all keys)
                keys_to_remove = [key for key in self.batched_insights.keys() if game_id in key]
                for key in keys_to_remove:
                    self.batched_insights.pop(key, None)
                    removed_insights += 1

                # Remove from lead change cache
                if game_id in self.lead_change_cache:
                    self.lead_change_cache.pop(game_id, None)
                    removed_lead_changes += 1

                # Remove from last_scores
                if game_id in self.last_scores:
                    self.last_scores.pop(game_id, None)
                    removed_scores += 1

            if removed_insights > 0 or removed_lead_changes > 0 or removed_scores > 0:
                logger.info(
                    f"Cleaned up finished games: {removed_insights} insights, "
                    f"{removed_lead_changes} lead changes, {removed_scores} scores"
                )
        except Exception as e:
            logger.error(f"Error cleaning up finished games in batched insights cache: {e}")

    async def cleanup(self):
        """Remove expired entries and finished games from all caches."""
        self.cleanup_expired_entries()
        await self.cleanup_finished_games()

    def cleanup_expired_entries(self):
        """Remove expired entries from all caches (not just on access)."""
        current_time = time.time()

        # Clean batched insights
        expired_insights = [
            key for key, (_, timestamp) in self.batched_insights.items() if current_time - timestamp > self.cache_ttl
        ]
        for key in expired_insights:
            self.batched_insights.pop(key, None)

        # Clean lead change cache
        expired_lead_changes = [
            game_id
            for game_id, (_, timestamp) in self.lead_change_cache.items()
            if current_time - timestamp > self.cache_ttl
        ]
        for game_id in expired_lead_changes:
            self.lead_change_cache.pop(game_id, None)

        if expired_insights or expired_lead_changes:
            logger.debug(
                f"Cleaned up {len(expired_insights)} expired insights, "
                f"{len(expired_lead_changes)} expired lead changes"
            )


_insights_cache = BatchedInsightsCache()
_last_cleanup_time: float = 0.0
_INSIGHTS_CACHE_CLEANUP_MIN_INTERVAL_SECONDS = 120.0  # avoid cleanup on every request


async def generate_batched_insights(games: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate insights for ALL live games in ONE Groq API call.

    Args:
        games: List of game dictionaries with UI-visible data:
            - game_id
            - home_team
            - away_team
            - home_score
            - away_score
            - quarter
            - time_remaining
            - win_prob_home
            - win_prob_away
            - last_event (optional)

    Returns:
        Dict with timestamp and insights list
    """
    if not games:
        return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}

    # Create cache key from game IDs and scores
    cache_key_parts = []
    for game in games:
        game_id = game.get("game_id", "")
        home_score = game.get("home_score", 0)
        away_score = game.get("away_score", 0)
        cache_key_parts.append(f"{game_id}:{home_score}-{away_score}")
    cache_key = "|".join(sorted(cache_key_parts))

    # Cleanup can be a bit expensive; gate it so we run it periodically instead
    # of for every scoreboard broadcast/request.
    now = time.time()
    if now - _last_cleanup_time >= _INSIGHTS_CACHE_CLEANUP_MIN_INTERVAL_SECONDS:
        _last_cleanup_time = now
        await _insights_cache.cleanup()

    # Check cache
    cached = _insights_cache.get_batched_insights(cache_key)
    if cached:
        logger.debug(f"Returning cached batched insights for {len(games)} games")
        return cached

    if not groq_is_ready():
        logger.debug("Groq not available or not configured for batched insights")
        return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}

    groq_api_key = get_groq_api_key()

    try:
        # Build prompt
        prompt = build_batched_insights_prompt(games)
        system_message = get_batched_insights_system_message()

        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter(),
                    max_tokens=800,
                ),
                timeout=10.0,  # 10 second timeout for batched insights
            )
        except asyncio.TimeoutError:
            logger.warning("Batched insights generation timeout")
            return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}

        # Parse response
        content = response.get("content", "")
        logger.debug(f"Groq raw response content (first 1000 chars): {content[:1000]}")

        parsed_data = recover_truncated_json(content)
        logger.debug(f"Extracted JSON content (first 1000 chars): {content[:1000]}")

        if parsed_data is None:
            logger.warning("JSON recovery failed, using empty insights")
            insights_data = {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}
        elif isinstance(parsed_data, list):
            if len(parsed_data) > 0 and isinstance(parsed_data[0], dict):
                insights_data = parsed_data[0]
                logger.debug(f"Using first item from list: {insights_data}")
            else:
                insights_data = {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}
        elif isinstance(parsed_data, dict):
            insights_data = parsed_data
            if "insights" in insights_data:
                logger.debug(f"Insights array length: {len(insights_data.get('insights', []))}")
        else:
            insights_data = {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}

        # Validate and format response
        if isinstance(insights_data, dict):
            # Ensure timestamp is present
            if "timestamp" not in insights_data:
                insights_data["timestamp"] = datetime.utcnow().isoformat() + "Z"

            # Ensure insights list exists
            if "insights" not in insights_data:
                insights_data["insights"] = []

            # Validate each insight
            validated_insights = []
            for insight in insights_data["insights"]:
                if isinstance(insight, dict) and "game_id" in insight:
                    # Ensure type and text exist
                    if "type" not in insight:
                        insight["type"] = "none"
                    if "text" not in insight:
                        insight["text"] = ""
                    validated_insights.append(insight)

            insights_data["insights"] = validated_insights

            # Cache the result
            _insights_cache.set_batched_insights(cache_key, insights_data)

            logger.info(
                f"Generated batched insights for {len(games)} games, {len(validated_insights)} insights returned"
            )
            return insights_data

        return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Groq JSON response for batched insights: {e}")
        return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}
    except Exception as e:
        logger.warning(f"Error generating batched insights: {e}")
        return {"timestamp": datetime.utcnow().isoformat() + "Z", "insights": []}


async def generate_lead_change_explanation(
    game_id: str,
    home_team: str,
    away_team: str,
    previous_home_score: int,
    previous_away_score: int,
    current_home_score: int,
    current_away_score: int,
    last_5_plays: List[Dict[str, Any]],
    quarter: int,
    time_remaining: str,
) -> Optional[Dict[str, Any]]:
    """
    Generate on-demand lead change explanation.
    Cached for 60 seconds per game.

    Args:
        game_id: Game ID
        home_team: Home team name
        away_team: Away team name
        previous_home_score: Previous home score
        previous_away_score: Previous away score
        current_home_score: Current home score
        current_away_score: Current away score
        last_5_plays: Last 5 play dictionaries
        quarter: Current quarter
        time_remaining: Time remaining in quarter

    Returns:
        Dict with summary and key_factors, or None if error
    """
    # Detect if the lead changed; this may invalidate cached explanations.
    lead_changed = _insights_cache.detect_lead_change(game_id, current_home_score, current_away_score)

    # Always check cache after invalidation.
    cached = _insights_cache.get_lead_change_explanation(game_id)
    if cached:
        logger.debug(f"Returning cached lead change explanation for game {game_id}")
        return cached

    # Only generate new explanation if lead actually changed.
    if not lead_changed:
        return None

    # Check if Groq is available
    if not GROQ_AVAILABLE:
        logger.debug("Groq not available for lead change explanation")
        return None

    groq_api_key = get_groq_api_key()
    try:
        # Build prompt
        prompt = build_lead_change_prompt(
            game_id=game_id,
            home_team=home_team,
            away_team=away_team,
            previous_home_score=previous_home_score,
            previous_away_score=previous_away_score,
            current_home_score=current_home_score,
            current_away_score=current_away_score,
            last_5_plays=last_5_plays,
            quarter=quarter,
            time_remaining=time_remaining,
        )

        system_message = get_lead_change_system_message()

        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter(),
                    max_tokens=200,
                ),
                timeout=5.0,  # 5 second timeout for lead change explanation
            )
        except asyncio.TimeoutError:
            logger.warning(f"Lead change explanation timeout for game {game_id}")
            return None

        # Parse response
        content = response["content"]
        explanation_data = recover_truncated_json(content)

        if explanation_data is None or not isinstance(explanation_data, dict):
            return None

        # Validate response
        if "game_id" in explanation_data:
            # Ensure required fields exist
            if "summary" not in explanation_data:
                explanation_data["summary"] = ""
            if "key_factors" not in explanation_data:
                explanation_data["key_factors"] = []

            # Cache the result
            _insights_cache.set_lead_change_explanation(game_id, explanation_data)

            logger.debug(f"Generated lead change explanation for game {game_id}")
            return explanation_data

        return None

    except Exception as e:
        logger.warning(f"Error generating lead change explanation for game {game_id}: {e}")
        return None
