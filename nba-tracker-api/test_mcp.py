"""
Verify MCP tool backends by calling the FastAPI API directly.
Run with: pytest test_mcp.py -v (or python test_mcp.py)
Requires the backend to be running on localhost:8000, or set NBA_TRACKER_API_URL.
"""

import asyncio
import os
import sys

import httpx

BASE_URL = os.getenv("NBA_TRACKER_API_URL", "http://localhost:8000/api/v1")


async def test_health():
    """Backend must be up."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(f"{BASE_URL.rstrip('/')}/health")
        assert r.status_code == 200, r.text


async def test_scoreboard_today():
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BASE_URL}/scoreboard/today")
        assert r.status_code == 200
        data = r.json()
        assert "games" in data or "scoreboard" in data


async def test_player_search():
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BASE_URL}/players/search/LeBron")
        assert r.status_code == 200
        data = r.json()
        players = data.get("data", data) if isinstance(data, dict) else data
        assert isinstance(players, list)


async def test_standings():
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BASE_URL}/standings/season/2024-25")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data or "standings" in data


async def test_predictions():
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{BASE_URL}/predictions/date/2025-03-16")
        assert r.status_code == 200
        data = r.json()
        assert "predictions" in data


async def test_league_leaders():
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BASE_URL}/players/top-by-stat", params={"season": "2024-25", "stat": "PTS", "top_n": 5})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) or "data" in data


async def main():
    print("Checking backend at", BASE_URL)
    try:
        await test_health()
        print("  health: OK")
    except Exception as e:
        print("  health: FAIL", e)
        sys.exit(1)
    try:
        await test_scoreboard_today()
        print("  scoreboard/today: OK")
    except Exception as e:
        print("  scoreboard/today: FAIL", e)
    try:
        await test_player_search()
        print("  players/search: OK")
    except Exception as e:
        print("  players/search: FAIL", e)
    try:
        await test_standings()
        print("  standings: OK")
    except Exception as e:
        print("  standings: FAIL", e)
    try:
        await test_predictions()
        print("  predictions: OK")
    except Exception as e:
        print("  predictions: FAIL", e)
    try:
        await test_league_leaders()
        print("  league leaders: OK")
    except Exception as e:
        print("  league leaders: FAIL", e)
    print("Done. Fix any FAIL before connecting MCP to Claude/Cursor.")


if __name__ == "__main__":
    asyncio.run(main())
