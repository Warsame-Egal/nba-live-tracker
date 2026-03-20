"""Tests for rate_limit() enforcing minimum delay between calls."""

import asyncio
import time

from app.utils.rate_limiter import rate_limit


def test_rate_limit_enforces_minimum_delay():
    """Two back-to-back calls should be separated by at least ~500ms."""
    from app.utils import rate_limiter as rl

    rl._last_call_time = None  # reset state
    asyncio.run(rate_limit())
    t1 = time.monotonic()
    asyncio.run(rate_limit())
    t2 = time.monotonic()
    assert (t2 - t1) >= 0.5


def test_rate_limit_no_wait_when_enough_time_passed():
    """If enough time has passed since last call, no wait should happen."""
    from app.utils import rate_limiter as rl

    rl._last_call_time = time.time() - 2.0  # 2 seconds ago
    t1 = time.monotonic()
    asyncio.run(rate_limit())
    t2 = time.monotonic()
    assert (t2 - t1) < 0.1


def test_rate_limit_concurrent_safety():
    """Concurrent calls should not all pass simultaneously."""
    from app.utils import rate_limiter as rl

    rl._last_call_time = None
    timestamps = []

    async def call_and_record():
        await rate_limit()
        timestamps.append(time.monotonic())

    async def run_calls():
        await asyncio.gather(*[call_and_record() for _ in range(3)])

    asyncio.run(run_calls())
    timestamps.sort()
    assert timestamps[-1] - timestamps[0] >= 1.0
