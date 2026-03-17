"""
Rate limiting utilities for NBA API calls.

The NBA API can throttle or block requests if we make too many calls too quickly.
This module helps prevent that by adding small delays between API calls.

We wait at least 600ms (0.6 seconds) between each call, which is what the
NBA API maintainers recommend to avoid getting blocked.
"""

import asyncio
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Track when we last made an API call
_last_call_time: Optional[float] = None

# Minimum time to wait between API calls (600ms = 0.6 seconds)
# This prevents the NBA API from throttling or blocking our requests
_min_delay_seconds = 0.6


async def rate_limit():
    """
    Wait a bit before making the next NBA API call.

    This function checks when we last made an API call. If it was less than
    600ms ago, we wait until 600ms has passed. This prevents the NBA API
    from throttling or blocking our requests.

    Call this function before every NBA API call to stay within rate limits.
    """
    global _last_call_time

    current_time = time.time()

    # If we've made a call before, check if we need to wait
    if _last_call_time is not None:
        time_since_last_call = current_time - _last_call_time

        # If less than 600ms has passed, wait for the remaining time
        if time_since_last_call < _min_delay_seconds:
            delay = _min_delay_seconds - time_since_last_call
            await asyncio.sleep(delay)

    # Update the last call time to now
    _last_call_time = time.time()


async def safe_api_call(coro, timeout: float = 10.0, max_retries: int = 2):
    """
    Make an NBA API call safely with automatic retries and timeouts.

    This function wraps an API call with:
    - Rate limiting (waits 600ms if needed)
    - Timeout protection (fails after 10 seconds by default)
    - Automatic retries (tries up to 2 more times if it times out)

    Args:
        coro: The API call function to execute
        timeout: How long to wait before giving up (default 10 seconds)
        max_retries: How many times to retry if it times out (default 2)

    Returns:
        The result from the API call

    Raises:
        asyncio.TimeoutError: If the call times out after all retries
        Exception: If the call fails with a non-timeout error
    """
    # Wait before making the call to avoid rate limiting
    await rate_limit()

    last_exception = None

    # Try the call, and retry if it times out
    for attempt in range(max_retries + 1):
        try:
            # Make the API call with a timeout
            result = await asyncio.wait_for(coro, timeout=timeout)
            return result
        except asyncio.TimeoutError as e:
            last_exception = e
            if attempt < max_retries:
                # Wait longer each time we retry (2s, 4s, 6s...)
                wait_time = (attempt + 1) * 2.0
                logger.warning(
                    f"API call timed out (attempt {attempt + 1}/{max_retries + 1}), retrying in {wait_time}s..."
                )
                await asyncio.sleep(wait_time)
                await rate_limit()  # Wait before retrying
            else:
                logger.error(f"API call timed out after {max_retries + 1} attempts")
        except Exception as e:
            # For other errors (not timeouts), don't retry
            # These are usually permanent issues like invalid parameters
            logger.error(f"API call failed: {e}")
            raise

    # If all retries failed, raise the last exception
    raise last_exception
