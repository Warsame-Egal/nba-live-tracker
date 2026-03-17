"""
NBA Live Tracker MCP Server

Exposes NBA data as tools for AI assistants (Claude, Cursor, etc.)
Run with: python -m app.mcp_server (from nba-tracker-api) or
  PYTHONPATH=/path/to/nba-tracker-api python /path/to/nba-tracker-api/app/mcp_server.py

Requires the FastAPI backend to be running on localhost:8000.
"""

import asyncio
import json
import os

# Add parent so app imports work when run as script
_here = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(_here) == "app" and _here not in os.sys.path:
    os.sys.path.insert(0, os.path.dirname(_here))

from mcp.server import Server, NotificationOptions  # noqa: E402
from mcp.server.models import InitializationOptions  # noqa: E402
import mcp.server.stdio  # noqa: E402
from mcp import types  # noqa: E402

server = Server("nba-tracker")

BASE_URL = os.getenv("NBA_TRACKER_API_URL", "http://localhost:8000/api/v1")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    """Register all available NBA tools."""
    return [
        types.Tool(
            name="get_live_scoreboard",
            description=(
                "Get all NBA games happening today with live scores, "
                "period, game clock, and team names. Returns live, scheduled, and completed games."
            ),
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
        types.Tool(
            name="get_player_stats",
            description=(
                "Get a player's current season statistics and recent game log. " "Provide the player's full name."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "player_name": {
                        "type": "string",
                        "description": "Player's full name e.g. LeBron James",
                    }
                },
                "required": ["player_name"],
            },
        ),
        types.Tool(
            name="get_game_detail",
            description=(
                "Get detailed stats for a specific NBA game including "
                "box score, key moments, win probability, and player impacts. "
                "Requires a game ID from get_live_scoreboard."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "game_id": {
                        "type": "string",
                        "description": "NBA game ID (10-digit string)",
                    }
                },
                "required": ["game_id"],
            },
        ),
        types.Tool(
            name="get_standings",
            description="Get current NBA standings for both conferences.",
            inputSchema={
                "type": "object",
                "properties": {
                    "season": {
                        "type": "string",
                        "description": "Season in format YYYY-YY e.g. 2024-25",
                        "default": "2024-25",
                    }
                },
                "required": [],
            },
        ),
        types.Tool(
            name="get_predictions",
            description=("Get AI-powered win probability predictions for all " "games on a specific date."),
            inputSchema={
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format e.g. 2026-03-16",
                    }
                },
                "required": ["date"],
            },
        ),
        types.Tool(
            name="get_league_leaders",
            description="Get season leaders for a stat category.",
            inputSchema={
                "type": "object",
                "properties": {
                    "stat": {
                        "type": "string",
                        "enum": ["PTS", "REB", "AST", "STL", "BLK"],
                        "description": "Stat category",
                    },
                    "season": {
                        "type": "string",
                        "description": "Season in format YYYY-YY",
                        "default": "2024-25",
                    },
                },
                "required": ["stat"],
            },
        ),
    ]


async def _execute_tool(name: str, args: dict) -> dict:
    """Call the FastAPI backend over HTTP."""
    import httpx

    async with httpx.AsyncClient(timeout=30.0) as client:
        if name == "get_live_scoreboard":
            resp = await client.get(f"{BASE_URL}/scoreboard/today")
            return resp.json()

        if name == "get_player_stats":
            player_name = (args.get("player_name") or "").strip().replace(" ", "%20")
            search_resp = await client.get(f"{BASE_URL}/players/search/{player_name}")
            data = search_resp.json()
            players = data.get("data") if isinstance(data, dict) else data
            if not players:
                return {"error": f"Player not found: {args.get('player_name')}"}
            first = players[0] if isinstance(players, list) else players
            player_id = first.get("PERSON_ID") or first.get("id")
            player_resp = await client.get(f"{BASE_URL}/player/{player_id}")
            return player_resp.json()

        if name == "get_game_detail":
            resp = await client.get(f"{BASE_URL}/game/{args.get('game_id', '')}/detail")
            return resp.json()

        if name == "get_standings":
            season = args.get("season", "2024-25")
            resp = await client.get(f"{BASE_URL}/standings/season/{season}")
            return resp.json()

        if name == "get_predictions":
            date = args.get("date", "")
            resp = await client.get(f"{BASE_URL}/predictions/date/{date}")
            return resp.json()

        if name == "get_league_leaders":
            stat = args.get("stat", "PTS")
            season = args.get("season", "2024-25")
            resp = await client.get(
                f"{BASE_URL}/players/top-by-stat",
                params={"season": season, "stat": stat, "top_n": 10},
            )
            return resp.json()

    return {"error": f"Unknown tool: {name}"}


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """Execute a tool and return results."""
    try:
        result = await _execute_tool(name, arguments)
        return [types.TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    except Exception as e:
        return [types.TextContent(type="text", text=json.dumps({"error": str(e)}))]


async def main() -> None:
    """Run the MCP server on stdio."""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="nba-tracker",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
