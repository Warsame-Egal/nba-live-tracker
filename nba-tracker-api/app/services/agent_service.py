import asyncio
import json
import logging
import traceback
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from fastapi import HTTPException

from app.services.data_cache import data_cache
from app.services.game_detail import GameDetailService
from app.services.groq_client import groq_is_ready, get_groq_client, get_groq_rate_limiter
from app.services.players import getPlayer, get_top_players_by_stat, search_players
from app.services.standings import getSeasonStandings
from app.utils.season import get_current_season

logger = logging.getLogger(__name__)


AGENT_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_live_scoreboard",
            "description": "Get the latest cached live NBA scoreboard (games today).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_player_stats",
            "description": "Get detailed player stats for a given player name (uses player search, then player lookup).",
            "parameters": {
                "type": "object",
                "properties": {
                    "player_query": {
                        "type": "string",
                        "description": "Player name or partial match (e.g., 'LeBron', 'Jokic').",
                    }
                },
                "required": ["player_query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_game_detail",
            "description": "Get full details for a specific game ID, including status, box score, key moments, and win probability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "game_id": {
                        "type": "string",
                        "description": "NBA game ID (10 digits, zero-padded if needed).",
                    }
                },
                "required": ["game_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_standings",
            "description": "Get NBA team standings for a given season.",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {
                        "type": "string",
                        "description": "Season in format 'YYYY-YY' (defaults to current season).",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_league_leaders",
            "description": "Get top players by stat category for a season (PTS, REB, AST, STL, BLK).",
            "parameters": {
                "type": "object",
                "properties": {
                    "season": {
                        "type": "string",
                        "description": "Season in format 'YYYY-YY' (defaults to current season).",
                    },
                    "stat_category": {
                        "type": "string",
                        "description": "Stat category abbreviation: PTS, REB, AST, STL, BLK (defaults to PTS).",
                    },
                    "top_n": {
                        "type": "integer",
                        "description": "How many players to return (defaults to 5).",
                        "minimum": 1,
                        "maximum": 50,
                    },
                },
                "required": [],
            },
        },
    },
]


_agent_requests_since_start = 0
_agent_tools_total_since_start = 0


def _normalize_history(history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []
    for msg in history or []:
        if not isinstance(msg, dict):
            continue
        role = str(msg.get("role") or "").lower()
        content = msg.get("content")
        if content is None:
            # Be permissive for other shapes that may come from the frontend.
            content = msg.get("text") or msg.get("message") or ""
        if not isinstance(content, str):
            content = str(content)

        if role in {"user", "assistant", "system"}:
            normalized.append({"role": role, "content": content})
    return normalized


def _system_prompt() -> str:
    return (
        "You are the CourtIQ NBA agent for a live NBA tracker.\n"
        "You must ONLY answer using the tool data you request and receive.\n"
        "If tool data is missing or unclear, say so clearly.\n"
        "Return a concise, helpful plain-text answer with no markdown."
    )


@dataclass
class _ToolCall:
    tool_call_id: Optional[str]
    name: str
    arguments: Dict[str, Any]


def _parse_tool_calls(resp: Any) -> List[_ToolCall]:
    """
    Best-effort parsing for Groq/OpenAI compatible tool_calls payloads.
    We accept a few common shapes to reduce coupling to one SDK version.
    """

    tool_calls: List[_ToolCall] = []
    try:
        choices = getattr(resp, "choices", None) or []
        if not choices and isinstance(resp, dict):
            choices = resp.get("choices") or []
        if not choices:
            return []

        message = choices[0].get("message") if isinstance(choices[0], dict) else getattr(choices[0], "message", None)
        if not message:
            return []

        tc = None
        if isinstance(message, dict):
            tc = message.get("tool_calls")
        else:
            tc = getattr(message, "tool_calls", None)

        if not tc:
            return []

        for item in tc:
            if isinstance(item, dict):
                tool_call_id = item.get("id")
                fn = item.get("function") or {}
                name = fn.get("name") or ""
                arguments_raw = fn.get("arguments") or {}
            else:
                tool_call_id = getattr(item, "id", None)
                fn = getattr(item, "function", None)
                name = getattr(fn, "name", "") if fn is not None else ""
                arguments_raw = getattr(fn, "arguments", {}) if fn is not None else {}

            if isinstance(arguments_raw, str):
                try:
                    arguments = json.loads(arguments_raw)
                except Exception:
                    arguments = {}
            elif isinstance(arguments_raw, dict):
                arguments = arguments_raw
            else:
                arguments = {}

            if name:
                tool_calls.append(_ToolCall(tool_call_id=tool_call_id, name=name, arguments=arguments))
    except Exception:
        logger.debug("Failed parsing tool_calls:\n%s", traceback.format_exc())

    return tool_calls


def _convert_to_jsonable(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {k: _convert_to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_to_jsonable(x) for x in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    return str(obj)


def _trim_tool_result(name: str, result: Any) -> Any:
    """Strip tool results to what the model needs, reducing token usage."""
    converted = _convert_to_jsonable(result)

    if name == "get_live_scoreboard" and isinstance(converted, dict):
        games = (converted.get("scoreboard") or {}).get("games") or []
        trimmed_games = []
        for g in games[:15]:
            home = g.get("homeTeam") or {}
            away = g.get("awayTeam") or {}
            trimmed_games.append(
                {
                    "home": f"{home.get('teamCity', '')} {home.get('teamName', '')}".strip(),
                    "away": f"{away.get('teamCity', '')} {away.get('teamName', '')}".strip(),
                    "home_score": home.get("score"),
                    "away_score": away.get("score"),
                    "status": g.get("gameStatusText", ""),
                    "period": g.get("period"),
                    "clock": g.get("gameClock", ""),
                    "game_id": g.get("gameId", ""),
                }
            )
        return trimmed_games

    if name == "get_standings":
        as_str = json.dumps(converted, default=str)
        if len(as_str) > 3000:
            return {"truncated": True, "data_preview": as_str[:3000] + "..."}
        return converted

    if name == "get_player_stats" and isinstance(converted, dict):
        keep = {
            "name",
            "position",
            "team",
            "stats",
            "recent_games",
            "pts",
            "reb",
            "ast",
            "fg_pct",
            "season",
        }
        return {k: converted[k] for k in keep if k in converted}

    as_str = json.dumps(converted, default=str)
    if len(as_str) > 4000:
        return {"note": "Response truncated", "data_preview": as_str[:3500] + "..."}
    return converted


async def _execute_tool(name: str, args: Dict[str, Any]) -> Any:
    global _agent_tools_total_since_start

    _agent_tools_total_since_start += 1

    if name == "get_live_scoreboard":
        return await data_cache.get_scoreboard()

    if name == "get_player_stats":
        query = args.get("player_query") or args.get("player_name") or args.get("query")
        if not query or not isinstance(query, str):
            raise HTTPException(status_code=422, detail="Missing player_query")

        candidates = await search_players(query)
        if not candidates:
            raise HTTPException(status_code=404, detail="No players found matching query")

        # Best effort: use first match.
        first = candidates[0]
        player_id = None
        if isinstance(first, dict):
            player_id = first.get("PERSON_ID") or first.get("player_id")
        else:
            player_id = getattr(first, "PERSON_ID", None) or getattr(first, "player_id", None)
        if not player_id:
            raise HTTPException(status_code=404, detail="Could not resolve player id")

        return await getPlayer(str(player_id))

    if name == "get_game_detail":
        game_id = args.get("game_id")
        if not game_id:
            raise HTTPException(status_code=422, detail="Missing game_id")
        return await GameDetailService().get_game_detail(str(game_id))

    if name == "get_standings":
        season = args.get("season") or get_current_season()
        return await getSeasonStandings(str(season))

    if name == "get_league_leaders":
        season = args.get("season") or get_current_season()
        stat_category = (args.get("stat_category") or "PTS").upper()
        top_n = int(args.get("top_n") or 5)
        return await get_top_players_by_stat(str(season), stat_category, top_n=top_n)

    raise HTTPException(status_code=400, detail=f"Unknown tool: {name}")


def get_agent_metrics() -> Dict[str, Any]:
    avg = 0.0
    if _agent_requests_since_start:
        avg = _agent_tools_total_since_start / _agent_requests_since_start
    return {
        "agent_requests_since_start": _agent_requests_since_start,
        "agent_avg_tools_per_request": round(avg, 3),
        "agent_tools_total_since_start": _agent_tools_total_since_start,
    }


async def run_agent(question: str, conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Tool-calling agent (non-streaming).
    """

    global _agent_requests_since_start
    if not groq_is_ready():
        return {
            "answer": "CourtIQ agent is not ready yet. Groq API key may be missing.",
            "tools_used": [],
            "tool_results": [],
        }

    _agent_requests_since_start += 1

    api_key = None
    try:
        # get_groq_client requires api_key; groq_is_ready() implies it exists.
        # We re-fetch the key indirectly by trying get_groq_client with the current config.
        # If this fails, we surface the error message.
        from app.config import get_groq_api_key

        api_key = get_groq_api_key()
    except Exception:
        api_key = None

    if not api_key:
        return {
            "answer": "CourtIQ agent is not configured (Groq API key missing).",
            "tools_used": [],
            "tool_results": [],
        }

    client = get_groq_client(api_key)

    normalized_history = _normalize_history(conversation_history)
    messages: List[Dict[str, str]] = [{"role": "system", "content": _system_prompt()}]
    messages.extend(normalized_history)
    messages.append({"role": "user", "content": question})

    # 1) Let the model decide tool calls.
    await get_groq_rate_limiter().wait_if_needed(estimated_tokens=800)
    resp = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        tools=AGENT_TOOLS,
        tool_choice="auto",
        temperature=0.2,
        max_tokens=600,
    )

    raw_message = resp.choices[0].message if hasattr(resp, "choices") else None  # type: ignore[attr-defined]
    answer_content = getattr(raw_message, "content", None) if raw_message is not None else None
    if answer_content is None and isinstance(resp, dict):
        answer_content = ((resp.get("choices") or [{}])[0].get("message") or {}).get(
            "content"
        )  # type: ignore[call-arg]

    tool_calls = _parse_tool_calls(resp)
    if not tool_calls:
        return {
            "answer": (answer_content or "").strip(),
            "tools_used": [],
            "tool_results": [],
        }

    tools_used: List[Dict[str, Any]] = []
    tool_results: List[Dict[str, Any]] = []

    for tc in tool_calls:
        result = await _execute_tool(tc.name, tc.arguments or {})
        tools_used.append({"name": tc.name, "arguments": tc.arguments})
        tool_results.append({"name": tc.name, "result": _trim_tool_result(tc.name, result)})

    # 2) Ask for a final answer using tool results.
    tool_results_payload = json.dumps(tool_results, ensure_ascii=False)
    final_messages: List[Dict[str, str]] = [{"role": "system", "content": _system_prompt()}]
    final_messages.extend(normalized_history)
    final_messages.append(
        {
            "role": "user",
            "content": f"User question:\n{question}\n\nTool results (JSON):\n{tool_results_payload}\n\n"
            f"Now answer the question using only the tool results. Be concise.",
        }
    )

    await get_groq_rate_limiter().wait_if_needed(estimated_tokens=800)
    final_resp = await client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=final_messages,
        temperature=0.2,
        max_tokens=500,
    )

    final_content = ""
    try:
        final_content = final_resp.choices[0].message.content  # type: ignore[attr-defined]
    except Exception:
        if isinstance(final_resp, dict):
            final_content = ((final_resp.get("choices") or [{}])[0].get("message") or {}).get("content") or ""

    return {
        "answer": (final_content or "").strip(),
        "tools_used": tools_used,
        "tool_results": tool_results,
    }


def _format_sse_event(event_type: str, payload: Dict[str, Any]) -> str:
    data = {"type": event_type, **payload}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def run_agent_streaming(
    question: str,
    conversation_history: List[Dict[str, Any]],
) -> AsyncGenerator[str, None]:
    """
    Streaming SSE generator.

    Emits JSON payloads with a `type` field:
    - tool_call: tool name + arguments
    - tool_result: tool name + success
    - token: small incremental text chunks
    - done: final answer
    - error: fatal error message
    """

    if not groq_is_ready():
        yield _format_sse_event("error", {"message": "CourtIQ agent is not ready yet (Groq not configured)."})
        return

    global _agent_requests_since_start
    _agent_requests_since_start += 1

    from app.config import get_groq_api_key

    api_key = get_groq_api_key()
    if not api_key:
        yield _format_sse_event("error", {"message": "CourtIQ agent not configured (Groq API key missing)."})
        return

    client = get_groq_client(api_key)

    normalized_history = _normalize_history(conversation_history)
    messages: List[Dict[str, str]] = [{"role": "system", "content": _system_prompt()}]
    messages.extend(normalized_history)
    messages.append({"role": "user", "content": question})

    try:
        await get_groq_rate_limiter().wait_if_needed(estimated_tokens=800)
        resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=600,
        )

        tool_calls = _parse_tool_calls(resp)
        if not tool_calls:
            # No tools; treat it as the final answer.
            content = getattr(resp.choices[0].message, "content", "")  # type: ignore[attr-defined]
            answer = (content or "").strip()
            for tok in answer.split():
                if tok:
                    yield _format_sse_event("token", {"token": tok + " "})
                    await asyncio.sleep(0)
            yield _format_sse_event("done", {"answer": answer})
            return

        tools_used: List[Dict[str, Any]] = []
        tool_results: List[Dict[str, Any]] = []

        for tc in tool_calls:
            yield _format_sse_event("tool_call", {"tool_name": tc.name, "arguments": tc.arguments})
            result = await _execute_tool(tc.name, tc.arguments or {})
            tools_used.append({"name": tc.name, "arguments": tc.arguments})
            tool_results.append({"name": tc.name, "result": _trim_tool_result(tc.name, result)})
            yield _format_sse_event("tool_result", {"tool_name": tc.name, "ok": True})

        tool_results_payload = json.dumps(tool_results, ensure_ascii=False)
        final_messages: List[Dict[str, str]] = [{"role": "system", "content": _system_prompt()}]
        final_messages.extend(normalized_history)
        final_messages.append(
            {
                "role": "user",
                "content": f"User question:\n{question}\n\nTool results (JSON):\n{tool_results_payload}\n\n"
                f"Now answer the question using only the tool results. Be concise.",
            }
        )

        await get_groq_rate_limiter().wait_if_needed(estimated_tokens=800)
        final_resp = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=final_messages,
            temperature=0.2,
            max_tokens=500,
        )
        final_content = ""
        try:
            final_content = final_resp.choices[0].message.content  # type: ignore[attr-defined]
        except Exception:
            final_content = ""

        answer = (final_content or "").strip()
        for tok in answer.split():
            if tok:
                yield _format_sse_event("token", {"token": tok + " "})
                await asyncio.sleep(0)

        yield _format_sse_event(
            "done",
            {"answer": answer, "tools_used": tools_used, "tools_used_count": len(tools_used)},
        )
    except Exception as e:
        logger.error("Agent streaming failed: %s", e, exc_info=True)
        yield _format_sse_event("error", {"message": str(e)})
