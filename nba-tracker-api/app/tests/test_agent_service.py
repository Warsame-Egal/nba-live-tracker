"""Tests for agent service metrics and tool trimming."""

from app.services.agent_service import get_agent_metrics, _trim_tool_result


def test_agent_metrics_initial_state():
    """Agent metrics should expose expected keys and types."""
    metrics = get_agent_metrics()
    assert "agent_requests_since_start" in metrics
    assert "agent_avg_tools_per_request" in metrics
    assert isinstance(metrics["agent_avg_tools_per_request"], float)


def test_trim_scoreboard_reduces_size():
    """Scoreboard trim should return only essential fields."""
    sample = {
        "scoreboard": {
            "games": [
                {
                    "gameId": "0022400001",
                    "homeTeam": {"teamCity": "Los Angeles", "teamName": "Lakers", "score": 88, "teamId": 1},
                    "awayTeam": {"teamCity": "Boston", "teamName": "Celtics", "score": 82, "teamId": 2},
                    "gameStatusText": "Q3 5:22",
                    "period": 3,
                    "gameClock": "PT05M22S",
                    "gameStatus": 2,
                }
            ]
        }
    }
    result = _trim_tool_result("get_live_scoreboard", sample)
    assert isinstance(result, list)
    assert len(result) == 1
    game = result[0]
    assert "home" in game
    assert "away" in game
    assert "home_score" in game
    assert "status" in game
    assert "teamId" not in str(game)


def test_trim_large_result_truncates():
    """Any tool result over 4000 chars should be truncated."""
    large_data = {"data": "x" * 5000}
    result = _trim_tool_result("get_standings", large_data)
    result_str = str(result)
    assert len(result_str) < 5000
