import asyncio
import logging
import re
import time
from collections import deque
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import Groq, but don't fail if it's not available
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("Groq library not available. AI insights will use fallback method.")


class GroqRateLimiter:
    """Rate limiter for Groq API calls to respect RPM and TPM limits."""
    
    def __init__(self, max_requests_per_minute: int = 28, max_tokens_per_minute: int = 5800, tokens_per_request: int = 1000):
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
            
            # Remove entries older than 60 seconds
            while self.request_history and current_time - self.request_history[0] > 60:
                self.request_history.popleft()
            while self.token_history and current_time - self.token_history[0][0] > 60:
                self.token_history.popleft()
            
            # Calculate requests and tokens used in the last 60 seconds
            requests_used = len(self.request_history)
            tokens_used = sum(tokens for _, tokens in self.token_history)
            
            # Check if we need to wait (either limit would be exceeded)
            wait_time = 0
            
            # Check RPM limit (more conservative: wait if we're at 90% of limit)
            if requests_used >= int(self.max_requests_per_minute * 0.9):
                if self.request_history:
                    oldest_time = self.request_history[0]
                    wait_time = max(wait_time, 60 - (current_time - oldest_time) + 1)
            
            # Check TPM limit (more conservative: wait if we're at 85% of limit to leave more buffer)
            if tokens_used + estimated_tokens > int(self.max_tokens_per_minute * 0.85):
                if self.token_history:
                    oldest_time = self.token_history[0][0]
                    wait_time = max(wait_time, 60 - (current_time - oldest_time) + 2)  # Add 2s buffer
            
            # Wait if needed
            if wait_time > 0:
                logger.debug(f"Groq rate limit: waiting {wait_time:.1f}s (RPM: {requests_used}/{self.max_requests_per_minute}, TPM: {tokens_used}/{self.max_tokens_per_minute})")
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


# Global Groq rate limiter instance
# Conservative limits: 20 RPM (below 30) and 5500 TPM (below 6000, leaves 500 buffer)
# Token estimation increased to 2000 to account for larger batched requests
_groq_rate_limiter = GroqRateLimiter(max_requests_per_minute=20, max_tokens_per_minute=5500, tokens_per_request=2000)


async def call_groq_api(
    api_key: str,
    system_message: str,
    user_prompt: str,
    rate_limiter: Optional[GroqRateLimiter] = None
) -> dict:
    """
    Call Groq API to generate insights.
    
    Args:
        api_key: Groq API key
        system_message: System message for the LLM
        user_prompt: User prompt with game data
        rate_limiter: Rate limiter instance (defaults to global _groq_rate_limiter)
        
    Returns:
        dict: Response from Groq API with 'content' and 'usage' keys
        
    Raises:
        Exception: If API call fails or rate limit is exceeded
    """
    if not GROQ_AVAILABLE:
        raise ImportError("Groq library not available")
    
    if rate_limiter is None:
        rate_limiter = _groq_rate_limiter
    
    # Wait for rate limit before making Groq API call
    await rate_limiter.wait_if_needed()
    
    # Call Groq API asynchronously
    client = Groq(api_key=api_key)
    
    # Use asyncio.to_thread to make the synchronous Groq call async
    # Groq SDK has built-in retry logic, but we still need to handle 429 errors
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": system_message
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.3,
            max_tokens=300,
        )
    except Exception as groq_error:
        # If Groq SDK retries fail, check if it's a rate limit error
        error_str = str(groq_error)
        if "429" in error_str or "rate_limit" in error_str.lower() or "Rate limit" in error_str:
            # Try to extract wait time from error message
            wait_time = None
            if "try again in" in error_str.lower():
                match = re.search(r'try again in ([\d.]+)s', error_str.lower())
                if match:
                    wait_time = float(match.group(1)) + 1  # Add 1 second buffer
            
            if wait_time:
                logger.warning(f"Groq rate limit exceeded. Waiting {wait_time:.1f}s as specified by API...")
                await asyncio.sleep(wait_time)
                # Retry once after waiting
                try:
                    response = await asyncio.to_thread(
                        client.chat.completions.create,
                        model="llama-3.1-8b-instant",
                        messages=[
                            {
                                "role": "system",
                                "content": system_message
                            },
                            {
                                "role": "user",
                                "content": user_prompt
                            }
                        ],
                        temperature=0.3,
                        max_tokens=300,
                    )
                except Exception as retry_error:
                    logger.warning(f"Groq rate limit retry failed: {retry_error}")
                    raise
            else:
                logger.warning(f"Groq rate limit exceeded after retries")
                raise  # Re-raise to be caught by outer exception handler
        raise  # Re-raise other errors
    
    # Update rate limiter with actual token usage from Groq response
    if hasattr(response, 'usage') and response.usage:
        actual_tokens = getattr(response.usage, 'total_tokens', None)
        if actual_tokens:
            await rate_limiter.update_token_usage(actual_tokens)
    
    # Extract content and usage
    content = response.choices[0].message.content.strip()
    usage = {
        'total_tokens': getattr(response.usage, 'total_tokens', None) if hasattr(response, 'usage') and response.usage else None
    }
    
    return {
        'content': content,
        'usage': usage
    }


def get_groq_rate_limiter() -> GroqRateLimiter:
    """Get the global Groq rate limiter instance."""
    return _groq_rate_limiter

