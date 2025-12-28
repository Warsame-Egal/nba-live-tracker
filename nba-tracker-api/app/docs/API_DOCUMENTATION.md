# NBA Tracker API Documentation

A REST API and WebSocket service for real-time NBA game data, player statistics, team information, and more.

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
- [WebSocket Endpoints](#websocket-endpoints)
  - [Live Scoreboard](#live-scoreboard-updates)
  - [Play-by-Play](#live-play-by-play-updates)
- [Error Handling](#error-handling)
- [Interactive Documentation](#interactive-documentation)

---

## REST Endpoints

### Players

#### Get Player Details

Get information about a specific player including stats and recent game performances.

```http
GET /api/v1/player/{player_id}
```

**Parameters:**

- `player_id` (string, path, required) - The NBA player ID (e.g., "2544" for LeBron James)

**Example Request:**

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
  "recent_games": [
    {
      "GAME_DATE": "2024-01-15",
      "MATCHUP": "LAL vs. GSW",
      "PTS": 32,
      "REB": 8,
      "AST": 9
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Player found and returned
- `404 Not Found` - Player ID not found
- `500 Internal Server Error` - Server error

---

#### Search Players

Search for players by name. Returns up to 20 matching players.

```http
GET /api/v1/players/search/{search_term}
```

**Parameters:**

- `search_term` (string, path, required) - Player name or partial name to search for

**Example Request:**

```bash
curl http://localhost:8000/api/v1/players/search/lebron
```

**Response:**

```json
[
  {
    "PERSON_ID": 2544,
    "PLAYER_FIRST_NAME": "LeBron",
    "PLAYER_LAST_NAME": "James",
    "TEAM_NAME": "Los Angeles Lakers",
    "JERSEY_NUMBER": "6",
    "POSITION": "F"
  }
]
```

**Status Codes:**

- `200 OK` - Search completed (may return empty array)
- `500 Internal Server Error` - Server error

---

### Teams

#### Get Team Details

Get detailed information about a specific NBA team including arena, owner, and coaching staff.

```http
GET /api/v1/teams/{team_id}
```

**Parameters:**

- `team_id` (integer, path, required) - The NBA team ID (e.g., `1610612747` for Los Angeles Lakers)

**Example Request:**

```bash
curl http://localhost:8000/api/v1/teams/1610612747
```

**Response:**

```json
{
  "team_id": 1610612747,
  "team_name": "Lakers",
  "team_city": "Los Angeles",
  "abbreviation": "LAL",
  "year_founded": 1947,
  "arena": "Crypto.com Arena",
  "owner": "Jeanie Buss",
  "head_coach": "Darvin Ham"
}
```

**Status Codes:**

- `200 OK` - Team found and returned
- `404 Not Found` - Team ID not found
- `500 Internal Server Error` - Server error

---

#### Get Team Roster

Get the full roster (players and coaches) for a team in a specific season.

```http
GET /api/v1/scoreboard/team/{team_id}/roster/{season}
```

**Parameters:**

- `team_id` (integer, path, required) - The NBA team ID
- `season` (string, path, required) - Season in format "YYYY-YY" (e.g., "2024-25")

**Example Request:**

```bash
curl http://localhost:8000/api/v1/scoreboard/team/1610612747/roster/2024-25
```

**Response:**

```json
{
  "team_id": 1610612747,
  "season": "2024-25",
  "players": [
    {
      "PERSON_ID": 2544,
      "PLAYER": "LeBron James",
      "JERSEY": "6",
      "POSITION": "F",
      "HEIGHT": "6-9",
      "WEIGHT": "250"
    }
  ],
  "coaches": [
    {
      "COACH_ID": 1234,
      "COACH_NAME": "Darvin Ham",
      "COACH_TYPE": "Head Coach"
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Roster retrieved successfully
- `404 Not Found` - Team or season not found
- `500 Internal Server Error` - Server error

---

### Schedule

#### Get Games for Date

Get all games scheduled or played on a specific date.

```http
GET /api/v1/schedule/date/{date}
```

**Parameters:**

- `date` (string, path, required) - Date in `YYYY-MM-DD` format (e.g., "2024-01-15")

**Example Request:**

```bash
curl http://localhost:8000/api/v1/schedule/date/2024-01-15
```

**Response:**

```json
{
  "date": "2024-01-15",
  "games": [
    {
      "game_id": "0022400123",
      "game_date": "2024-01-15T19:00:00",
      "matchup": "LAL @ GSW",
      "game_status": "Final",
      "home_team": {
        "team_id": 1610612744,
        "team_abbreviation": "GSW",
        "team_name": "Warriors",
        "points": 128
      },
      "away_team": {
        "team_id": 1610612747,
        "team_abbreviation": "LAL",
        "team_name": "Lakers",
        "points": 121
      },
      "top_scorer": {
        "name": "Stephen Curry",
        "points": 32
      }
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Games retrieved (may be empty array if no games)
- `400 Bad Request` - Invalid date format
- `500 Internal Server Error` - Server error

---

### Standings

#### Get Season Standings

Get NBA standings for a season with conference rankings, win/loss records, and playoff positions.

```http
GET /api/v1/standings/season/{season}
```

**Parameters:**

- `season` (string, path, required) - Season in format "YYYY-YY" (e.g., "2023-24")

**Example Request:**

```bash
curl http://localhost:8000/api/v1/standings/season/2023-24
```

**Response:**

```json
{
  "season": "2023-24",
  "standings": [
    {
      "team_id": 1610612738,
      "team_city": "Boston",
      "team_name": "Celtics",
      "conference": "East",
      "playoff_rank": 1,
      "wins": 64,
      "losses": 18,
      "win_pct": 0.78,
      "current_streak_str": "W3",
      "home_record": "37-4",
      "away_record": "27-14"
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Standings retrieved successfully
- `404 Not Found` - Season not found
- `500 Internal Server Error` - Server error

---

### Scoreboard

#### Get Box Score

Get detailed box score with team and player statistics for a specific game.

```http
GET /api/v1/scoreboard/game/{game_id}/boxscore
```

**Parameters:**

- `game_id` (string, path, required) - The unique game ID (e.g., "0022400123")

**Example Request:**

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/boxscore
```

**Response:**

```json
{
  "game_id": "0022400123",
  "status": "Final",
  "game_date": "2024-01-15T19:00:00",
  "home_team": {
    "team_id": 1610612744,
    "team_name": "Golden State Warriors",
    "team_abbreviation": "GSW",
    "score": 128,
    "stats": {
      "points": 128,
      "field_goals_made": 45,
      "field_goals_attempted": 92,
      "three_pointers_made": 18,
      "free_throws_made": 20
    },
    "players": [
      {
        "person_id": 201939,
        "name": "Stephen Curry",
        "position": "G",
        "points": 32,
        "rebounds": 5,
        "assists": 8,
        "field_goals_made": 12,
        "field_goals_attempted": 20
      }
    ]
  },
  "away_team": {
    "team_id": 1610612747,
    "team_name": "Los Angeles Lakers",
    "team_abbreviation": "LAL",
    "score": 121,
    "stats": { ... },
    "players": [ ... ]
  }
}
```

**Status Codes:**

- `200 OK` - Box score retrieved successfully
- `404 Not Found` - Game ID not found
- `500 Internal Server Error` - Server error

---

### Search

#### Search Players and Teams

Combined search endpoint that returns both matching players and teams in a single response.

```http
GET /api/v1/search?q={query}
```

**Query Parameters:**

- `q` (string, query, required, min_length=1) - Search term for players or teams

**Example Request:**

```bash
curl "http://localhost:8000/api/v1/search?q=lakers"
```

**Response:**

```json
{
  "players": [
    {
      "id": 2544,
      "name": "LeBron James",
      "team_abbreviation": "LAL",
      "team_name": "Los Angeles Lakers"
    }
  ],
  "teams": [
    {
      "id": 1610612747,
      "name": "Los Angeles Lakers",
      "abbreviation": "LAL",
      "city": "Los Angeles"
    }
  ]
}
```

**Status Codes:**

- `200 OK` - Search completed (may return empty arrays)
- `400 Bad Request` - Query parameter missing or invalid
- `500 Internal Server Error` - Server error

---

## WebSocket Endpoints

The API provides real-time updates via WebSocket connections for live game data.

### Live Scoreboard Updates

Get real-time scoreboard updates broadcast to all connected clients. Updates are sent automatically when scores or game status changes.

**Endpoint:** `ws://localhost:8000/api/v1/ws`  
**Protocol:** WebSocket

**Connection Example (JavaScript):**

```javascript
const ws = new WebSocket("ws://localhost:8000/api/v1/ws");

ws.onopen = () => {
  console.log("Connected to scoreboard updates");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Scoreboard update:", data);
  // Update your UI with the new scores
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected from scoreboard updates");
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
        "gameStatusText": "Final",
        "period": 4,
        "homeTeam": {
          "teamId": 1610612744,
          "teamName": "Warriors",
          "teamTricode": "GSW",
          "score": 128
        },
        "awayTeam": {
          "teamId": 1610612747,
          "teamName": "Lakers",
          "teamTricode": "LAL",
          "score": 121
        },
        "gameLeaders": {
          "homeLeaders": {
            "name": "Stephen Curry",
            "points": 32,
            "rebounds": 5,
            "assists": 8
          },
          "awayLeaders": {
            "name": "LeBron James",
            "points": 28,
            "rebounds": 7,
            "assists": 9
          }
        }
      }
    ]
  }
}
```

**Update Frequency:**

- Updates are sent every 30 seconds when changes are detected
- Updates are throttled to prevent spam (minimum 5 seconds between updates per game)
- Initial data is sent immediately upon connection

---

### Live Play-by-Play Updates

Get real-time play-by-play updates for a specific game. Connect to this endpoint to receive all game events (shots, fouls, timeouts, etc.) as they happen.

**Endpoint:** `ws://localhost:8000/api/v1/ws/{game_id}/play-by-play`  
**Protocol:** WebSocket

**Parameters:**

- `game_id` (string, path, required) - The game ID to receive play-by-play updates for

**Connection Example (JavaScript):**

```javascript
const gameId = "0022400123";
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/ws/${gameId}/play-by-play`
);

ws.onopen = () => {
  console.log(`Connected to play-by-play for game ${gameId}`);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("New play:", data);
  // Add the new play to your play-by-play list
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = () => {
  console.log("Disconnected from play-by-play");
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
      "score_home": 0,
      "score_away": 2,
      "action_type": "2pt Shot",
      "description": "Anthony Davis makes 2-pt shot from 8 ft",
      "player_name": "Anthony Davis"
    },
    {
      "action_number": 2,
      "clock": "PT11M45S",
      "period": 1,
      "team_tricode": "GSW",
      "score_home": 3,
      "score_away": 2,
      "action_type": "3pt Shot",
      "description": "Stephen Curry makes 3-pt shot from 26 ft",
      "player_name": "Stephen Curry"
    }
  ]
}
```

**Update Frequency:**

- Updates are sent every 2 seconds when new plays are detected
- Only active games (live or recently finished) are monitored
- All historical plays are sent immediately upon connection

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format

All errors follow a consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Example Error Responses:**

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

WebSocket connections may close unexpectedly. Best practices:

1. **Implement reconnection logic** - Automatically reconnect if the connection drops
2. **Handle connection errors** - Listen for `onerror` events
3. **Graceful degradation** - Fall back to polling REST endpoints if WebSocket fails

**Example Reconnection Pattern:**

```javascript
function connectWebSocket(url) {
  const ws = new WebSocket(url);

  ws.onclose = () => {
    // Reconnect after 5 seconds
    setTimeout(() => connectWebSocket(url), 5000);
  };

  return ws;
}
```

---

## Interactive Documentation

The API includes interactive documentation powered by Swagger/OpenAPI:

- **Swagger UI:** http://localhost:8000/docs

  - Interactive API explorer
  - Try endpoints directly from the browser
  - See request/response schemas

- **ReDoc:** http://localhost:8000/redoc
  - Beautiful, readable documentation
  - Perfect for sharing with team members

### Health Check

Check if the API is running:

```http
GET /
```

**Response:**

```json
{
  "message": "NBA Live Tracker API is running"
}
```

---

## Rate Limiting

Currently, there are no rate limits on the API. However, please be respectful:

- Don't make excessive requests
- Use WebSocket connections for real-time data instead of polling
- Cache responses when appropriate

---

## Support

For issues, questions, or contributions:

- Check the [main README](../README.md) for setup instructions
- Open an issue on GitHub
- Review the interactive API docs at `/docs`

---

**Happy coding! 🏀**
