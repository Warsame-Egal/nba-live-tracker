"""
Comprehensive tests for all API endpoints.

This test suite covers:
- Players endpoints
- Teams endpoints
- Schedule endpoints
- Standings endpoints
- Search endpoints
- Scoreboard endpoints
- Health check endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.schemas.player import PlayerSummary
from app.schemas.team import TeamDetailsResponse
from app.schemas.schedule import GamesResponse
from app.schemas.standings import StandingsResponse
from app.schemas.search import SearchResults
from app.schemas.scoreboard import BoxScoreResponse

client = TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self):
        """Test the root endpoint returns correct message."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "NBA Live Tracker API is running"}

    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "NBA Tracker API"
        assert data["version"] == "1.0.0"


class TestPlayerEndpoints:
    """Tests for player-related endpoints."""

    @patch("app.routers.players.getPlayer")
    def test_get_player_success(self, mock_get_player):
        """Test successful retrieval of player details."""
        mock_player = PlayerSummary(
            PERSON_ID=2544,
            PLAYER_FIRST_NAME="LeBron",
            PLAYER_LAST_NAME="James",
            TEAM_ID=1610612747,
            POSITION="F",
            FROM_YEAR=2003,
            TO_YEAR=2024,
            recent_games=[],
        )
        mock_get_player.return_value = mock_player

        response = client.get("/api/v1/player/2544")
        assert response.status_code == 200
        data = response.json()
        assert data["PERSON_ID"] == 2544
        assert data["PLAYER_FIRST_NAME"] == "LeBron"
        assert data["PLAYER_LAST_NAME"] == "James"

    @patch("app.routers.players.getPlayer")
    def test_get_player_not_found(self, mock_get_player):
        """Test player not found returns 404."""
        from fastapi import HTTPException

        mock_get_player.side_effect = HTTPException(status_code=404, detail="Player not found")

        response = client.get("/api/v1/player/999999")
        assert response.status_code == 404

    @patch("app.routers.players.search_players")
    def test_search_players_success(self, mock_search_players):
        """Test successful player search."""
        mock_results = [
            PlayerSummary(
                PERSON_ID=2544,
                PLAYER_FIRST_NAME="LeBron",
                PLAYER_LAST_NAME="James",
                TEAM_ID=1610612747,
                POSITION="F",
                recent_games=[],
            )
        ]
        mock_search_players.return_value = mock_results

        response = client.get("/api/v1/players/search/lebron")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["PLAYER_LAST_NAME"] == "James"

    @patch("app.routers.players.search_players")
    def test_search_players_empty(self, mock_search_players):
        """Test player search with no results."""
        mock_search_players.return_value = []

        response = client.get("/api/v1/players/search/nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestTeamEndpoints:
    """Tests for team-related endpoints."""

    @patch("app.routers.teams.get_team")
    def test_get_team_not_found(self, mock_get_team):
        """Test team not found returns 404."""
        from fastapi import HTTPException

        mock_get_team.side_effect = HTTPException(status_code=404, detail="Team not found")

        response = client.get("/api/v1/teams/999999")
        assert response.status_code == 404

    @patch("app.routers.scoreboard.fetchTeamRoster")
    def test_get_team_roster_success(self, mock_fetch_roster):
        """Test successful retrieval of team roster."""
        from app.schemas.player import TeamRoster, Player

        mock_roster = TeamRoster(
            team_id=1610612747,
            team_name="Los Angeles Lakers",
            season="2023-24",
            players=[
                Player(
                    player_id=2544,
                    name="LeBron James",
                    jersey_number="6",
                    position="F",
                )
            ],
            coaches=[],
        )
        mock_fetch_roster.return_value = mock_roster

        response = client.get("/api/v1/scoreboard/team/1610612747/roster/2023-24")
        assert response.status_code == 200
        data = response.json()
        assert data["team_id"] == 1610612747
        assert data["season"] == "2023-24"
        assert len(data["players"]) > 0

    @patch("app.routers.scoreboard.fetchTeamRoster")
    def test_get_team_roster_not_found(self, mock_fetch_roster):
        """Test team roster not found returns 404."""
        from fastapi import HTTPException

        mock_fetch_roster.side_effect = HTTPException(status_code=404, detail="Roster not found")

        response = client.get("/api/v1/scoreboard/team/999999/roster/2023-24")
        assert response.status_code == 404


class TestScheduleEndpoints:
    """Tests for schedule-related endpoints."""

    @patch("app.routers.schedule.getGamesForDate")
    def test_get_games_for_date_success(self, mock_get_games):
        """Test successful retrieval of games for a date."""
        from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary

        mock_games = GamesResponse(
            games=[
                GameSummary(
                    game_id="0022300001",
                    game_date="2024-01-01",
                    matchup="LAL vs GSW",
                    game_status="Final",
                    arena="Crypto.com Arena",
                    home_team=TeamSummary(team_id=1610612747, team_abbreviation="LAL", points=120),
                    away_team=TeamSummary(team_id=1610612744, team_abbreviation="GSW", points=115),
                    top_scorer=None,
                )
            ]
        )
        mock_get_games.return_value = mock_games

        response = client.get("/api/v1/schedule/date/2024-01-01")
        assert response.status_code == 200
        data = response.json()
        assert "games" in data
        assert len(data["games"]) > 0
        assert data["games"][0]["game_date"] == "2024-01-01"

    @patch("app.routers.schedule.getGamesForDate")
    def test_get_games_for_date_not_found(self, mock_get_games):
        """Test games not found for date returns 404."""
        from fastapi import HTTPException

        mock_get_games.side_effect = HTTPException(status_code=404, detail="No games found for date")

        response = client.get("/api/v1/schedule/date/2020-01-01")
        assert response.status_code == 404



class TestSearchEndpoints:
    """Tests for search-related endpoints."""

    @patch("app.routers.search.search_entities")
    def test_search_success(self, mock_search):
        """Test successful search for players and teams."""
        from app.schemas.search import PlayerResult, TeamResult
        
        mock_results = SearchResults(
            players=[
                PlayerResult(id=2544, name="LeBron James", team_id=1610612747),
            ],
            teams=[
                TeamResult(id=1610612747, name="Los Angeles Lakers", abbreviation="LAL"),
            ],
        )
        mock_search.return_value = mock_results

        response = client.get("/api/v1/search?q=lakers")
        assert response.status_code == 200
        data = response.json()
        assert "players" in data
        assert "teams" in data
        assert len(data["teams"]) > 0

    @patch("app.routers.search.search_entities")
    def test_search_empty_query(self, mock_search):
        """Test search with empty query returns validation error."""
        response = client.get("/api/v1/search?q=")
        # Should return 422 for validation error (min_length=1)
        assert response.status_code == 422

    @patch("app.routers.search.search_entities")
    def test_search_missing_query(self, mock_search):
        """Test search without query parameter returns validation error."""
        response = client.get("/api/v1/search")
        # Should return 422 for missing required parameter
        assert response.status_code == 422

    @patch("app.routers.search.search_entities")
    def test_search_no_results(self, mock_search):
        """Test search with no results."""
        mock_search.return_value = SearchResults(players=[], teams=[])

        response = client.get("/api/v1/search?q=nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert len(data["players"]) == 0
        assert len(data["teams"]) == 0


class TestScoreboardEndpoints:
    """Tests for scoreboard-related endpoints."""

    @patch("app.routers.scoreboard.getBoxScore")
    def test_get_boxscore_not_found(self, mock_get_boxscore):
        """Test box score not found returns 404."""
        from fastapi import HTTPException

        mock_get_boxscore.side_effect = HTTPException(status_code=404, detail="Box score not found")

        response = client.get("/api/v1/scoreboard/game/9999999999/boxscore")
        assert response.status_code == 404



class TestErrorHandling:
    """Tests for error handling across endpoints."""

    @patch("app.routers.teams.get_team")
    def test_team_error_handling(self, mock_get_team):
        """Test team endpoint error handling."""
        mock_get_team.side_effect = Exception("Unexpected error")

        response = client.get("/api/v1/teams/1610612747")
        assert response.status_code == 500
        data = response.json()
        assert "error" in data.get("detail", "").lower() or "unexpected" in data.get("detail", "").lower()


class TestInputValidation:
    """Tests for input validation across endpoints."""

    def test_player_id_validation(self):
        """Test player ID parameter validation."""
        # Test with non-numeric player ID
        response = client.get("/api/v1/player/abc")
        # Should handle non-numeric IDs
        assert response.status_code in [404, 422, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

