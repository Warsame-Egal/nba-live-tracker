"""
AI response cache with semantic deduplication. Normalizes questions (strip punctuation,
lowercase, sort words) so similar questions hit the same entry. LRU, configurable TTL.
"""

import hashlib
import re
import time
from collections import deque
from threading import Lock
from typing import Any, Optional


def normalize_question(question: str) -> str:
    """
    Normalize for cache key so "Who is playing best tonight?" and
    "which player is performing best right now" map to the same key.
    """
    clean = re.sub(r"[^\w\s]", "", question.lower()).strip()
    words = sorted(clean.split()) if clean else []
    return hashlib.md5(" ".join(words).encode()).hexdigest()


def _ttl_for_question(question: str) -> int:
    """120s for live/general, 300s for standings/leaders (less volatile)."""
    q = question.lower()
    if "standing" in q or "standings" in q or "leader" in q or "leaders" in q:
        return 300
    return 120


class AIResponseCache:
    """
    In-memory LRU cache for AI responses. Keys are normalized question hashes.
    Entries have per-item TTL (120s live, 300s standings/leaders).
    """

    def __init__(self, max_size: int = 200):
        self._max_size = max_size
        self._cache: dict[str, tuple[dict[str, Any], float]] = {}  # key -> (value, expiry_ts)
        self._order: deque[str] = deque()
        self._hits = 0
        self._misses = 0
        self._lock = Lock()

    def get(self, key: str) -> Optional[dict[str, Any]]:
        """Return cached response if present and not expired."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                return None
            value, expiry = entry
            if time.time() > expiry:
                del self._cache[key]
                try:
                    self._order.remove(key)
                except ValueError:
                    pass
                self._misses += 1
                return None
            self._hits += 1
            self._touch(key)
            return value.copy()

    def _touch(self, key: str) -> None:
        """Move key to end of LRU order."""
        try:
            self._order.remove(key)
        except ValueError:
            pass
        self._order.append(key)

    def set(self, key: str, value: dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        """Store response; ttl_seconds defaults to 120."""
        ttl = ttl_seconds if ttl_seconds is not None else 120
        expiry = time.time() + ttl
        with self._lock:
            if key in self._cache:
                self._touch(key)
            else:
                while len(self._cache) >= self._max_size and self._order:
                    evict = self._order.popleft()
                    if evict in self._cache:
                        del self._cache[evict]
                self._cache[key] = (value.copy(), expiry)
                self._order.append(key)

    def get_for_question(self, question: str) -> Optional[dict[str, Any]]:
        """Look up by raw question (normalizes internally)."""
        return self.get(normalize_question(question))

    def set_for_question(self, question: str, value: dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        """Store by raw question. TTL defaults to 120 or 300 for standings/leaders."""
        key = normalize_question(question)
        ttl = ttl_seconds if ttl_seconds is not None else _ttl_for_question(question)
        self.set(key, value, ttl_seconds=ttl)

    def stats(self) -> dict[str, Any]:
        """Hit rate and size for observability."""
        with self._lock:
            total = self._hits + self._misses
            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_pct": round(100 * self._hits / total, 1) if total else 0,
            }


# Global singleton for agent (and other AI) response cache
_agent_response_cache: Optional[AIResponseCache] = None


def get_agent_response_cache() -> AIResponseCache:
    global _agent_response_cache
    if _agent_response_cache is None:
        _agent_response_cache = AIResponseCache(max_size=200)
    return _agent_response_cache
