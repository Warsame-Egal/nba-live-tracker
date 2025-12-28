# NBA Tracker API v1 - Quick Reference

A quick reference guide for all available API endpoints.

## Base URL

```
http://localhost:8000/api/v1
```

## Endpoints Overview

### Players

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/player/{player_id}` | Get player details and stats |
| `GET` | `/players/search/{search_term}` | Search players by name |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/teams/{team_id}` | Get team details |
| `GET` | `/scoreboard/team/{team_id}/roster/{season}` | Get team roster |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/schedule/date/{date}` | Get games for a date (YYYY-MM-DD) |

### Standings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/standings/season/{season}` | Get league standings (YYYY-YY format) |

### Scoreboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/scoreboard/game/{game_id}/boxscore` | Get game box score |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q={query}` | Search players and teams |

### WebSockets

| Endpoint | Description |
|----------|-------------|
| `ws://host/api/v1/ws` | Live scoreboard updates |
| `ws://host/api/v1/ws/{game_id}/play-by-play` | Real-time play-by-play for a game |

## Example Responses

### Search Response

```json
{
  "players": [
    {
      "id": 2544,
      "name": "LeBron James",
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
```

## Quick Examples

```bash
# Get player
curl http://localhost:8000/api/v1/player/2544

# Search players
curl http://localhost:8000/api/v1/players/search/lebron

# Get team
curl http://localhost:8000/api/v1/teams/1610612747

# Get games for date
curl http://localhost:8000/api/v1/schedule/date/2024-01-15

# Get standings
curl http://localhost:8000/api/v1/standings/season/2023-24

# Search
curl "http://localhost:8000/api/v1/search?q=lakers"
```

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or visit http://localhost:8000/docs
