import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)


# ============================================================================
# Health Check Tests
# ============================================================================

def test_home_endpoint():
    """Test the root health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "NBA Live Tracker API is running"}


# ============================================================================
# Player Endpoint Tests
# ============================================================================

@patch("app.services.players.getPlayer")
def test_get_player_success(mock_get_player):
    """Test successful player retrieval with valid ID."""
    mock_player = {
        "PERSON_ID": 2544,
        "PLAYER_LAST_NAME": "James",
        "PLAYER_FIRST_NAME": "LeBron",
        "PLAYER_SLUG": "lebron-james",
        "TEAM_ID": 1610612747,
        "TEAM_ABBREVIATION": "LAL",
        "TEAM_CITY": "Los Angeles",
        "TEAM_NAME": "Lakers",
        "CURRENT_SEASON_STATS": {
            "PTS": 25.0,
            "REB": 7.0,
            "AST": 8.0,
        },
        "RECENT_GAMES": []
    }
    async def mock_get_player_async(*args, **kwargs):
        return mock_player
    mock_get_player.side_effect = mock_get_player_async
    
    response = client.get("/api/v1/player/2544")
    assert response.status_code == 200
    data = response.json()
    assert data["PERSON_ID"] == 2544
    assert data["PLAYER_LAST_NAME"] == "James"
    assert "PLAYER_FIRST_NAME" in data


@patch("app.services.players.getPlayer")
def test_get_player_not_found(mock_get_player):
    """Test 404 error for invalid player ID."""
    from fastapi import HTTPException
    mock_get_player.side_effect = HTTPException(status_code=404, detail="Player not found")
    
    response = client.get("/api/v1/player/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()



@patch("app.services.players.search_players")
def test_search_players_success(mock_search):
    """Test successful player search."""
    mock_results = [
        {
            "PERSON_ID": 2544,
            "PLAYER_LAST_NAME": "James",
            "PLAYER_FIRST_NAME": "LeBron",
            "TEAM_ABBREVIATION": "LAL"
        }
    ]
    async def mock_search_async(*args, **kwargs):
        return mock_results
    mock_search.side_effect = mock_search_async
    
    response = client.get("/api/v1/players/search/lebron")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "PLAYER_LAST_NAME" in data[0]


# ============================================================================
# Team Endpoint Tests
# ============================================================================

@patch("app.services.teams.get_team")
def test_get_team_success(mock_get_team):
    """Test successful team retrieval."""
    mock_team = {
        "team_id": 1610612747,
        "team_name": "Lakers",
        "team_city": "Los Angeles",
        "abbreviation": "LAL",
        "arena": "Crypto.com Arena",
        "head_coach": "Darvin Ham"
    }
    async def mock_get_team_async(*args, **kwargs):
        return mock_team
    mock_get_team.side_effect = mock_get_team_async
    
    response = client.get("/api/v1/teams/1610612747")
    assert response.status_code == 200
    data = response.json()
    assert data["team_id"] == 1610612747
    assert data["team_name"] == "Lakers"
    assert "abbreviation" in data



# ============================================================================
# Scoreboard Endpoint Tests
# ============================================================================

@patch("app.services.scoreboard.getBoxScore")
def test_get_boxscore_success(mock_get_boxscore):
    """Test successful box score retrieval."""
    mock_boxscore = {
        "game_id": "0022500447",
        "home_team": {
            "team_id": 1610612747,
            "team_name": "Lakers",
            "score": 110,
            "players": []
        },
        "away_team": {
            "team_id": 1610612738,
            "team_name": "Celtics",
            "score": 105,
            "players": []
        }
    }
    async def mock_get_boxscore_async(*args, **kwargs):
        return mock_boxscore
    mock_get_boxscore.side_effect = mock_get_boxscore_async
    
    response = client.get("/api/v1/scoreboard/game/0022500447/boxscore")
    assert response.status_code == 200
    data = response.json()
    assert data["game_id"] == "0022500447"
    assert "home_team" in data
    assert "away_team" in data
    assert "players" in data["home_team"]


@patch("app.services.scoreboard.fetchTeamRoster")
def test_get_team_roster_success(mock_get_roster):
    """Test successful team roster retrieval."""
    mock_roster = {
        "team_id": 1610612747,
        "team_name": "Lakers",
        "season": "2024-25",
        "players": [
            {
                "player_id": 2544,
                "name": "LeBron James",
                "jersey_number": "6",
                "position": "F"
            }
        ],
        "coaches": []
    }
    async def mock_get_roster_async(*args, **kwargs):
        return mock_roster
    mock_get_roster.side_effect = mock_get_roster_async
    
    response = client.get("/api/v1/scoreboard/team/1610612747/roster/2024-25")
    assert response.status_code == 200
    data = response.json()
    assert data["team_id"] == 1610612747
    assert "players" in data
    assert isinstance(data["players"], list)

# ============================================================================
# Standings Endpoint Tests
# ============================================================================

@patch("app.services.standings.getSeasonStandings")
def test_get_standings_success(mock_get_standings):
    """Test successful standings retrieval."""
    mock_standings = {
        "standings": [
            {
                "season_id": "22024",
                "team_id": 1610612738,
                "team_city": "Boston",
                "team_name": "Celtics",
                "conference": "East",
                "division": "Atlantic",
                "wins": 50,
                "losses": 20,
                "win_pct": 0.714,
                "playoff_rank": 1,
                "home_record": "28-8",
                "road_record": "22-12",
                "conference_record": "32-12",
                "division_record": "10-4",
                "l10_record": "8-2",
                "current_streak": 4,
                "current_streak_str": "W4",
                "games_back": "0.0"
            }
        ]
    }
    async def mock_get_standings_async(*args, **kwargs):
        return mock_standings
    mock_get_standings.side_effect = mock_get_standings_async
    
    response = client.get("/api/v1/standings/season/2024-25")
    assert response.status_code == 200
    data = response.json()
    assert "standings" in data
    assert isinstance(data["standings"], list)
    assert len(data["standings"]) > 0
    assert data["standings"][0]["wins"] >= 0
    assert data["standings"][0]["losses"] >= 0


# ============================================================================
# Search Endpoint Tests
# ============================================================================

@patch("app.services.search.search_entities")
def test_search_success(mock_search):
    """Test successful search for players and teams."""
    mock_results = {
        "players": [
            {
                "id": 2544,
                "name": "LeBron James",
                "team_id": 1610612747,
                "team_abbreviation": "LAL"
            }
        ],
        "teams": [
            {
                "id": 1610612747,
                "name": "Los Angeles Lakers",
                "abbreviation": "LAL"
            }
        ]
    }
    async def mock_search_async(*args, **kwargs):
        return mock_results
    mock_search.side_effect = mock_search_async
    
    response = client.get("/api/v1/search?q=lakers")
    assert response.status_code == 200
    data = response.json()
    assert "players" in data
    assert "teams" in data
    assert isinstance(data["players"], list)
    assert isinstance(data["teams"], list)


@patch("app.services.search.search_entities")
def test_search_empty_results(mock_search):
    """Test search with no results returns empty lists."""
    mock_results = {
        "players": [],
        "teams": []
    }
    async def mock_search_async(*args, **kwargs):
        return mock_results
    mock_search.side_effect = mock_search_async
    
    response = client.get("/api/v1/search?q=nonexistent")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["players"], list)
    assert isinstance(data["teams"], list)
    assert len(data["players"]) == 0
    assert len(data["teams"]) == 0


def test_search_missing_query_parameter():
    """Test search endpoint requires query parameter."""
    response = client.get("/api/v1/search")
    assert response.status_code == 422  # Validation error


def test_search_empty_query_parameter():
    """Test search endpoint rejects empty query."""
    response = client.get("/api/v1/search?q=")
    assert response.status_code == 422  # Validation error (min_length=1)


# ============================================================================
# Schema Validation Tests
# ============================================================================

@patch("app.services.players.getPlayer")
def test_player_schema_validation(mock_get_player):
    """Test that player response matches expected schema."""
    mock_player = {
        "PERSON_ID": 2544,
        "PLAYER_LAST_NAME": "James",
        "PLAYER_FIRST_NAME": "LeBron",
        "PLAYER_SLUG": "lebron-james",
        "TEAM_ID": 1610612747,
        "TEAM_ABBREVIATION": "LAL",
        "TEAM_CITY": "Los Angeles",
        "TEAM_NAME": "Lakers",
        "CURRENT_SEASON_STATS": {
            "PTS": 25.0,
            "REB": 7.0,
            "AST": 8.0,
        },
        "RECENT_GAMES": []
    }
    async def mock_get_player_async(*args, **kwargs):
        return mock_player
    mock_get_player.side_effect = mock_get_player_async
    
    response = client.get("/api/v1/player/2544")
    assert response.status_code == 200
    data = response.json()
    
    # Validate required fields
    assert "PERSON_ID" in data
    assert "PLAYER_LAST_NAME" in data
    assert "PLAYER_FIRST_NAME" in data
    assert isinstance(data["PERSON_ID"], int)
    assert isinstance(data["PLAYER_LAST_NAME"], str)


@patch("app.services.scoreboard.getBoxScore")
def test_boxscore_schema_validation(mock_get_boxscore):
    """Test that box score response matches expected schema."""
    mock_boxscore = {
        "game_id": "0022500447",
        "home_team": {
            "team_id": 1610612747,
            "team_name": "Lakers",
            "score": 110,
            "field_goal_pct": 0.45,
            "three_point_pct": 0.35,
            "free_throw_pct": 0.80,
            "rebounds": 45,
            "assists": 25,
            "steals": 8,
            "blocks": 5,
            "turnovers": 12,
            "players": []
        },
        "away_team": {
            "team_id": 1610612738,
            "team_name": "Celtics",
            "score": 105,
            "field_goal_pct": 0.42,
            "three_point_pct": 0.33,
            "free_throw_pct": 0.78,
            "rebounds": 42,
            "assists": 23,
            "steals": 7,
            "blocks": 4,
            "turnovers": 14,
            "players": []
        }
    }
    async def mock_get_boxscore_async(*args, **kwargs):
        return mock_boxscore
    mock_get_boxscore.side_effect = mock_get_boxscore_async
    
    response = client.get("/api/v1/scoreboard/game/0022500447/boxscore")
    assert response.status_code == 200
    data = response.json()
    
    # Validate schema structure
    assert "game_id" in data
    assert "home_team" in data
    assert "away_team" in data
    assert "team_id" in data["home_team"]
    assert "team_name" in data["home_team"]
    assert "score" in data["home_team"]
    assert "players" in data["home_team"]
    assert isinstance(data["home_team"]["players"], list)


@patch("app.services.standings.getSeasonStandings")
def test_standings_schema_validation(mock_get_standings):
    """Test that standings response matches expected schema."""
    mock_standings = {
        "standings": [
            {
                "season_id": "22024",
                "team_id": 1610612738,
                "team_city": "Boston",
                "team_name": "Celtics",
                "conference": "East",
                "division": "Atlantic",
                "wins": 50,
                "losses": 20,
                "win_pct": 0.714,
                "playoff_rank": 1,
                "home_record": "28-8",
                "road_record": "22-12",
                "conference_record": "32-12",
                "division_record": "10-4",
                "l10_record": "8-2",
                "current_streak": 4,
                "current_streak_str": "W4",
                "games_back": "0.0"
            }
        ]
    }
    async def mock_get_standings_async(*args, **kwargs):
        return mock_standings
    mock_get_standings.side_effect = mock_get_standings_async
    
    response = client.get("/api/v1/standings/season/2024-25")
    assert response.status_code == 200
    data = response.json()
    
    # Validate schema structure
    assert "standings" in data
    assert isinstance(data["standings"], list)
    if len(data["standings"]) > 0:
        standing = data["standings"][0]
        assert "team_id" in standing
        assert "team_name" in standing
        assert "wins" in standing
        assert "losses" in standing
        assert "win_pct" in standing
        assert isinstance(standing["wins"], int)
        assert isinstance(standing["losses"], int)
        assert isinstance(standing["win_pct"], float)


# ============================================================================
# Error Handling Tests
# ============================================================================

def test_404_nonexistent_endpoint():
    """Test 404 for endpoint that doesn't exist."""
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404


def test_405_method_not_allowed():
    """Test 405 for unsupported HTTP method."""
    response = client.post("/api/v1/player/2544")
    assert response.status_code == 405  # Method not allowed
