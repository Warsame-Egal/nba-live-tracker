"""
Structured Groq output validator. Call Groq and validate response against a Pydantic schema
with retry on validation failure. Use for all new AI features that expect JSON.
"""

import json
import logging
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel, ValidationError

from app.config import get_groq_api_key
from app.services.groq_client import call_groq_api, get_groq_rate_limiter
from app.utils.json_recovery import recover_truncated_json

logger = logging.getLogger(__name__)

_validation_failures_since_start = 0

T = TypeVar("T", bound=BaseModel)


def get_structured_validation_failures_count() -> int:
    """Number of structured validation failures (all retries exhausted) since process start."""
    return _validation_failures_since_start


async def call_groq_structured(
    system: str,
    prompt: str,
    schema: Type[T],
    max_retries: int = 2,
    max_tokens: int = 800,
) -> Optional[T]:
    """
    Call Groq and validate response against a Pydantic schema.
    On validation failure, retries once with a correction prompt.
    Returns None if all retries fail or JSON cannot be recovered.
    """
    api_key = get_groq_api_key()
    if not api_key:
        return None
    rate_limiter = get_groq_rate_limiter()

    for attempt in range(max_retries):
        correction = ""
        if attempt > 0:
            try:
                schema_json = json.dumps(schema.model_json_schema(), indent=0)
                correction = (
                    f"\n\nPrevious response failed schema validation. "
                    f"Return ONLY valid JSON matching this schema (no markdown, no explanation): {schema_json}"
                )
            except Exception:
                correction = "\n\nPrevious response failed validation. Return ONLY valid JSON."

        try:
            raw = await call_groq_api(
                api_key=api_key,
                system_message=system,
                user_prompt=prompt + correction,
                rate_limiter=rate_limiter,
                max_tokens=max_tokens,
            )
        except Exception as e:
            logger.warning("call_groq_structured: Groq call failed: %s", e)
            return None

        content = (raw or {}).get("content") or ""
        parsed: Any = recover_truncated_json(content)
        if parsed is None:
            logger.warning("call_groq_structured: JSON recovery failed (attempt %s)", attempt + 1)
            continue
        if not isinstance(parsed, dict):
            logger.warning("call_groq_structured: expected dict, got %s", type(parsed).__name__)
            continue
        try:
            return schema.model_validate(parsed)
        except ValidationError as e:
            logger.warning("call_groq_structured: validation failed attempt %s: %s", attempt + 1, e)
            continue

    global _validation_failures_since_start
    _validation_failures_since_start += 1
    return None
