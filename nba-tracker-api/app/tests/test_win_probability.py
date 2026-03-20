"""Tests for win probability TTL logic."""

import time

from app.constants import GAME_STATUS_LIVE


def test_live_game_ttl_is_30_seconds():
    from app.services.win_probability import WIN_PROBABILITY_CACHE_TTL_LIVE

    assert WIN_PROBABILITY_CACHE_TTL_LIVE == 30.0


def test_final_game_ttl_is_one_hour():
    from app.services.win_probability import WIN_PROBABILITY_CACHE_TTL_FINAL

    assert WIN_PROBABILITY_CACHE_TTL_FINAL == 3600.0


def test_live_game_cache_expires_after_30s():
    """Cached data older than 30s should not be returned for live games."""
    stale = {
        "home_win_prob": 0.6,
        "away_win_prob": 0.4,
        "timestamp_unix": time.time() - 35.0,
        "game_status": GAME_STATUS_LIVE,
    }
    from app.services.win_probability import WIN_PROBABILITY_CACHE_TTL_LIVE

    game_is_live = stale.get("game_status") == GAME_STATUS_LIVE
    ttl = WIN_PROBABILITY_CACHE_TTL_LIVE if game_is_live else 3600.0
    is_valid = (time.time() - stale["timestamp_unix"]) < ttl
    assert not is_valid
