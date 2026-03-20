"""Post-game recap generation. Cached permanently per game_id."""

import asyncio
import logging
from collections import OrderedDict
from typing import Any, Dict, List, Optional

from app.config import get_groq_api_key
from app.services.groq_client import groq_is_ready, call_groq_api, get_groq_rate_limiter
from app.services.groq_prompts import build_postgame_recap_prompt
from app.services.key_moments import _key_moments_cache

logger = logging.getLogger(__name__)

RECAP_CACHE_MAX_SIZE = 200
_recap_cache: OrderedDict[str, str] = OrderedDict()


async def generate_postgame_recap(game_id: str, game_data: Dict[str, Any]) -> Optional[str]:
    """
    Generate a post-game recap for a finished game.
    Cached permanently — once generated, always returned from cache.
    """
    if game_id in _recap_cache:
        _recap_cache.move_to_end(game_id)
        return _recap_cache[game_id]

    if not groq_is_ready():
        return None

    api_key = get_groq_api_key()
    try:
        moments = _key_moments_cache.get(game_id, [])
        key_moment_descriptions = []
        for moment in moments[:3]:
            play = moment.get("play") or {}
            description = play.get("description", "")
            if description:
                key_moment_descriptions.append(description)

        game_data = dict(game_data)
        game_data["key_moment_descriptions"] = key_moment_descriptions

        # Extract top performer snapshots from player impacts (home/away) for the prompt.
        # `GameDetailResponse` exposes `player_impacts: List[PlayerImpact]` where `team_side` is 'home'/'away'.
        def _format_performer(p: Dict[str, Any]) -> str:
            name = p.get("player_name") or p.get("name") or ""
            pts = p.get("pts") if p.get("pts") is not None else p.get("points", 0)
            reb = p.get("reb") if p.get("reb") is not None else p.get("rebounds", 0)
            ast = p.get("ast") if p.get("ast") is not None else p.get("assists", 0)
            return f"{name} ({pts} pts, {reb} reb, {ast} ast)" if name else "N/A"

        raw_impacts = game_data.get("player_impacts") or []
        impacts_as_dicts: List[Dict[str, Any]] = []
        for imp in raw_impacts:
            if hasattr(imp, "model_dump"):
                impacts_as_dicts.append(imp.model_dump())  # type: ignore[attr-defined]
            elif isinstance(imp, dict):
                impacts_as_dicts.append(imp)

        home_impacts = [p for p in impacts_as_dicts if str(p.get("team_side") or "").lower() == "home"]
        away_impacts = [p for p in impacts_as_dicts if str(p.get("team_side") or "").lower() == "away"]

        game_data["home_top_performer"] = _format_performer(home_impacts[0]) if home_impacts else "N/A"
        game_data["away_top_performer"] = _format_performer(away_impacts[0]) if away_impacts else "N/A"

        prompt = build_postgame_recap_prompt(game_data)
        system = "You are a concise NBA beat reporter. Write factual, direct game recaps."

        response = await asyncio.wait_for(
            call_groq_api(
                api_key=api_key,
                system_message=system,
                user_prompt=prompt,
                rate_limiter=get_groq_rate_limiter(),
            ),
            timeout=15.0,
        )

        recap = (response.get("content") or "").strip()
        if recap:
            _recap_cache[game_id] = recap
            if len(_recap_cache) > RECAP_CACHE_MAX_SIZE:
                _recap_cache.popitem(last=False)
            logger.info("Generated and cached post-game recap for game %s", game_id)
        return recap

    except Exception as e:
        logger.warning("Error generating post-game recap for %s: %s", game_id, e)
        return None


def get_cached_recap(game_id: str) -> Optional[str]:
    """Return cached recap if available."""
    return _recap_cache.get(game_id)
