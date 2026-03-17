"""
Simple TTL cache for the compare pipeline.
Interface: get(key) -> value | None, set(key, value, ttl_seconds=int).
Max size with oldest-entry eviction to avoid unbounded growth.
"""

import time
from typing import Any, Dict, Tuple


class CompareCache:
    """In-memory TTL cache for comparison pipeline data."""

    MAX_SIZE = 500

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Any:
        if key not in self._store:
            return None
        val, expiry = self._store[key]
        if time.time() > expiry:
            del self._store[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        if len(self._store) >= self.MAX_SIZE:
            oldest_key = next(iter(self._store))
            del self._store[oldest_key]
        self._store[key] = (value, time.time() + ttl_seconds)
