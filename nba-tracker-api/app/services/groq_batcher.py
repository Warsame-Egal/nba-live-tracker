"""
Reusable utility for batched Groq AI calls.

This module provides a generic batching pattern that all Groq AI features should use.
Instead of calling Groq per-item, we batch multiple items into one API call for efficiency.

Usage:
    from app.services.groq_batcher import generate_batched_groq_responses
    
    items = [
        {"id": "item1", "data": {...}},
        {"id": "item2", "data": {...}},
    ]
    
    results = await generate_batched_groq_responses(
        items=items,
        build_prompt_fn=lambda items: build_my_prompt(items),
        get_system_message_fn=lambda: get_my_system_message(),
        parse_response_fn=lambda response: parse_my_response(response),
        cache_key_fn=lambda items: create_cache_key(items),
        cache_ttl=60.0,
        timeout=10.0,
    )
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Optional, Callable, TypeVar, Generic
from datetime import datetime

from app.services.groq_client import GROQ_AVAILABLE, call_groq_api, get_groq_rate_limiter
from app.config import get_groq_api_key

logger = logging.getLogger(__name__)

# Generic cache for batched responses
_batch_cache: Dict[str, tuple] = {}  # cache_key -> (data, timestamp)
BATCH_CACHE_MAX_SIZE = 1000  # Maximum 1000 cached responses


T = TypeVar('T')  # Input item type
R = TypeVar('R')  # Result type


async def generate_batched_groq_responses(
    items: List[T],
    build_prompt_fn: Callable[[List[T]], str],
    get_system_message_fn: Callable[[], str],
    parse_response_fn: Callable[[Dict[str, Any]], Dict[str, R]],
    cache_key_fn: Optional[Callable[[List[T]], str]] = None,
    cache_ttl: float = 60.0,
    timeout: float = 10.0,
    empty_result: Optional[Dict[str, R]] = None,
) -> Dict[str, R]:
    """
    Generate batched Groq AI responses for multiple items in one API call.
    
    This is the standard pattern for all Groq AI features. Instead of calling Groq
    per-item, we batch all items into one call for efficiency.
    
    Args:
        items: List of items to process (can be any type)
        build_prompt_fn: Function that takes items and returns a prompt string
        get_system_message_fn: Function that returns the system message
        parse_response_fn: Function that parses Groq response into result dict
        cache_key_fn: Optional function to generate cache key from items
        cache_ttl: Cache time-to-live in seconds (default 60)
        timeout: Groq API call timeout in seconds (default 10)
        empty_result: What to return if generation fails (default empty dict)
        
    Returns:
        Dict mapping item IDs to results (or empty dict if generation fails)
        
    Example:
        # For batched insights:
        results = await generate_batched_groq_responses(
            items=games,
            build_prompt_fn=build_batched_insights_prompt,
            get_system_message_fn=get_batched_insights_system_message,
            parse_response_fn=lambda r: parse_insights_response(r),
            cache_key_fn=lambda gs: create_insights_cache_key(gs),
        )
        
        # For batched moment contexts:
        results = await generate_batched_groq_responses(
            items=moments_with_info,
            build_prompt_fn=build_batched_moment_context_prompt,
            get_system_message_fn=get_batched_moment_context_system_message,
            parse_response_fn=lambda r: parse_moment_contexts_response(r),
        )
    """
    if not items:
        return empty_result or {}
    
    # Clean up expired entries periodically
    if len(_batch_cache) > BATCH_CACHE_MAX_SIZE * 0.9:  # Clean when 90% full
        cleanup_batch_cache()
    
    # Check cache if cache_key_fn provided
    cache_key = None
    if cache_key_fn:
        cache_key = cache_key_fn(items)
        if cache_key in _batch_cache:
            data, timestamp = _batch_cache[cache_key]
            if time.time() - timestamp < cache_ttl:
                logger.debug(f"Returning cached batched response for {len(items)} items")
                return data
            else:
                del _batch_cache[cache_key]
    
    # Check if Groq is available
    if not GROQ_AVAILABLE:
        logger.debug("Groq not available for batched generation")
        return empty_result or {}
    
    groq_api_key = get_groq_api_key()
    if not groq_api_key:
        logger.debug("Groq API key not configured")
        return empty_result or {}
    
    try:
        # Build prompt and system message
        prompt = build_prompt_fn(items)
        system_message = get_system_message_fn()
        
        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter()
                ),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"Batched Groq generation timeout after {timeout}s")
            return empty_result or {}
        
        if not response or not response.get("content"):
            logger.warning("Empty response from Groq")
            return empty_result or {}
        
        # Parse JSON response
        content = response["content"]
        
        # Remove markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Groq JSON response: {e}")
            logger.debug(f"Response content (first 500 chars): {content[:500]}")
            return empty_result or {}
        
        # Parse response using provided function
        results = parse_response_fn(parsed)
        
        # Cache result if cache_key provided
        if cache_key and results:
            _batch_cache[cache_key] = (results, time.time())
            logger.debug(f"Cached batched response for {len(items)} items")
        
        logger.info(f"Generated batched response for {len(items)} items, {len(results)} results")
        return results
        
    except Exception as e:
        logger.warning(f"Error generating batched Groq responses: {e}", exc_info=True)
        return empty_result or {}


def cleanup_batch_cache():
    """Remove expired entries and enforce size limit."""
    current_time = time.time()
    
    # Remove expired entries
    expired_keys = [
        key for key, (_, timestamp) in _batch_cache.items()
        if current_time - timestamp > 3600.0  # 1 hour default TTL
    ]
    for key in expired_keys:
        _batch_cache.pop(key, None)
    
    # Enforce size limit (remove oldest entries)
    if len(_batch_cache) > BATCH_CACHE_MAX_SIZE:
        # Sort by timestamp and remove oldest
        sorted_entries = sorted(
            _batch_cache.items(),
            key=lambda x: x[1][1]  # Sort by timestamp
        )
        keys_to_remove = [
            key for key, _ in sorted_entries[:len(_batch_cache) - BATCH_CACHE_MAX_SIZE]
        ]
        for key in keys_to_remove:
            _batch_cache.pop(key, None)
        logger.debug(f"LRU eviction: removed {len(keys_to_remove)} old entries from batch cache")
    
    if expired_keys:
        logger.debug(f"Cleaned up {len(expired_keys)} expired entries from batch cache")


def clear_batch_cache():
    """Clear all cached batched responses. Useful for testing or cache invalidation."""
    _batch_cache.clear()

