# NBA Tracker API Documentation

REST API and WebSocket service for real-time NBA game data, player statistics, and team information.

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

Retrieve player information including current season stats and recent game performances.

```http
GET /api/v1/player/{player_id}
```

**Parameters:**

- `player_id` (string, required) - NBA player ID (e.g., "2544")

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

- `200 OK` - Success
- `404 Not Found` - Player not found
- `500 Internal Server Error` - Server error

---

#### Search Players

Search for players by name. Returns up to 20 matching results.

```http
GET /api/v1/players/search/{search_term}
```

**Parameters:**

- `search_term` (string, required) - Player name to search for

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

- `200 OK` - Success (may return empty array)
- `500 Internal Server Error` - Server error

---

### Teams

#### Get Team Details

Retrieve team information including arena details, ownership, and coaching staff.

```http
GET /api/v1/teams/{team_id}
```

**Parameters:**

- `team_id` (integer, required) - NBA team ID (e.g., `1610612747`)

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

- `200 OK` - Success
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

---

#### Get Team Roster

Retrieve the complete roster including all players and coaching staff for a specific season.

```http
GET /api/v1/scoreboard/team/{team_id}/roster/{season}
```

**Parameters:**

- `team_id` (integer, required) - NBA team ID
- `season` (string, required) - Season format "YYYY-YY" (e.g., "2024-25")

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

- `200 OK` - Success
- `404 Not Found` - Team or season not found
- `500 Internal Server Error` - Server error

---

### Schedule

#### Get Games for Date

Retrieve all games scheduled or completed for a specific date. Includes game leaders with season averages for upcoming and completed games.

```http
GET /api/v1/schedule/date/{date}
```

**Parameters:**

- `date` (string, required) - Date format `YYYY-MM-DD` (e.g., "2024-01-15")

**Example Request:**

```bash
curl http://localhost:8000/api/v1/schedule/date/2024-01-15
```

**Response:**

```json
{
  "games": [
    {
      "game_id": "0022400123",
      "game_date": "2024-01-15",
      "game_time_utc": "2024-01-15T19:00:00Z",
      "matchup": "LAL @ GSW",
      "game_status": "Final",
      "arena": "Crypto.com Arena",
      "home_team": {
        "team_id": 1610612744,
        "team_abbreviation": "GSW",
        "points": 128
      },
      "away_team": {
        "team_id": 1610612747,
        "team_abbreviation": "LAL",
        "points": 121
      },
      "top_scorer": {
        "name": "Stephen Curry",
        "points": 32
      },
      "gameLeaders": {
        "homeLeaders": {
          "personId": 201939,
          "name": "Stephen Curry",
          "jerseyNum": "30",
          "position": "G",
          "teamTricode": "GSW",
          "points": 26.4,
          "rebounds": 4.5,
          "assists": 5.1
        },
        "awayLeaders": {
          "personId": 2544,
          "name": "LeBron James",
          "jerseyNum": "6",
          "position": "F",
          "teamTricode": "LAL",
          "points": 25.5,
          "rebounds": 7.2,
          "assists": 8.1
        }
      }
    }
  ]
}
```

**Response Fields:**

- `game_time_utc` - Game start time in UTC, null if not available
- `gameLeaders` - Top players from each team with season averages
  - `homeLeaders` / `awayLeaders` - Player info with `personId`, `name`, `jerseyNum`, `position`, `teamTricode`, and season averages (`points`, `rebounds`, `assists`)

**Status Codes:**

- `200 OK` - Success (may be empty array)
- `400 Bad Request` - Invalid date format
- `500 Internal Server Error` - Server error

---

### Standings

#### Get Season Standings

Retrieve NBA standings for a season including win/loss records, conference rankings, and playoff positions.

```http
GET /api/v1/standings/season/{season}
```

**Parameters:**

- `season` (string, required) - Season format "YYYY-YY" (e.g., "2023-24")

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

- `200 OK` - Success
- `404 Not Found` - Season not found
- `500 Internal Server Error` - Server error

---

### Scoreboard

#### Get Box Score

Retrieve detailed box score with team and player statistics for a specific game. Returns empty data structure if the game hasn't started yet.

```http
GET /api/v1/scoreboard/game/{game_id}/boxscore
```

**Parameters:**

- `game_id` (string, required) - Game ID (e.g., "0022400123")

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
        "player_id": 201939,
        "name": "Stephen Curry",
        "position": "G",
        "jerseyNum": "30",
        "minutes": "36:45",
        "points": 32,
        "rebounds": 5,
        "assists": 8,
        "steals": 2,
        "blocks": 0,
        "turnovers": 3
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

**Note:** For games that haven't started, returns empty box score with team names, but scores/stats are 0.

**Status Codes:**

- `200 OK` - Success (may be empty if game hasn't started)
- `404 Not Found` - Game not found
- `500 Internal Server Error` - Server error

---

### Search

#### Search Players and Teams

Unified search endpoint that returns matching players and teams in a single response.

```http
GET /api/v1/search?q={query}
```

**Query Parameters:**

- `q` (string, required) - Search term for players or teams

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

- `200 OK` - Success (may return empty arrays)
- `400 Bad Request` - Missing or invalid query
- `500 Internal Server Error` - Server error

---

## WebSocket Endpoints

The API provides real-time updates via WebSocket connections for live game data.

### Live Scoreboard Updates

Real-time scoreboard updates broadcast to all connected clients. Updates are sent automatically when scores or game status changes.

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
        "gameStatusText": "Live",
        "period": 3,
        "gameClock": "7:28",
        "homeTeam": {
          "teamId": 1610612744,
          "teamName": "Warriors",
          "teamTricode": "GSW",
          "score": 85,
          "wins": 25,
          "losses": 15
        },
        "awayTeam": {
          "teamId": 1610612747,
          "teamName": "Lakers",
          "teamTricode": "LAL",
          "score": 78,
          "wins": 22,
          "losses": 18
        },
        "gameLeaders": {
          "homeLeaders": {
            "personId": 201939,
            "name": "Stephen Curry",
            "jerseyNum": "30",
            "position": "G",
            "teamTricode": "GSW",
            "points": 28.0,
            "rebounds": 4.0,
            "assists": 6.0
          },
          "awayLeaders": {
            "personId": 2544,
            "name": "LeBron James",
            "jerseyNum": "6",
            "position": "F",
            "teamTricode": "LAL",
            "points": 22.0,
            "rebounds": 8.0,
            "assists": 7.0
          }
        }
      }
    ]
  }
}
```

**Game Leaders:**

- Live games: `points`, `rebounds`, `assists` are current game stats (integers)
- Upcoming/past games: `points`, `rebounds`, `assists` are season averages (floats)
- Includes `jerseyNum` and `position` for all games

**Update Frequency:**

- Updates are sent every 30 seconds when changes are detected
- Initial data is sent immediately upon connection

---

### Live Play-by-Play Updates

Real-time play-by-play updates for a specific game. Receives all game events (shots, fouls, timeouts, etc.) as they occur.

**Endpoint:** `ws://localhost:8000/api/v1/ws/{game_id}/play-by-play`  
**Protocol:** WebSocket

**Parameters:**

- `game_id` (string, required) - Game ID for play-by-play updates

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

- Updates are sent every 2 seconds when new plays are detected
- All historical plays are sent immediately upon connection

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

1. **Implement reconnection logic** - Automatically reconnect if the connection drops
2. **Handle connection errors** - Listen for `onerror` events and implement proper error handling
3. **Graceful degradation** - Fall back to polling REST endpoints if WebSocket fails

**Example Reconnection Pattern (JavaScript):**

```javascript
class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.shouldReconnect = true;
    this.reconnectDelay = 5000;
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket closed (code: ${event.code})`);
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };
  }

  handleMessage(data) {
    // Implement your message handling logic
    console.log("Received:", data);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Usage
const wsService = new WebSocketService("ws://localhost:8000/api/v1/ws");
wsService.connect();
```

**Example Reconnection Pattern (Python):**

```python
import asyncio
import websockets
import json

class WebSocketClient:
    def __init__(self, url):
        self.url = url
        self.websocket = None
        self.should_reconnect = True
        self.reconnect_delay = 5

    async def connect(self):
        while self.should_reconnect:
            try:
                async with websockets.connect(self.url) as websocket:
                    self.websocket = websocket
                    print("WebSocket connected")
                    await self.listen()
            except websockets.exceptions.ConnectionClosed:
                if self.should_reconnect:
                    print(f"Reconnecting in {self.reconnect_delay} seconds...")
                    await asyncio.sleep(self.reconnect_delay)
            except Exception as e:
                print(f"WebSocket error: {e}")
                if self.should_reconnect:
                    await asyncio.sleep(self.reconnect_delay)

    async def listen(self):
        async for message in self.websocket:
            data = json.loads(message)
            await self.handle_message(data)

    async def handle_message(self, data):
        print(f"Received: {data}")

    def disconnect(self):
        self.should_reconnect = False
        if self.websocket:
            asyncio.create_task(self.websocket.close())

# Usage
client = WebSocketClient("ws://localhost:8000/api/v1/ws")
asyncio.run(client.connect())
```

---

## Interactive Documentation

Interactive API docs:

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
  "message": "NBA Live Tracker API is running"
}
```

---

## Best Practices

### Request Handling

1. **Use WebSockets for Real-Time Data**
   - Connect to WebSocket endpoints for live scoreboard and play-by-play updates
   - Avoid polling REST endpoints repeatedly for real-time data
   - WebSocket connections are more efficient and reduce server load

2. **Error Handling**
   - Always check HTTP status codes before processing responses
   - Implement retry logic with exponential backoff for network errors
   - Handle edge cases gracefully (empty responses, malformed data)

3. **Caching**
   - Cache static data like team rosters and player profiles
   - Use appropriate cache expiration times (e.g., 1 hour for rosters)
   - Don't cache live game data - use WebSockets instead

4. **Rate Limiting Considerations**
   - Space out API calls to avoid overwhelming the server
   - Wait at least 1-2 seconds between consecutive requests
   - Use WebSocket connections instead of frequent polling

5. **Empty Responses**
   - Some endpoints return empty arrays or null values (e.g., games that haven't started)
   - Always check if data exists before accessing nested properties
   - Provide fallback UI states for empty data

**Example: Error Handling (JavaScript)**

```javascript
async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Usage
try {
  const data = await fetchWithRetry('http://localhost:8000/api/v1/player/2544');
  console.log(data);
} catch (error) {
  console.error('Failed to fetch player:', error);
}
```

**Example: Caching (JavaScript)**

```javascript
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

async function getCachedData(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Usage
const player = await getCachedData(
  'player-2544',
  () => fetch('http://localhost:8000/api/v1/player/2544').then(r => r.json())
);
```

### WebSocket Best Practices

1. **Connection State Management**
   - Track connection state (connecting, connected, disconnected)
   - Store the WebSocket URL for reconnection attempts
   - Properly clean up connections on component unmount

2. **Connection State Handling**
   - Check `readyState` before sending messages
   - Wait for `OPEN` state before attempting to send data
   - Implement connection state listeners for UI updates

3. **Message Handling**
   - Validate incoming message structure before processing
   - Handle malformed JSON gracefully
   - Process messages asynchronously to avoid blocking the main thread

**Example: WebSocket Service (JavaScript)**

```javascript
class ScoreboardWebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.listeners = new Set();
    this.shouldReconnect = true;
    this.reconnectDelay = 5000;
    this.maxReconnectDelay = 30000;
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.socket) {
      this.socket.close();
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("Scoreboard WebSocket connected");
      this.reconnectDelay = 5000; // Reset delay on successful connection
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket closed (code: ${event.code})`);
      this.socket = null;

      if (this.shouldReconnect) {
        const delay = Math.min(this.reconnectDelay, this.maxReconnectDelay);
        setTimeout(() => {
          this.reconnectDelay *= 1.5; // Exponential backoff
          this.connect();
        }, delay);
      }
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
  }

  unsubscribe(callback) {
    this.listeners.delete(callback);
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

// Usage
const wsService = new ScoreboardWebSocketService("ws://localhost:8000/api/v1/ws");
wsService.connect();

wsService.subscribe((data) => {
  console.log("Scoreboard update:", data);
  // Update your UI here
});
```

---

## Known Issues

### Rate Limiting from NBA API

**Issue:** Making rapid consecutive calls to the API may result in errors from the underlying `nba_api` package. The NBA's official API has rate limiting that can cause requests to fail if called too quickly.

**Workaround:**
- Add delays between API calls (minimum 1-2 seconds)
- Implement exponential backoff retry logic
- Use WebSocket connections for real-time data instead of polling REST endpoints
- Cache responses to reduce API calls

**Example:**

```javascript
// Bad: Rapid consecutive calls
for (const playerId of playerIds) {
  await fetch(`/api/v1/player/${playerId}`); // May fail
}

// Good: Add delays between calls
for (const playerId of playerIds) {
  await fetch(`/api/v1/player/${playerId}`);
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
}
```

### Cloud Deployment Blocking

**Issue:** Cloud hosting services (AWS, Google Cloud, Azure, Heroku, etc.) are blocked from accessing `nba.com`. Since this API uses the `nba_api` Python package which makes requests to `nba.com`, the API will not work when deployed to these cloud platforms.

**Affected Services:**
- AWS (EC2, Lambda, ECS, etc.)
- Google Cloud Platform
- Microsoft Azure
- Heroku
- DigitalOcean
- Any cloud hosting provider

**Why This Happens:**
- NBA.com blocks requests from known cloud provider IP ranges
- The `nba_api` package makes direct requests to NBA's servers
- This is a limitation of the underlying data source, not this API

**Workarounds:**
1. **Deploy to a VPS or Home Server**
   - Use a Virtual Private Server (VPS) with a residential IP
   - Deploy on a home server or local machine
   - Use services that provide residential IP addresses

2. **Use a Proxy Service**
   - Route requests through a proxy with a residential IP
   - Note: This requires modifying the `nba_api` package configuration

3. **Local Development Only**
   - Run the API locally for development
   - Use tunneling services (ngrok, localtunnel) for temporary external access
   - Note: Tunneling services may also be blocked

**Current Status:**
- ✅ Works: Local development, VPS with residential IP, home servers
- ❌ Does Not Work: AWS, GCP, Azure, Heroku, DigitalOcean, other cloud providers

**Note:** This is a known limitation of accessing NBA.com's data. The API wrapper itself works correctly, but the underlying data source (NBA.com) blocks cloud providers.

---

## Rate Limiting

Currently, there are no rate limits on this API wrapper. However, please be respectful:

- Don't make excessive requests
- Use WebSocket connections for real-time data instead of polling
- Cache responses when appropriate
- Add delays between consecutive requests (1-2 seconds minimum)

**Important:** The underlying NBA API has rate limiting. Making requests too quickly may result in errors. See [Known Issues](#known-issues) for details.

---

## Support

For issues or questions:

- Check the [main README](../../README.md) for setup
- Open an issue on GitHub
- Check the interactive API docs at `/docs`
