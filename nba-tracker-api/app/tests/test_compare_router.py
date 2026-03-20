"""Tests for the compare router."""

from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.schemas.compare_schemas import (
    PlayerBio,
    SeasonAverages,
)
from app.services.comparison_pipeline import FetchResult, FetchStatus, PipelineResult

client = TestClient(app)


@patch("app.routers.compare_router.service.search_players", new_callable=AsyncMock)
def test_compare_search_success(mock_search):
    """Test player search for comparison returns a list."""
    mock_search.return_value = [
        {"id": 2544, "full_name": "LeBron James", "is_active": True},
    ]
    response = client.get("/api/v1/compare/search?q=lebron")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == 2544
    assert data[0]["full_name"] == "LeBron James"


def test_compare_search_requires_min_length():
    """Test search requires at least 2 characters."""
    response = client.get("/api/v1/compare/search?q=a")
    assert response.status_code == 422


def _make_pipeline_result_with_minimum_data():
    """Build a PipelineResult that has_minimum_data and all fields for builder."""
    player1_bio = PlayerBio(
        id=2544,
        full_name="LeBron James",
        team="Lakers",
        team_abbreviation="LAL",
        position="F",
        height="6-9",
        weight="250",
        jersey="23",
        headshot_url="https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png",
    )
    player2_bio = PlayerBio(
        id=201566,
        full_name="Stephen Curry",
        team="Warriors",
        team_abbreviation="GSW",
        position="G",
        height="6-2",
        weight="185",
        jersey="30",
        headshot_url="https://cdn.nba.com/headshots/nba/latest/1040x760/201566.png",
    )
    p1_avg = SeasonAverages(
        gp=50,
        min=35.0,
        pts=25.0,
        reb=7.0,
        ast=8.0,
        stl=1.2,
        blk=0.5,
        tov=3.5,
        fg_pct=0.52,
        fg3_pct=0.35,
        ft_pct=0.75,
        plus_minus=5.0,
    )
    p2_avg = SeasonAverages(
        gp=55,
        min=32.0,
        pts=28.0,
        reb=5.0,
        ast=6.5,
        stl=1.0,
        blk=0.2,
        tov=3.0,
        fg_pct=0.48,
        fg3_pct=0.42,
        ft_pct=0.92,
        plus_minus=4.0,
    )
    result = PipelineResult()
    result.results = {
        "player1_bio": FetchResult("player1_bio", FetchStatus.SUCCESS, data=player1_bio),
        "player2_bio": FetchResult("player2_bio", FetchStatus.SUCCESS, data=player2_bio),
        "player1_splits": FetchResult("player1_splits", FetchStatus.SUCCESS, data=p1_avg),
        "player2_splits": FetchResult("player2_splits", FetchStatus.SUCCESS, data=p2_avg),
        "player1_games": FetchResult("player1_games", FetchStatus.SUCCESS, data=[]),
        "player2_games": FetchResult("player2_games", FetchStatus.SUCCESS, data=[]),
        "scouting_report": FetchResult("scouting_report", FetchStatus.SUCCESS, data="Sample report."),
    }
    return result


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_success(mock_execute):
    """Test comparison endpoint returns structured data via pipeline."""
    mock_execute.return_value = _make_pipeline_result_with_minimum_data()
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 200
    data = response.json()
    assert data["player1"]["full_name"] == "LeBron James"
    assert data["player2"]["full_name"] == "Stephen Curry"
    assert "player1_averages" in data
    assert "player1_radar" in data
    assert data["scouting_report"] == "Sample report."


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_503_when_minimum_data_missing(mock_execute):
    """Test comparison returns 503 when pipeline lacks required data."""
    result = PipelineResult()
    result.results = {
        "player1_bio": FetchResult("player1_bio", FetchStatus.FAILED, error="Not found"),
        "player2_bio": FetchResult("player2_bio", FetchStatus.SUCCESS, data=None),
        "player1_splits": FetchResult("player1_splits", FetchStatus.FAILED, error=""),
        "player2_splits": FetchResult("player2_splits", FetchStatus.SUCCESS, data=None),
    }
    mock_execute.return_value = result
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 503
    detail = response.json().get("detail", "")
    assert "Unable to load comparison" in detail
    assert "Player 1 profile" in detail


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_partial_response_head_to_head_null(mock_execute):
    """Test partial response: when head-to-head fetch fails, response has head_to_head null."""
    result = _make_pipeline_result_with_minimum_data()
    result.results["head_to_head"] = FetchResult(
        "head_to_head", FetchStatus.FAILED, error="No games found", latency_ms=10.0
    )
    mock_execute.return_value = result
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 200
    data = response.json()
    assert data["head_to_head"] is None
    assert data["fetch_summary"]["head_to_head"]["status"] == "failed"
    assert data["fetch_summary"]["head_to_head"].get("error") == "No games found"


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_partial_response_scouting_report_null(mock_execute):
    """Test partial response: when Groq/scouting fails, response has scouting_report null."""
    result = _make_pipeline_result_with_minimum_data()
    result.results["scouting_report"] = FetchResult(
        "scouting_report",
        FetchStatus.FAILED,
        error="Groq rate limit",
        latency_ms=100.0,
    )
    mock_execute.return_value = result
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 200
    data = response.json()
    assert data["scouting_report"] is None
    assert data["fetch_summary"]["scouting_report"]["status"] == "failed"
    assert "rate limit" in data["fetch_summary"]["scouting_report"].get("error", "").lower()


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_fetch_summary_has_expected_keys_and_statuses(mock_execute):
    """Test fetch_summary contains expected keys and each entry has status, latency_ms, error."""
    result = _make_pipeline_result_with_minimum_data()
    # Add a cached source to assert structure
    result.results["player1_games"] = FetchResult(
        "player1_games", FetchStatus.CACHED, data=[], latency_ms=0, cache_ttl_seconds=300
    )
    mock_execute.return_value = result
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 200
    summary = response.json().get("fetch_summary", {})
    required_keys = [
        "player1_bio",
        "player2_bio",
        "player1_splits",
        "player2_splits",
        "player1_games",
        "player2_games",
        "scouting_report",
    ]
    for key in required_keys:
        assert key in summary, f"fetch_summary missing key: {key}"
        entry = summary[key]
        assert "status" in entry
        assert entry["status"] in ("success", "failed", "cached", "rate_limited")
        assert "latency_ms" in entry
        assert isinstance(entry["latency_ms"], (int, float))
    # Cached source should show status cached
    assert summary["player1_games"]["status"] == "cached"
    assert summary["player1_games"].get("cache_ttl_seconds") == 300


@patch("app.routers.compare_router.pipeline.execute", new_callable=AsyncMock)
def test_compare_players_fetch_summary_shows_rate_limited_when_applicable(mock_execute):
    """Test fetch_summary shows rate_limited status when pipeline sets RATE_LIMITED."""
    result = _make_pipeline_result_with_minimum_data()
    result.results["scouting_report"] = FetchResult(
        "scouting_report",
        FetchStatus.RATE_LIMITED,
        error="429 Too Many Requests",
        latency_ms=50.0,
    )
    mock_execute.return_value = result
    response = client.get("/api/v1/compare/2544/201566?season=2025-26&last_n_games=20")
    assert response.status_code == 200
    assert response.json()["fetch_summary"]["scouting_report"]["status"] == "rate_limited"
    assert "429" in response.json()["fetch_summary"]["scouting_report"].get("error", "")
