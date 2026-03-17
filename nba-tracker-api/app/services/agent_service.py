"""
Tool-calling NBA agent using Groq. Answers natural-language questions by calling
existing services (scoreboard, players, game detail, standings, leaders, predictions).
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from app.config import get_groq_api_key
from app.services.data_cache import data_cache
from app.utils.ai_cache import get_agent_response_cache
from app.services.game_detail import GameDetailService
from app.services.groq_client import get_groq_client, groq_is_ready
from app.services.players import getPlayer, search_players
from app.services.predictions import predict_games_for_date
from app.services.standings import getSeasonStandings
from app.services.players import get_season_leaders

logger = logging.getLogger(__name__)

# Metrics for /health ai observability
_agent_requests_since_start = 0
_agent_tools_total_since_start = 0


def get_agent_metrics() -> Dict[str, Any]:
    """Return agent request count and avg tools per request since process start."""
    return {
        "agent_requests_since_start": _agent_requests_since_start,
        "agent_avg_tools_per_request": (
            round(_agent_tools_total_since_start / _agent_requests_since_start, 1) if _agent_requests_since_start else 0
        ),
    }


# Current season for standings/leaders when not specified
DEFAULT_SEASON = "2024-25"

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_live_scoreboard",
            "description": "Get all games today with live scores, period, clock, and team names",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_player_stats",
            "description": "Get a player's season averages, recent game log, and current game performance",
            "parameters": {
                "type": "object",
                "properties": {"player_name": {"type": "string"}},
                "required": ["player_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_game_detail",
            "description": "Get full detail for a specific game: scores, box score, key moments, win probability",
            "parameters": {
                "type": "object",
                "properties": {"game_id": {"type": "string"}},
                "required": ["game_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_standings",
            "description": "Get current NBA standings by conference",
            "parameters": {
                "type": "object",
                "properties": {"season": {"type": "string", "description": "e.g. 2024-25"}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_league_leaders",
            "description": "Get season leaders for a stat category",
            "parameters": {
                "type": "object",
                "properties": {
                    "stat": {"type": "string", "enum": ["PTS", "REB", "AST", "STL", "BLK"]},
                    "season": {"type": "string"},
                },
                "required": ["stat"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_predictions",
            "description": "Get game predictions for a given date (win probability, predicted score, key drivers)",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "season": {"type": "string"},
                },
                "required": ["date"],
            },
        },
    },
]


def _to_serializable(obj: Any) -> Any:
    """Convert Pydantic models and common types to JSON-serializable dict/list."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if isinstance(obj, dict):
        return {k: _to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_serializable(x) for x in obj]
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    return str(obj)


async def _execute_tool(tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
    """Execute one agent tool and return a JSON-serializable result."""
    try:
        if tool_name == "get_live_scoreboard":
            sb = await data_cache.get_scoreboard()
            if not sb:
                return {"error": "Scoreboard not available yet"}
            return _to_serializable(sb)

        if tool_name == "get_player_stats":
            player_name = (tool_args.get("player_name") or "").strip()
            if not player_name:
                return {"error": "player_name required"}
            players = await search_players(player_name)
            if not players:
                return {"error": f"No player found matching '{player_name}'"}
            first = players[0]
            pid = getattr(first, "PERSON_ID", first.get("PERSON_ID") if isinstance(first, dict) else None)
            if pid is None:
                return {"error": "Could not get player id"}
            detail = await getPlayer(str(pid))
            return _to_serializable(detail)

        if tool_name == "get_game_detail":
            game_id = (tool_args.get("game_id") or "").strip()
            if not game_id:
                return {"error": "game_id required"}
            svc = GameDetailService()
            detail = await svc.get_game_detail(game_id)
            if detail is None:
                return {"error": f"Game {game_id} not found"}
            return _to_serializable(detail)

        if tool_name == "get_standings":
            season = (tool_args.get("season") or DEFAULT_SEASON).strip()
            resp = await getSeasonStandings(season)
            # Paginated response: we return first page of standings for agent
            standings_list = resp.standings[:30]
            return {"season": season, "standings": _to_serializable(standings_list)}

        if tool_name == "get_league_leaders":
            stat = (tool_args.get("stat") or "PTS").strip().upper()
            if stat not in ("PTS", "REB", "AST", "STL", "BLK"):
                stat = "PTS"
            season = (tool_args.get("season") or DEFAULT_SEASON).strip()
            resp = await get_season_leaders(season)
            # resp is SeasonLeadersResponse; get category matching stat
            cat_map = {"PTS": "Points", "REB": "Rebounds", "AST": "Assists", "STL": "Steals", "BLK": "Blocks"}
            cat_name = cat_map.get(stat, "Points")
            for c in resp.categories:
                if cat_name.lower() in c.category.lower() or stat in c.category:
                    return {"season": season, "category": c.category, "leaders": _to_serializable(c.leaders)}
            return {"season": season, "error": f"No leaders for {stat}"}

        if tool_name == "get_predictions":
            date = (tool_args.get("date") or "").strip()
            if not date:
                return {"error": "date required (YYYY-MM-DD)"}
            season = (tool_args.get("season") or DEFAULT_SEASON).strip()
            resp = await predict_games_for_date(date, season)
            out = {"date": resp.date, "season": resp.season, "predictions": _to_serializable(resp.predictions)}
            return out

        return {"error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        logger.exception("Agent tool %s failed", tool_name)
        return {"error": str(e)}


async def run_agent(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Run the NBA agent with tool calling. Supports multi-turn via conversation_history.
    Returns dict with answer, tools_used, tool_results. Single-question responses are cached.
    """
    if not groq_is_ready():
        return {
            "answer": "AI is not configured. Set GROQ_API_KEY to enable the agent.",
            "tools_used": [],
            "tool_results": [],
        }

    global _agent_requests_since_start, _agent_tools_total_since_start
    use_cache = not conversation_history
    if use_cache:
        cached = get_agent_response_cache().get_for_question(question)
        if cached is not None:
            return cached

    api_key = get_groq_api_key()
    client = get_groq_client(api_key)

    messages: List[Dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                "You are an NBA data analyst with real-time NBA data access. "
                "Always call tools to get real data before answering. "
                "Be concise, factual, cite specific numbers. "
                "Never invent statistics. If data is unavailable, say so."
            ),
        }
    ]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": question})

    tools_used: List[str] = []
    tool_results: List[Dict[str, Any]] = []
    max_iterations = 5

    for _ in range(max_iterations):
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
            temperature=0.1,
            max_tokens=1000,
        )

        message = response.choices[0].message

        if not message.tool_calls:
            result = {
                "answer": message.content or "No answer generated.",
                "tools_used": tools_used,
                "tool_results": tool_results,
            }
            if use_cache:
                get_agent_response_cache().set_for_question(question, result)
            _agent_requests_since_start += 1
            _agent_tools_total_since_start += len(tools_used)
            return result

        messages.append(message)

        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            try:
                tool_args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_args = {}
            tools_used.append(tool_name)
            result = await _execute_tool(tool_name, tool_args)
            tool_results.append({"tool": tool_name, "result": result})
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                }
            )

    result = {
        "answer": "Analysis incomplete (max tool iterations reached).",
        "tools_used": tools_used,
        "tool_results": tool_results,
    }
    if use_cache:
        get_agent_response_cache().set_for_question(question, result)
    _agent_requests_since_start += 1
    _agent_tools_total_since_start += len(tools_used)
    return result


async def run_agent_streaming(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming version of run_agent. Yields SSE events: tool_call, tool_result, token, done.
    """
    if not groq_is_ready():
        yield f"data: {json.dumps({'type': 'error', 'text': 'AI is not configured. Set GROQ_API_KEY.'})}\n\n"
        return

    api_key = get_groq_api_key()
    client = get_groq_client(api_key)

    messages: List[Dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                "You are an NBA data analyst with real-time NBA data access. "
                "Always call tools to get real data before answering. "
                "Be concise, factual, cite specific numbers. Never invent statistics."
            ),
        }
    ]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": question})

    tools_used: List[str] = []
    max_iterations = 5

    for _ in range(max_iterations):
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
            temperature=0.1,
            max_tokens=200,
        )
        message = response.choices[0].message

        if not message.tool_calls:
            # Use content from this response so we always show the answer and send 'done'
            content = (getattr(message, "content", None) or "").strip()
            if content:
                yield f"data: {json.dumps({'type': 'token', 'text': content})}\n\n"
            else:
                # Fallback: stream a second request only if first had no content
                try:
                    stream = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=messages,
                        temperature=0.1,
                        max_tokens=800,
                        stream=True,
                    )
                    async for chunk in stream:
                        delta = getattr(chunk.choices[0], "delta", None)
                        if delta and getattr(delta, "content", None):
                            yield f"data: {json.dumps({'type': 'token', 'text': delta.content})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"
                    return
            yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used})}\n\n"
            return

        messages.append(message)
        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            try:
                tool_args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_args = {}
            tools_used.append(tool_name)
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool_name})}\n\n"
            result = await _execute_tool(tool_name, tool_args)
            yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_name, 'success': True})}\n\n"
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, default=str),
                }
            )

    yield f"data: {json.dumps({'type': 'error', 'text': 'Analysis incomplete'})}\n\n"
