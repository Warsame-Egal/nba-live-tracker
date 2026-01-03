# NBA Tracker API v1 - Quick Reference

Quick reference for all API endpoints.

## Base URL

```
http://localhost:8000/api/v1
```

## Endpoints

### Health Check

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/` | Health check |
| `GET` | `/api/v1/config/check` | Check Groq API key configuration |

### Players

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/player/{player_id}` | Get player details and stats |
| `GET` | `/players/search/{search_term}` | Search players by name |
| `GET` | `/players/season-leaders?season={season}` | Get season leaders |
| `GET` | `/players/top-by-stat?season={season}&stat={stat}&top_n={top_n}` | Get top players by stat |
| `GET` | `/player/{player_id}/game-log?season={season}` | Get player game log |
| `GET` | `/players/league-roster` | Get all active players |

### Teams

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/teams/{team_id}` | Get team details |
| `GET` | `/teams/stats?season={season}` | Get team statistics |
| `GET` | `/teams/{team_id}/game-log?season={season}` | Get team game log |
| `GET` | `/teams/{team_id}/player-stats?season={season}` | Get team player stats |
| `GET` | `/scoreboard/team/{team_id}/roster/{season}` | Get team roster |

### Schedule

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/schedule/date/{date}` | Get games for a date (YYYY-MM-DD) |

### Standings

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/standings/season/{season}` | Get league standings (YYYY-YY format) |

### Scoreboard

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/scoreboard/game/{game_id}/boxscore` | Get game box score |
| `GET` | `/scoreboard/game/{game_id}/play-by-play` | Get play-by-play for a game |
| `GET` | `/scoreboard/insights` | Get AI insights for all live games |
| `GET` | `/scoreboard/game/{game_id}/lead-change` | Get explanation for why lead changed |
| `GET` | `/scoreboard/game/{game_id}/key-moments` | Get recent key moments for a game |
| `GET` | `/scoreboard/game/{game_id}/win-probability` | Get win probability for a live game |

### Predictions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/predictions/date/{date}?season={season}` | Get game predictions for a date |

### League

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/league/leaders?stat_category={category}&season={season}` | Get top 5 league leaders by stat |

### Search

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/search?q={query}` | Search players and teams |

### WebSockets

| Endpoint | Description |
| -------- | ----------- |
| `ws://host/api/v1/ws` | Live scoreboard updates |
| `ws://host/api/v1/ws/{game_id}/play-by-play` | Real-time play-by-play for a game |

## Quick Examples

```bash
# Health check
curl http://localhost:8000/

# Config check
curl http://localhost:8000/api/v1/config/check

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

# Get box score
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/boxscore

# Get play-by-play
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/play-by-play

# Get AI insights
curl http://localhost:8000/api/v1/scoreboard/insights

# Get lead change explanation
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/lead-change

# Get key moments
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/key-moments

# Get win probability
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/win-probability

# Get league leaders
curl "http://localhost:8000/api/v1/league/leaders?stat_category=PTS&season=2024-25"

# Get predictions
curl http://localhost:8000/api/v1/predictions/date/2024-01-15?season=2024-25

# Search
curl "http://localhost:8000/api/v1/search?q=lakers"
```

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or visit http://localhost:8000/docs
