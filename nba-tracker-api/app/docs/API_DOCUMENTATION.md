# NBA Live API Documentation

REST API and WebSocket service for real-time NBA game data, player statistics, team information, and game predictions.

**Base URL:** `http://localhost:8000`  
**API Version:** `v1`  
**API Prefix:** `/api/v1`

---

## Table of Contents

- [REST Endpoints](#rest-endpoints)
  - [Players](#players)
  - [Teams](#teams)
  - [Schedule](#schedule)
  - [Standings](#standings)
  - [Scoreboard](#scoreboard)
  - [Search](#search)
  - [Predictions](#predictions)
- [WebSocket Endpoints](#websocket-endpoints)
  - [Live Scoreboard](#live-scoreboard-updates)
  - [Play-by-Play](#live-play-by-play-updates)
- [Rate Limiting](#rate-limiting)
- [Data Cache Service](#data-cache-service)
- [Error Handling](#error-handling)

---

## REST Endpoints

### Players

#### Get Player Details

Get player info including current season stats and recent games.

```http
GET /api/v1/player/{player_id}
```

**Parameters:**
- `player_id` (string, required) - NBA player ID (e.g., "2544")

**Example:**
```bash
curl http://localhost:8000/api/v1/player/2544
```

**Response:**
```json
{
  "PERSON_ID": 2544,
  "PLAYER_FIRST_NAME": "LeBron",
  "PLAYER_LAST_NAME": "James",
  "TEAM_NAME": "Los Angeles Lakers",
  "JERSEY_NUMBER": "6",
  "POSITION": "F",
  "PTS": 25.5,
  "REB": 7.2,
  "AST": 8.1,
  "recent_games": [...]
}
```

---

#### Search Players

Search for players by name. Returns up to 20 results.

```http
GET /api/v1/players/search/{search_term}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/players/search/lebron
```

---

#### Get Season Leaders

Get top 5 players for Points, Rebounds, Assists, Steals, and Blocks per game.

```http
GET /api/v1/players/season-leaders?season={season}
```

**Parameters:**
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/players/season-leaders?season=2024-25
```

---

#### Get Top Players By Stat

Get top N players for a specific stat category.

```http
GET /api/v1/players/top-by-stat?season={season}&stat={stat}&top_n={top_n}
```

**Parameters:**
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)
- `stat` (string, optional) - Stat to sort by: PTS, REB, AST, STL, BLK (default: PTS)
- `top_n` (integer, optional) - Number of players to return, 1-50 (default: 10)

**Example:**
```bash
curl "http://localhost:8000/api/v1/players/top-by-stat?season=2024-25&stat=PTS&top_n=10"
```

---

#### Get Player Game Log

Get game log for a player with detailed stats for each game.

```http
GET /api/v1/player/{player_id}/game-log?season={season}
```

**Parameters:**
- `player_id` (string, required) - NBA player ID
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/player/2544/game-log?season=2024-25
```

---

#### Get League Roster

Get all active players in the league.

```http
GET /api/v1/players/league-roster
```

**Example:**
```bash
curl http://localhost:8000/api/v1/players/league-roster
```

---

### Teams

#### Get Team Details

Get team info including arena, owner, and coach.

```http
GET /api/v1/teams/{team_id}
```

**Parameters:**
- `team_id` (integer, required) - NBA team ID (e.g., `1610612747`)

**Example:**
```bash
curl http://localhost:8000/api/v1/teams/1610612747
```

---

#### Get Team Statistics

Get team stats for various categories sorted by performance.

```http
GET /api/v1/teams/stats?season={season}
```

**Parameters:**
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/teams/stats?season=2024-25
```

---

#### Get Team Game Log

Get game log for a team with detailed stats for each game.

```http
GET /api/v1/teams/{team_id}/game-log?season={season}
```

**Parameters:**
- `team_id` (integer, required) - NBA team ID
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/teams/1610612747/game-log?season=2024-25
```

---

#### Get Team Player Statistics

Get player statistics for a team.

```http
GET /api/v1/teams/{team_id}/player-stats?season={season}
```

**Parameters:**
- `team_id` (integer, required) - NBA team ID
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/teams/1610612747/player-stats?season=2024-25
```

---

#### Get Team Roster

Get full roster (players and coaches) for a team.

```http
GET /api/v1/scoreboard/team/{team_id}/roster/{season}
```

**Parameters:**
- `team_id` (integer, required) - NBA team ID
- `season` (string, required) - Season format "YYYY-YY"

**Example:**
```bash
curl http://localhost:8000/api/v1/scoreboard/team/1610612747/roster/2024-25
```

---

### Schedule

#### Get Games for Date

Get all games scheduled or completed for a specific date.

```http
GET /api/v1/schedule/date/{date}
```

**Parameters:**
- `date` (string, required) - Date format `YYYY-MM-DD` (e.g., "2024-01-15")

**Example:**
```bash
curl http://localhost:8000/api/v1/schedule/date/2024-01-15
```

---

### Standings

#### Get Season Standings

Get NBA standings for a season including win/loss records and playoff positions.

```http
GET /api/v1/standings/season/{season}
```

**Parameters:**
- `season` (string, required) - Season format "YYYY-YY" (e.g., "2023-24")

**Example:**
```bash
curl http://localhost:8000/api/v1/standings/season/2023-24
```

---

### Scoreboard

#### Get Box Score

Get detailed box score with team and player stats for a game.

```http
GET /api/v1/scoreboard/game/{game_id}/boxscore
```

**Parameters:**
- `game_id` (string, required) - Game ID (e.g., "0022400123")

**Example:**
```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/boxscore
```

**Note:** For games that haven't started, returns empty box score with team names, but scores/stats are 0.

---

#### Get Play-by-Play

Get all play-by-play events for a game. Works for both live and completed games.

```http
GET /api/v1/scoreboard/game/{game_id}/play-by-play
```

**Parameters:**
- `game_id` (string, required) - Game ID

**Example:**
```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/play-by-play
```

**Note:** For completed games, returns all plays. For live games, use the WebSocket endpoint for real-time updates.

---

### Search

#### Search Players and Teams

Unified search that returns matching players and teams.

```http
GET /api/v1/search?q={query}
```

**Parameters:**
- `q` (string, required) - Search term

**Example:**
```bash
curl "http://localhost:8000/api/v1/search?q=lakers"
```

**Response:**
```json
{
  "players": [...],
  "teams": [...]
}
```

---

### Predictions

#### Get Game Predictions for Date

Get statistical predictions for all games on a specific date.

```http
GET /api/v1/predictions/date/{date}?season={season}
```

**Parameters:**
- `date` (string, required) - Date format `YYYY-MM-DD`
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**
```bash
curl http://localhost:8000/api/v1/predictions/date/2024-01-15?season=2024-25
```

---

## WebSocket Endpoints

The API provides real-time updates via WebSocket connections for live game data.

### Live Scoreboard Updates

Real-time scoreboard updates broadcast to all connected clients.

**Endpoint:** `ws://localhost:8000/api/v1/ws`

**Connection Example:**
```javascript
const ws = new WebSocket("ws://localhost:8000/api/v1/ws");

ws.onopen = () => {
  console.log("Connected to scoreboard updates");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Scoreboard update:", data);
};
```

**Message Format:**
```json
{
  "scoreboard": {
    "gameDate": "2024-01-15",
    "games": [
      {
        "gameId": "0022400123",
        "gameStatusText": "Live",
        "period": 3,
        "gameClock": "7:28",
        "homeTeam": {
          "teamId": 1610612744,
          "teamName": "Warriors",
          "teamTricode": "GSW",
          "score": 85
        },
        "awayTeam": {
          "teamId": 1610612747,
          "teamName": "Lakers",
          "teamTricode": "LAL",
          "score": 78
        }
      }
    ]
  }
}
```

**Update Frequency:**
- Updates sent every 8 seconds when changes are detected
- Initial data sent immediately upon connection

**How it works:**
The backend polls the NBA API every 8 seconds and caches the latest scoreboard data. WebSocket connections read from this cache, so multiple clients don't trigger multiple API calls.

---

### Live Play-by-Play Updates

Real-time play-by-play updates for a specific game.

**Endpoint:** `ws://localhost:8000/api/v1/ws/{game_id}/play-by-play`

**Parameters:**
- `game_id` (string, required) - Game ID for play-by-play updates

**Connection Example:**
```javascript
const gameId = "0022400123";
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/ws/${gameId}/play-by-play`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("New play:", data);
};
```

**Message Format:**
```json
{
  "game_id": "0022400123",
  "plays": [
    {
      "action_number": 1,
      "clock": "PT12M00S",
      "period": 1,
      "team_tricode": "LAL",
      "score_home": "0",
      "score_away": "2",
      "action_type": "2pt Shot",
      "description": "Anthony Davis makes 2-pt shot from 8 ft",
      "player_name": "Anthony Davis"
    }
  ]
}
```

**Update Frequency:**
- Updates sent every 5 seconds when new plays are detected
- All historical plays sent immediately upon connection

**How it works:**
The backend polls the NBA API every 5 seconds for active games and caches the latest play-by-play data. WebSocket connections read from this cache, so multiple clients watching the same game don't trigger multiple API calls.

---

## Rate Limiting

The API automatically handles rate limiting for NBA API calls to prevent throttling.

**Why it exists:**
The NBA API can throttle or block requests if too many calls are made too quickly. Our backend waits at least 600ms between each NBA API call to stay within limits.

**How it works:**
```python
from app.utils.rate_limiter import rate_limit

# Before each NBA API call
await rate_limit()
# Now safe to make the API call
```

All REST endpoints that call the NBA API automatically use rate limiting. You don't need to do anything - it's handled automatically.

---

## Data Cache Service

The data cache service reduces NBA API calls by polling in the background and caching results.

**What it does:**
- Polls NBA API at fixed intervals (scoreboard every 8 seconds, play-by-play every 5 seconds)
- Caches the latest data in memory
- WebSocket connections read from cache instead of making API calls

**Why it exists:**
Multiple clients watching the same game would trigger multiple API calls. The cache ensures only one poller exists per data type, and all WebSocket clients read from the same cached data.

**Example:**
```python
from app.services.data_cache import data_cache

# Get latest cached scoreboard (no API call)
scoreboard = await data_cache.get_scoreboard()

# Get latest cached play-by-play for a game (no API call)
playbyplay = await data_cache.get_playbyplay(game_id)
```

The cache is automatically started when the app starts and stopped when the app shuts down.

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format

All errors use this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Examples:**

```json
{
  "detail": "Player not found with ID: 99999"
}
```

```json
{
  "detail": "Invalid date format. Expected YYYY-MM-DD"
}
```

### WebSocket Error Handling

WebSocket connections may close unexpectedly. Recommended practices:

1. **Implement reconnection logic** - Automatically reconnect if connection drops
2. **Handle connection errors** - Listen for `onerror` events
3. **Graceful degradation** - Fall back to polling REST endpoints if WebSocket fails

**Example Reconnection Pattern:**
```javascript
class WebSocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.shouldReconnect = true;
  }

  connect(url) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    this.url = url;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket disconnected (code: ${event.code})`);
      this.socket = null;

      if (this.shouldReconnect && this.url) {
        setTimeout(() => {
          if (this.shouldReconnect && this.url) {
            this.connect(this.url);
          }
        }, 5000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.url = null;
  }
}
```

---

## Interactive Documentation

Interactive API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Health Check

Check if API is running:

```http
GET /
```

**Response:**
```json
{
  "message": "NBA Live API is running"
}
```
