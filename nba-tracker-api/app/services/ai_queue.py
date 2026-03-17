"""
AI request priority queue. Route Groq (and other AI) calls through a single queue
so agent requests are served before batch jobs and rate limits are respected.
"""

import asyncio
import heapq
import logging
from enum import IntEnum
from typing import Any, Awaitable, Coroutine, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AIPriority(IntEnum):
    AGENT = 1
    NARRATIVE = 2
    INSIGHTS = 3
    BATCH = 4


def get_ai_request_queue() -> "AIRequestQueue":
    """Return the global AI request queue (lazy singleton)."""
    global _ai_request_queue
    if _ai_request_queue is None:
        _ai_request_queue = AIRequestQueue()
    return _ai_request_queue


_ai_request_queue: "AIRequestQueue | None" = None


class AIRequestQueue:
    """
    Serializes AI requests by priority. Lower AIPriority value runs first.
    One request runs at a time; callers await the returned future for the result.
    """

    def __init__(self) -> None:
        self._heap: list[tuple[int, int, Awaitable[Any], asyncio.Future[Any]]] = []
        self._counter = 0
        self._event = asyncio.Event()
        self._worker_started = False
        self._lock = asyncio.Lock()

    async def run(
        self,
        priority: AIPriority,
        coro: Coroutine[Any, Any, T],
    ) -> T:
        """
        Submit an AI request with the given priority. Returns when the coroutine
        has been run and its result is available. Lower priority number = runs first.
        """
        loop = asyncio.get_running_loop()
        future: asyncio.Future[T] = loop.create_future()
        async with self._lock:
            self._counter += 1
            heapq.heappush(
                self._heap,
                (int(priority), self._counter, coro, future),
            )
            if not self._worker_started:
                self._worker_started = True
                asyncio.create_task(self._worker())
        self._event.set()
        return await future

    async def _worker(self) -> None:
        while True:
            await self._event.wait()
            self._event.clear()
            while True:
                async with self._lock:
                    if not self._heap:
                        break
                    _, _, coro, future = heapq.heappop(self._heap)
                try:
                    result = await coro
                    if not future.done():
                        future.set_result(result)
                except asyncio.CancelledError:
                    if not future.done():
                        future.cancel()
                    raise
                except Exception as e:
                    logger.exception("AI queue worker error: %s", e)
                    if not future.done():
                        future.set_exception(e)
                async with self._lock:
                    if self._heap:
                        self._event.set()

    def queue_depth(self, priority: AIPriority | None = None) -> int:
        """Return number of pending items; if priority given, only that priority."""
        if priority is None:
            return len(self._heap)
        return sum(1 for p, *_ in self._heap if p == int(priority))
