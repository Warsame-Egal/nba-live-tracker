"""Tests for batched insights cache behavior."""

import time

from app.services.batched_insights import BatchedInsightsCache


def test_cache_hit_returns_data():
    cache = BatchedInsightsCache()
    cache.set_batched_insights("key1", {"insights": []})
    result = cache.get_batched_insights("key1")
    assert result is not None
    assert "insights" in result


def test_cache_miss_returns_none():
    cache = BatchedInsightsCache()
    assert cache.get_batched_insights("nonexistent") is None


def test_cache_expires_after_ttl():
    cache = BatchedInsightsCache()
    cache.cache_ttl = 0.01  # 10ms for testing
    cache.set_batched_insights("key1", {"insights": []})
    time.sleep(0.02)
    assert cache.get_batched_insights("key1") is None


def test_cache_lru_eviction():
    cache = BatchedInsightsCache()
    cache.batched_insights_max_size = 2
    cache.set_batched_insights("k1", {"insights": []})
    cache.set_batched_insights("k2", {"insights": []})
    cache.set_batched_insights("k3", {"insights": []})
    assert cache.get_batched_insights("k1") is None
    assert cache.get_batched_insights("k2") is not None
    assert cache.get_batched_insights("k3") is not None


def test_lead_change_detection():
    cache = BatchedInsightsCache()
    result = cache.detect_lead_change("game1", 55, 50)
    assert result is False
    cache.last_scores["game1"] = (55, 50)
    result = cache.detect_lead_change("game1", 55, 58)
    assert result is True
