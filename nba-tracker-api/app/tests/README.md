# API Tests

This directory contains comprehensive tests for all API endpoints.

## Test Coverage

The test suite covers:

- ✅ Health check endpoints (`/`, `/health`)
- ✅ Player endpoints (`/api/v1/player/{player_id}`, `/api/v1/players/search/{search_term}`)
- ✅ Team endpoints (`/api/v1/teams/{team_id}`, `/api/v1/scoreboard/team/{team_id}/roster/{season}`)
- ✅ Schedule endpoints (`/api/v1/schedule/date/{date}`)
- ✅ Standings endpoints (`/api/v1/standings/season/{season}`)
- ✅ Search endpoints (`/api/v1/search?q=<term>`)
- ✅ Scoreboard endpoints (`/api/v1/scoreboard/game/{game_id}/boxscore`)
- ✅ Error handling and input validation

## Running Tests

### Run all tests:
```bash
cd nba-tracker-api
pytest
```

### Run with verbose output:
```bash
pytest -v
```

### Run specific test file:
```bash
pytest app/tests/test_endpoints.py
```

### Run specific test class:
```bash
pytest app/tests/test_endpoints.py::TestPlayerEndpoints
```

### Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

## Test Structure

- `test_main.py` - Basic app configuration tests
- `test_endpoints.py` - Comprehensive endpoint tests
- `conftest.py` - Pytest fixtures and configuration

## Test Approach

Tests use mocking to:
- Avoid external API calls (NBA API)
- No database dependencies (all data from NBA API)
- Run quickly and reliably
- Test error scenarios

## Adding New Tests

When adding new endpoints, add corresponding tests in `test_endpoints.py` following the existing pattern:

1. Create a test class (e.g., `TestNewEndpoint`)
2. Add test methods for success cases
3. Add test methods for error cases (404, 500, etc.)
4. Add test methods for input validation

Example:
```python
class TestNewEndpoint:
    @patch("app.routers.new.get_new_data")
    def test_get_new_data_success(self, mock_get_new):
        mock_get_new.return_value = {"data": "test"}
        response = client.get("/api/v1/new/endpoint")
        assert response.status_code == 200
```

