"""Tests for DataCache LRUCache class."""

import time

from app.services.data_cache import LRUCache


def test_lru_cache_evicts_oldest():
    cache = LRUCache(max_size=2)
    cache.set("game1", "data1")
    cache.set("game2", "data2")
    cache.set("game3", "data3")
    assert cache.get("game1") is None
    assert cache.get("game2") is not None
    assert cache.get("game3") is not None


def test_lru_cache_access_prevents_eviction():
    cache = LRUCache(max_size=2)
    cache.set("game1", "data1")
    cache.set("game2", "data2")
    cache.get("game1")
    cache.set("game3", "data3")
    assert cache.get("game1") is not None
    assert cache.get("game2") is None


def test_lru_cache_remove():
    cache = LRUCache(max_size=5)
    cache.set("game1", "data1")
    cache.remove("game1")
    assert cache.get("game1") is None


def test_lru_cache_clear_old_entries():
    cache = LRUCache(max_size=5)
    cache.set("game1", "data1")
    time.sleep(0.01)
    removed = cache.clear_old_entries(max_age_seconds=0.005)
    assert removed == 1
    assert cache.get("game1") is None
