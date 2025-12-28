# NBA Tracker API Documentation

A FastAPI-based REST API and WebSocket service for real-time NBA game data.

**Base URL:** `http://localhost:8000`  
**API Version:** `v1`  
**Prefix:** `/api/v1`

---

## REST Endpoints

### Players

#### Get Player Details
```http
GET /api/v1/player/{player_id}
```

Returns detailed player information including stats and recent games.

**Parameters:**
- `player_id` (string) - Player ID

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
```http
GET /api/v1/players/search/{search_term}
```

Search for players by name.

**Parameters:**
- `search_term` (string) - Player name or partial name

**Example:**
```bash
curl http://localhost:8000/api/v1/players/search/lebron
```

---

### Teams

#### Get Team Details
```http
GET /api/v1/teams/{team_id}
```

Returns team information including arena, owner, and coaching staff.

**Parameters:**
- `team_id` (integer) - Team ID (e.g., 1610612747)

**Example:**
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

---

#### Get Team Roster
```http
GET /api/v1/scoreboard/team/{team_id}/roster/{season}
```

Returns full team roster for a season.

**Parameters:**
- `team_id` (integer) - Team ID
- `season` (string) - Season (e.g., "2024-25")

**Example:**
```bash
curl http://localhost:8000/api/v1/scoreboard/team/1610612747/roster/2024-25
```

---

### Schedule

#### Get Games for Date
```http
GET /api/v1/schedule/date/{date}
```

Returns all games scheduled or played on a specific date.

**Parameters:**
- `date` (string) - Date in `YYYY-MM-DD` format

**Example:**
```bash
curl http://localhost:8000/api/v1/schedule/date/2024-01-15
```

**Response:**
```json
{
  "games": [
    {
      "game_id": "0022400123",
      "game_date": "2024-01-15T19:00:00",
      "matchup": "LAL @ GSW",
      "game_status": "Final",
      "home_team": {
        "team_abbreviation": "GSW",
        "points": 128
      },
      "away_team": {
        "team_abbreviation": "LAL",
        "points": 121
      }
    }
  ]
}
```

---

### Standings

#### Get Season Standings
```http
GET /api/v1/standings/season/{season}
```

Returns NBA standings for a season with conference rankings and records.

**Parameters:**
- `season` (string) - Season (e.g., "2023-24")

**Example:**
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
      "win_pct": 0.780,
      "current_streak_str": "W3"
    }
  ]
}
```

---

### Scoreboard

#### Get Box Score
```http
GET /api/v1/scoreboard/game/{game_id}/boxscore
```

Returns detailed box score with team and player statistics.

**Parameters:**
- `game_id` (string) - Game ID (e.g., "0022400123")

**Example:**
```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/boxscore
```

**Response:**
```json
{
  "game_id": "0022400123",
  "status": "Final",
  "home_team": {
    "team_name": "Golden State Warriors",
    "score": 128,
    "players": [
      {
        "name": "Stephen Curry",
        "points": 32,
        "rebounds": 5,
        "assists": 8
      }
    ]
  },
  "away_team": {
    "team_name": "Los Angeles Lakers",
    "score": 121,
    "players": [...]
  }
}
```

---

### Search

#### Search Players and Teams
```http
GET /api/v1/search?q={query}
```

Combined search for players and teams.

**Query Parameters:**
- `q` (string, required) - Search term

**Example:**
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

---

## WebSocket Endpoints

### Live Scoreboard Updates

Real-time scoreboard updates broadcast to all connected clients.

**Endpoint:** `ws://localhost:8000/api/v1/ws`

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle scoreboard updates
  console.log(data);
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
          }
        }
      }
    ]
  }
}
```

**Update Frequency:** Every 30 seconds when changes detected

---

### Live Play-by-Play Updates

Real-time play-by-play updates for a specific game.

**Endpoint:** `ws://localhost:8000/api/v1/ws/{game_id}/play-by-play`

**Parameters:**
- `game_id` (string) - Game ID

**Connection:**
```javascript
const gameId = '0022400123';
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/${gameId}/play-by-play`);

ws.onopen = () => {
  console.log('Connected to play-by-play');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle play-by-play updates
  console.log(data);
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
      "team_tricode": "LAL",
      "score_home": 0,
      "score_away": 2,
      "action_type": "2pt Shot",
      "description": "Anthony Davis makes 2-pt shot from 8 ft"
    }
  ]
}
```

**Update Frequency:** Every 2 seconds when new plays detected

---

## WebSocket Implementation

### Backend Architecture

The WebSocket system uses manager classes that handle connections and broadcasting:

**ScoreboardWebSocketManager:**
- Maintains set of active connections
- Background task fetches scoreboard every 30 seconds
- Broadcasts updates only when scores/status change
- Throttles updates (min 5 seconds between updates per game)

**PlayByPlayWebSocketManager:**
- Manages connections per game (`{game_id: Set[WebSocket]}`)
- Fetches play-by-play every 2 seconds for active games
- Broadcasts when new plays are detected

**Lifecycle:**
1. App starts → Background tasks begin
2. Client connects → Manager accepts and sends initial data
3. Background loop → Fetches data, checks for changes, broadcasts
4. Client disconnects → Manager cleans up connection

### Frontend Implementation

**Scoreboard WebSocket Service:**
```typescript
class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<(data: ScoreboardResponse) => void> = new Set();

  connect(url: string) {
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(callback => callback(data));
    };
    // Auto-reconnect on close
  }

  subscribe(callback: (data: ScoreboardResponse) => void) {
    this.listeners.add(callback);
  }
}
```

**Usage in React:**
```typescript
useEffect(() => {
  WebSocketService.connect(WS_URL);
  const handleUpdate = (data: ScoreboardResponse) => {
    setGames(data.scoreboard.games);
  };
  WebSocketService.subscribe(handleUpdate);
  
  return () => {
    WebSocketService.unsubscribe(handleUpdate);
    WebSocketService.disconnect();
  };
}, []);
```

---

## Error Handling

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Response:**
```json
{
  "detail": "Player not found with ID: 99999"
}
```

---

## Interactive Docs

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Health Check

```http
GET /health
```

Returns API health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "NBA Tracker API",
  "version": "1.0.0"
}
```

