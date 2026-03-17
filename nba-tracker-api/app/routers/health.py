"""
Health and observability endpoint.

Returns cache stats, polling status, WebSocket connection counts, Groq usage,
and uptime. Every component is wrapped in try/except so this endpoint never throws.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["health"])
_app_start_time = time.time()


@router.get("/health")
async def health():
    try:
        from app.services.data_cache import data_cache
        from app.services.websockets_manager import (
            playbyplay_websocket_manager,
            scoreboard_websocket_manager,
        )
        from app.services.groq_client import GROQ_AVAILABLE, get_groq_rate_limiter
        from app.config import get_groq_api_key
    except Exception:
        return _minimal_health()

    try:
        cache_stats = data_cache.get_health_stats()
    except Exception:
        cache_stats = {
            "scoreboard_cached": False,
            "scoreboard_age_seconds": None,
            "playbyplay_games_cached": 0,
            "playbyplay_cache_max_size": 20,
            "active_games_tracked": 0,
            "scoreboard_task_running": False,
            "playbyplay_task_running": False,
        }

    try:
        groq_stats = get_groq_rate_limiter().get_stats() if GROQ_AVAILABLE else {}
    except Exception:
        groq_stats = {}

    try:
        groq_configured = get_groq_api_key() is not None
    except Exception:
        groq_configured = False

    try:
        scoreboard_connections = scoreboard_websocket_manager.get_connection_count()
    except Exception:
        scoreboard_connections = 0

    try:
        playbyplay_connections_by_game = playbyplay_websocket_manager.get_connection_stats()
    except Exception:
        playbyplay_connections_by_game = {}

    try:
        from app.services.predictions import _predictions_cache
        from app.services.predictions import PREDICTIONS_CACHE_MAX_SIZE
    except Exception:
        _predictions_cache = {}
        PREDICTIONS_CACHE_MAX_SIZE = 100

    try:
        from app.services.win_probability import _win_probability_cache
    except Exception:
        _win_probability_cache = {}

    try:
        from app.services.key_moments import _key_moments_cache, _moment_context_cache
    except Exception:
        _key_moments_cache = {}
        _moment_context_cache = {}

    try:
        predictions_cached_entries = len(_predictions_cache)
        win_probability_cached_games = len(_win_probability_cache)
        moment_contexts_cached = len(_moment_context_cache)
        key_moments_games_tracked = len(_key_moments_cache)
    except Exception:
        predictions_cached_entries = 0
        win_probability_cached_games = 0
        moment_contexts_cached = 0
        key_moments_games_tracked = 0

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - _app_start_time),
        "polling": {
            "scoreboard": {
                "status": "running" if cache_stats.get("scoreboard_task_running") else "stopped",
                "last_updated_seconds_ago": cache_stats.get("scoreboard_age_seconds"),
                "poll_interval_seconds": data_cache.SCOREBOARD_POLL_INTERVAL,
            },
            "playbyplay": {
                "status": "running" if cache_stats.get("playbyplay_task_running") else "stopped",
                "active_games_tracked": cache_stats.get("active_games_tracked", 0),
                "poll_interval_seconds": data_cache.PLAYBYPLAY_POLL_INTERVAL,
            },
        },
        "cache": {
            "scoreboard_cached": cache_stats.get("scoreboard_cached", False),
            "scoreboard_age_seconds": cache_stats.get("scoreboard_age_seconds"),
            "playbyplay_games_cached": cache_stats.get("playbyplay_games_cached", 0),
            "playbyplay_cache_max_size": cache_stats.get("playbyplay_cache_max_size", 20),
            "predictions_cached_entries": predictions_cached_entries,
            "predictions_cache_max_size": PREDICTIONS_CACHE_MAX_SIZE,
            "win_probability_cached_games": win_probability_cached_games,
            "moment_contexts_cached": moment_contexts_cached,
            "key_moments_games_tracked": key_moments_games_tracked,
        },
        "websockets": {
            "scoreboard_connections": scoreboard_connections,
            "playbyplay_connections_by_game": playbyplay_connections_by_game,
        },
        "groq": {
            "available": GROQ_AVAILABLE,
            "configured": groq_configured,
            **groq_stats,
        },
        "ai": _health_ai_section(groq_stats),
        "nba_api": {
            "rate_limit_ms": 600,
            "last_call_ms_ago": None,
        },
    }


def _health_ai_section(groq_stats: dict) -> dict:
    """AI pipeline observability: queue depths, cache hit rate, agent metrics, validation failures."""
    try:
        from app.services.ai_queue import AIPriority, get_ai_request_queue
        from app.services.agent_service import get_agent_metrics
        from app.services.structured_groq import get_structured_validation_failures_count
        from app.utils.ai_cache import get_agent_response_cache
    except Exception:
        return {
            "groq_requests_last_minute": groq_stats.get("requests_last_minute", 0),
            "groq_tokens_last_minute": groq_stats.get("tokens_last_minute", 0),
            "agent_requests_today": 0,
            "agent_avg_tools_per_request": 0,
            "cache_hit_rate_pct": 0,
            "structured_validation_failures_today": 0,
            "queue_depths": {"agent": 0, "narrative": 0, "insights": 0, "batch": 0},
        }
    try:
        queue = get_ai_request_queue()
        queue_depths = {
            "agent": queue.queue_depth(AIPriority.AGENT),
            "narrative": queue.queue_depth(AIPriority.NARRATIVE),
            "insights": queue.queue_depth(AIPriority.INSIGHTS),
            "batch": queue.queue_depth(AIPriority.BATCH),
        }
    except Exception:
        queue_depths = {"agent": 0, "narrative": 0, "insights": 0, "batch": 0}
    try:
        agent_metrics = get_agent_metrics()
    except Exception:
        agent_metrics = {"agent_requests_since_start": 0, "agent_avg_tools_per_request": 0}
    try:
        cache_stats = get_agent_response_cache().stats()
        cache_hit_rate_pct = cache_stats.get("hit_rate_pct", 0)
    except Exception:
        cache_hit_rate_pct = 0
    try:
        validation_failures = get_structured_validation_failures_count()
    except Exception:
        validation_failures = 0
    return {
        "groq_requests_last_minute": groq_stats.get("requests_last_minute", 0),
        "groq_tokens_last_minute": groq_stats.get("tokens_last_minute", 0),
        "agent_requests_today": agent_metrics.get("agent_requests_since_start", 0),
        "agent_avg_tools_per_request": agent_metrics.get("agent_avg_tools_per_request", 0),
        "cache_hit_rate_pct": cache_hit_rate_pct,
        "structured_validation_failures_today": validation_failures,
        "queue_depths": queue_depths,
    }


def _minimal_health():
    """Fallback response if any import or early step fails."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - _app_start_time),
        "polling": {"scoreboard": {"status": "unknown"}, "playbyplay": {"status": "unknown"}},
        "cache": {},
        "websockets": {"scoreboard_connections": 0, "playbyplay_connections_by_game": {}},
        "groq": {"available": False, "configured": False},
        "ai": {
            "groq_requests_last_minute": 0,
            "groq_tokens_last_minute": 0,
            "agent_requests_today": 0,
            "agent_avg_tools_per_request": 0,
            "cache_hit_rate_pct": 0,
            "structured_validation_failures_today": 0,
            "queue_depths": {"agent": 0, "narrative": 0, "insights": 0, "batch": 0},
        },
        "nba_api": {"rate_limit_ms": 600, "last_call_ms_ago": None},
    }
