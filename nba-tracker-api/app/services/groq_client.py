import asyncio
import logging
import re
import time
from collections import deque
from typing import Optional

from app.config import get_groq_api_key

logger = logging.getLogger(__name__)

# Try to import AsyncGroq; fall back to availability flag if not present
try:
    from groq import AsyncGroq

    GROQ_AVAILABLE = True
except ImportError:
    AsyncGroq = None  # type: ignore
    GROQ_AVAILABLE = False
    logger.warning("Groq library not available. AI insights will use fallback method.")

_groq_client = None
_groq_client_api_key: Optional[str] = None


def get_groq_client(api_key: str):
    """Return a module-level AsyncGroq client (singleton per api_key)."""
    global _groq_client, _groq_client_api_key
    if _groq_client is None or _groq_client_api_key != api_key:
        if AsyncGroq is None:
            raise ImportError("Groq library not available")
        _groq_client = AsyncGroq(api_key=api_key)
        _groq_client_api_key = api_key
    return _groq_client


def groq_is_ready() -> bool:
    """Return True if Groq is available and configured."""
    return bool(GROQ_AVAILABLE and get_groq_api_key())


class GroqRateLimiter:
    """Rate limiter for Groq API calls to respect RPM and TPM limits."""

    def __init__(
        self, max_requests_per_minute: int = 28, max_tokens_per_minute: int = 5800, tokens_per_request: int = 1000
    ):
        """
        Initialize Groq rate limiter.

        Args:
            max_requests_per_minute: Maximum requests allowed per minute (default 28, conservative)
            max_tokens_per_minute: Maximum tokens allowed per minute (default 5800, conservative)
            tokens_per_request: Estimated tokens per request (default 1000)
        """
        self.max_requests_per_minute = max_requests_per_minute
        self.max_tokens_per_minute = max_tokens_per_minute
        self.tokens_per_request = tokens_per_request
        self.request_history: deque = deque()  # timestamps
        self.token_history: deque = deque()  # (timestamp, tokens_used)
        self._lock = asyncio.Lock()

    async def wait_if_needed(self, estimated_tokens: int = None):
        """
        Wait if we're approaching the rate limit.
        Uses rolling 60-second windows to track both RPM and TPM.

        Args:
            estimated_tokens: Estimated tokens for this request (defaults to self.tokens_per_request)
        """
        if estimated_tokens is None:
            estimated_tokens = self.tokens_per_request

        async with self._lock:
            current_time = time.time()

            # Remove entries older than 60 seconds (rolling window)
            # We only care about requests/tokens in the last minute
            while self.request_history and current_time - self.request_history[0] > 60:
                self.request_history.popleft()
            while self.token_history and current_time - self.token_history[0][0] > 60:
                self.token_history.popleft()

            # Calculate how many requests and tokens we've used in the last 60 seconds
            requests_used = len(self.request_history)
            tokens_used = sum(tokens for _, tokens in self.token_history)

            # Check if we need to wait (either limit would be exceeded)
            wait_time = 0

            # Check RPM limit - wait if we're at 90% of limit
            # We wait until the oldest request is 60 seconds old (so it falls out of the window)
            if requests_used >= int(self.max_requests_per_minute * 0.9):
                if self.request_history:
                    oldest_time = self.request_history[0]
                    # Wait until oldest request is 60 seconds old, plus 1 second buffer
                    wait_time = max(wait_time, 60 - (current_time - oldest_time) + 1)

            # Check TPM limit - wait if we're at 85% of limit (more conservative for tokens)
            # Same logic: wait until oldest token usage is 60 seconds old
            if tokens_used + estimated_tokens > int(self.max_tokens_per_minute * 0.85):
                if self.token_history:
                    oldest_time = self.token_history[0][0]
                    # Wait until oldest token usage is 60 seconds old, plus 2 second buffer
                    wait_time = max(wait_time, 60 - (current_time - oldest_time) + 2)

            # Wait if needed
            if wait_time > 0:
                logger.debug(
                    f"Groq rate limit: waiting {wait_time:.1f}s (RPM: {requests_used}/{self.max_requests_per_minute}, TPM: {tokens_used}/{self.max_tokens_per_minute})"
                )
                await asyncio.sleep(wait_time)
                # Clean up again after waiting
                current_time = time.time()
                while self.request_history and current_time - self.request_history[0] > 60:
                    self.request_history.popleft()
                while self.token_history and current_time - self.token_history[0][0] > 60:
                    self.token_history.popleft()

            # Record this request (we'll update with actual tokens after the call)
            self.request_history.append(time.time())
            self.token_history.append((time.time(), estimated_tokens))

    async def update_token_usage(self, actual_tokens: int):
        """
        Update the last request's token count with actual usage from Groq response.

        Args:
            actual_tokens: Actual tokens used (prompt + completion)
        """
        async with self._lock:
            if self.token_history:
                # Update the most recent entry with actual token count
                timestamp = self.token_history[-1][0]
                self.token_history[-1] = (timestamp, actual_tokens)

    def get_stats(self) -> dict:
        """Return rate limit stats for the health endpoint (rolling 60-second window)."""
        try:
            current_time = time.time()
            cutoff = current_time - 60
            requests_last_minute = sum(1 for t in self.request_history if t > cutoff)
            tokens_last_minute = sum(tokens for ts, tokens in self.token_history if ts > cutoff)
            return {
                "requests_last_minute": requests_last_minute,
                "tokens_last_minute": tokens_last_minute,
                "rate_limit_rpm": self.max_requests_per_minute,
                "rate_limit_tpm": self.max_tokens_per_minute,
            }
        except Exception:
            return {
                "requests_last_minute": 0,
                "tokens_last_minute": 0,
                "rate_limit_rpm": self.max_requests_per_minute,
                "rate_limit_tpm": self.max_tokens_per_minute,
            }


# Global Groq rate limiter instance
# Conservative limits: 20 RPM (below 30) and 5500 TPM (below 6000, leaves 500 buffer)
# Token estimation increased to 2000 to account for larger batched requests
_groq_rate_limiter = GroqRateLimiter(max_requests_per_minute=20, max_tokens_per_minute=5500, tokens_per_request=2000)


async def _raw_groq_call(
    api_key: str,
    system_message: str,
    user_prompt: str,
    rate_limiter: GroqRateLimiter,
    max_tokens: int,
) -> dict:
    """Execute one Groq chat completion (no queue). Used by call_groq_api after queue dispatch."""
    await rate_limiter.wait_if_needed()
    client = get_groq_client(api_key)
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_prompt}],
            temperature=0.3,
            max_tokens=max_tokens,
        )
    except Exception as groq_error:
        error_str = str(groq_error)
        if "429" in error_str or "rate_limit" in error_str.lower() or "Rate limit" in error_str:
            wait_time = None
            if "try again in" in error_str.lower():
                match = re.search(r"try again in ([\d.]+)s", error_str.lower())
                if match:
                    wait_time = float(match.group(1)) + 1
            if wait_time:
                logger.warning(f"Groq rate limit exceeded. Waiting {wait_time:.1f}s as specified by API...")
                await asyncio.sleep(wait_time)
                try:
                    response = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[
                            {"role": "system", "content": system_message},
                            {"role": "user", "content": user_prompt},
                        ],
                        temperature=0.3,
                        max_tokens=max_tokens,
                    )
                except Exception as retry_error:
                    logger.warning(f"Groq rate limit retry failed: {retry_error}")
                    raise
            else:
                logger.warning("Groq rate limit exceeded after retries")
                raise
        raise

    if hasattr(response, "usage") and response.usage:
        actual_tokens = getattr(response.usage, "total_tokens", None)
        if actual_tokens:
            await rate_limiter.update_token_usage(actual_tokens)

    content = response.choices[0].message.content.strip()
    usage = {
        "total_tokens": (
            getattr(response.usage, "total_tokens", None) if hasattr(response, "usage") and response.usage else None
        )
    }
    return {"content": content, "usage": usage}


async def call_groq_api(
    api_key: str,
    system_message: str,
    user_prompt: str,
    rate_limiter: Optional[GroqRateLimiter] = None,
    max_tokens: int = 300,
    priority: int = 4,
) -> dict:
    """
    Call Groq API to generate insights. All calls are run through the AI request queue;
    lower priority number runs first (1=AGENT, 2=NARRATIVE, 3=INSIGHTS, 4=BATCH).

    Args:
        api_key: Groq API key
        system_message: System message for the LLM
        user_prompt: User prompt with game data
        rate_limiter: Rate limiter instance (defaults to global _groq_rate_limiter)
        max_tokens: Max tokens for the completion
        priority: Queue priority (default 4 = BATCH). Use 1 for agent requests.

    Returns:
        dict: Response from Groq API with 'content' and 'usage' keys
    """
    if not GROQ_AVAILABLE:
        raise ImportError("Groq library not available")

    limiter = rate_limiter if rate_limiter is not None else _groq_rate_limiter
    return await _raw_groq_call(api_key, system_message, user_prompt, limiter, max_tokens)


def get_groq_rate_limiter() -> GroqRateLimiter:
    """Get the global Groq rate limiter instance."""
    return _groq_rate_limiter
