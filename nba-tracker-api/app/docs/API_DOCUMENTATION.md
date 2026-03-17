# NBA Live API Documentation

REST API and WebSocket service for real-time NBA game data, player statistics, team information, and game predictions.

Base URL: http://localhost:8000  
API Version: v1  
API Prefix: /api/v1

## Table of Contents

- [REST Endpoints](#rest-endpoints)
  - [Health Check](#health-check)
  - [Config Check](#config-check)
  - [Players](#players)
  - [Teams](#teams)
  - [Schedule](#schedule)
  - [Standings](#standings)
  - [Scoreboard](#scoreboard)
  - [Search](#search)
  - [Predictions](#predictions)
  - [League](#league)
- [WebSocket Endpoints](#websocket-endpoints)
  - [Live Scoreboard](#live-scoreboard-updates)
  - [Play-by-Play](#live-play-by-play-updates)
- [Rate Limiting](#rate-limiting)
- [Data Cache Service](#data-cache-service)
- [Error Handling](#error-handling)

## REST Endpoints

### Health Check

Check if API is running.

```http
GET /
```

**Response:**

```json
{
  "message": "NBA Live API is running"
}
```

**Example:**

```bash
curl http://localhost:8000/
```

---

### Config Check

Check if Groq API key is configured. Used for debugging.

```http
GET /api/v1/config/check
```

**Response:**

```json
{
  "groq_configured": true,
  "groq_key_length": 64
}
```

**Example:**

```bash
curl http://localhost:8000/api/v1/config/check
```

---

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

**Parameters:**

- `search_term` (string, required) - Player name to search for

**Example:**

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
    "TEAM_NAME": "Los Angeles Lakers"
  }
]
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

**Response:**

```json
{
  "points_leaders": [...],
  "rebounds_leaders": [...],
  "assists_leaders": [...],
  "steals_leaders": [...],
  "blocks_leaders": [...]
}
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

**Response:**

```json
[
  {
    "PERSON_ID": 2544,
    "PLAYER_FIRST_NAME": "LeBron",
    "PLAYER_LAST_NAME": "James",
    "PTS": 28.5
  }
]
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

**Response:**

```json
{
  "player_id": "2544",
  "season": "2024-25",
  "games": [
    {
      "game_id": "0022400123",
      "game_date": "2024-10-15",
      "matchup": "LAL @ GSW",
      "PTS": 28,
      "REB": 7,
      "AST": 8
    }
  ]
}
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

**Response:**

```json
[
  {
    "PERSON_ID": 2544,
    "PLAYER_FIRST_NAME": "LeBron",
    "PLAYER_LAST_NAME": "James",
    "TEAM_NAME": "Los Angeles Lakers",
    "POSITION": "F"
  }
]
```

---

### Teams

#### Get Team Details

Get team info including arena, owner, and coach.

```http
GET /api/v1/teams/{team_id}
```

**Parameters:**

- `team_id` (integer, required) - NBA team ID (e.g., 1610612747)

**Example:**

```bash
curl http://localhost:8000/api/v1/teams/1610612747
```

**Response:**

```json
{
  "team_id": 1610612747,
  "team_name": "Los Angeles Lakers",
  "team_city": "Los Angeles",
  "arena": "Crypto.com Arena",
  "owner": "...",
  "coach": "..."
}
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

**Response:**

```json
{
  "points_per_game": [...],
  "rebounds_per_game": [...],
  "assists_per_game": [...]
}
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

**Response:**

```json
{
  "team_id": 1610612747,
  "season": "2024-25",
  "games": [
    {
      "game_id": "0022400123",
      "game_date": "2024-10-15",
      "matchup": "LAL @ GSW",
      "PTS": 112,
      "REB": 45,
      "AST": 28
    }
  ]
}
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

**Response:**

```json
{
  "team_id": 1610612747,
  "season": "2024-25",
  "players": [
    {
      "player_id": 2544,
      "name": "LeBron James",
      "PTS": 25.5,
      "REB": 7.2,
      "AST": 8.1
    }
  ]
}
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

**Response:**

```json
{
  "team_id": 1610612747,
  "season": "2024-25",
  "players": [...],
  "coaches": [...]
}
```

---

### Schedule

#### Get Games for Date

Get all games scheduled or completed for a specific date.

```http
GET /api/v1/schedule/date/{date}
```

**Parameters:**

- `date` (string, required) - Date format YYYY-MM-DD (e.g., "2024-01-15")

**Example:**

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
      "home_team": {...},
      "away_team": {...},
      "game_status": "Final"
    }
  ]
}
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

**Response:**

```json
{
  "season": "2023-24",
  "eastern_conference": [...],
  "western_conference": [...]
}
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

**Response:**

```json
{
  "game_id": "0022400123",
  "home_team": {
    "team_id": 1610612744,
    "team_name": "Warriors",
    "score": 112,
    "players": [...]
  },
  "away_team": {
    "team_id": 1610612747,
    "team_name": "Lakers",
    "score": 108,
    "players": [...]
  }
}
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

**Response:**

```json
{
  "game_id": "0022400123",
  "plays": [
    {
      "action_number": 1,
      "clock": "PT12M00S",
      "period": 1,
      "team_tricode": "LAL",
      "action_type": "2pt Shot",
      "description": "Anthony Davis makes 2-pt shot from 8 ft",
      "player_name": "Anthony Davis",
      "score_home": "0",
      "score_away": "2"
    }
  ]
}
```

**Note:** For completed games, returns all plays. For live games, use the WebSocket endpoint for real-time updates.

---

#### Get AI Insights

Get AI-generated insights for all currently live games. Returns short insights about what's happening in each game.

```http
GET /api/v1/scoreboard/insights
```

**When it's used:**

- Called periodically to get insights for all live games
- Returns insights only for games with meaningful changes
- Cached for 60 seconds

**Example:**

```bash
curl http://localhost:8000/api/v1/scoreboard/insights
```

**Response:**

```json
{
  "timestamp": "2025-01-15T20:30:00Z",
  "insights": [
    {
      "game_id": "0022400123",
      "type": "lead_change",
      "text": "The Lakers have taken the lead with a 8-0 run in the 3rd quarter."
    }
  ]
}
```

---

#### Get Lead Change Explanation

Get an on-demand explanation for why the lead changed in a specific game. Uses the last 5 plays to explain the change.

```http
GET /api/v1/scoreboard/game/{game_id}/lead-change
```

**Parameters:**

- `game_id` (string, required) - Game ID

**When it's used:**

- Called when user clicks "Why?" on a lead change insight
- Cached for 60 seconds per game

**Example:**

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/lead-change
```

**Response:**

```json
{
  "summary": "The Lakers took the lead through consecutive scoring plays and a defensive stop.",
  "key_factors": [
    "Anthony Davis made a 2-point shot",
    "LeBron James converted a fast break layup",
    "Lakers forced a turnover"
  ]
}
```

---

#### Get Key Moments

Get recent key moments detected for a game. Key moments are automatically identified important plays like game-tying shots, lead changes, scoring runs, clutch plays, and big shots.

```http
GET /api/v1/scoreboard/game/{game_id}/key-moments
```

**Parameters:**

- `game_id` (string, required) - Game ID

**When it's used:**

- Called to get recent key moments for a specific game
- Returns moments from the last 5 minutes
- Key moments are also automatically sent via WebSocket when detected

**Key Moment Types:**

- `game_tying_shot` - A shot that tied the game
- `lead_change` - A play that changed which team is leading
- `scoring_run` - A team scoring 6+ points in quick succession
- `clutch_play` - An important play in the final 2 minutes with score within 5 points
- `big_shot` - A 3-pointer that extends lead to 10+ or cuts deficit to 5 or less

**Example:**

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/key-moments
```

**Response:**

```json
{
  "game_id": "0022400123",
  "moments": [
    {
      "type": "lead_change",
      "play": {
        "action_number": 145,
        "clock": "PT4M30S",
        "period": 4,
        "team_tricode": "LAL",
        "action_type": "2pt Shot",
        "description": "Anthony Davis makes 2-pt shot from 8 ft",
        "player_name": "Anthony Davis",
        "score_home": "98",
        "score_away": "97"
      },
      "timestamp": "2025-01-15T20:45:30Z",
      "context": "This shot gave the Lakers the lead with 4:30 remaining in a tight game."
    }
  ]
}
```

**Note:** Key moments are detected automatically for live games by analyzing play-by-play events. Each moment includes AI-generated context explaining why it matters. Moments older than 5 minutes are automatically removed from the cache.

---

#### Get Win Probability

Get real-time win probability for a live game. Shows the likelihood of each team winning based on current game state.

```http
GET /api/v1/scoreboard/game/{game_id}/win-probability
```

**Parameters:**

- `game_id` (string, required) - Game ID

**When it's used:**

- Called to get current win probability for a specific live game
- Returns probability data with optional history for visualization
- Win probability updates automatically via WebSocket every 8 seconds

**Example:**

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/win-probability
```

**Response:**

```json
{
  "game_id": "0022400123",
  "win_probability": {
    "home_win_prob": 0.65,
    "away_win_prob": 0.35,
    "timestamp": "2025-01-15T20:45:30Z",
    "probability_history": [
      {
        "home_win_prob": 0.62,
        "away_win_prob": 0.38
      }
    ]
  }
}
```

**Note:** Win probability is calculated by the NBA API based on play-by-play events. Returns null if the game hasn't started or data is not available. Probability values range from 0.0 to 1.0 (0% to 100%).

---

### Search

#### Search Players and Teams

Unified search that returns matching players and teams.

```http
GET /api/v1/search?q={query}
```

**Parameters:**

- `q` (string, required) - Search term (minimum 1 character)

**Example:**

```bash
curl "http://localhost:8000/api/v1/search?q=lakers"
```

**Response:**

```json
{
  "players": [
    {
      "PERSON_ID": 2544,
      "PLAYER_FIRST_NAME": "LeBron",
      "PLAYER_LAST_NAME": "James",
      "TEAM_NAME": "Los Angeles Lakers"
    }
  ],
  "teams": [
    {
      "team_id": 1610612747,
      "team_name": "Los Angeles Lakers"
    }
  ]
}
```

---

### League

#### Get League Leaders

Get top 5 players for a specific stat category (Points, Rebounds, Assists, Steals, or Blocks per game).

```http
GET /api/v1/league/leaders?stat_category={category}&season={season}
```

**Parameters:**

- `stat_category` (string, optional) - Stat category: PTS, REB, AST, STL, or BLK (default: PTS)
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**When it's used:**

- Called to display top players in the League Leaders dashboard
- Returns top 5 players sorted by the specified stat category
- Results are cached for 5 minutes to reduce API calls

**Example:**

```bash
curl "http://localhost:8000/api/v1/league/leaders?stat_category=PTS&season=2024-25"
```

**Response:**

```json
{
  "category": "PTS",
  "season": "2024-25",
  "leaders": [
    {
      "player_id": 2544,
      "name": "LeBron James",
      "team": "LAL",
      "stat_value": 28.5,
      "rank": 1,
      "games_played": 65
    }
  ]
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

- `date` (string, required) - Date format YYYY-MM-DD
- `season` (string, optional) - Season format "YYYY-YY" (default: current season)

**Example:**

```bash
curl http://localhost:8000/api/v1/predictions/date/2024-01-15?season=2024-25
```

**Response:**

```json
{
  "date": "2024-01-15",
  "season": "2024-25",
  "predictions": [
    {
      "game_id": "0022400123",
      "home_team_id": 1610612744,
      "away_team_id": 1610612747,
      "home_team_name": "Warriors",
      "away_team_name": "Lakers",
      "favored_team": "Warriors",
      "favored_prob": 0.65,
      "confidence": 0.8,
      "projected_score_home": 112.5,
      "projected_score_away": 108.2,
      "explanation": "Warriors have a 65% chance to win based on home court advantage and recent form."
    }
  ]
}
```

**Note:** Uses a simple statistical model based on team win percentages, net ratings, and home court advantage. Date must be within 1 year of today.

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

**Message Formats:**

Scoreboard updates (standard game data):

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

AI insights (sent separately when available):

```json
{
  "type": "insights",
  "data": {
    "timestamp": "2025-01-15T20:30:00Z",
    "insights": [
      {
        "game_id": "0022400123",
        "type": "lead_change",
        "text": "The Lakers have taken the lead with an 8-0 run."
      }
    ]
  }
}
```

Key moments (sent separately when detected):

```json
{
  "type": "key_moments",
  "data": {
    "moments_by_game": {
      "0022400123": [
        {
          "type": "lead_change",
          "play": {
            "action_number": 145,
            "clock": "PT4M30S",
            "period": 4,
            "team_tricode": "LAL",
            "action_type": "2pt Shot",
            "description": "Anthony Davis makes 2-pt shot from 8 ft",
            "player_name": "Anthony Davis",
            "score_home": "98",
            "score_away": "97"
          },
          "timestamp": "2025-01-15T20:45:30Z",
          "context": "This shot gave the Lakers the lead with 4:30 remaining in a tight game."
        }
      ]
    }
  }
}
```

Win probability (sent every 8 seconds for live games):

```json
{
  "type": "win_probability",
  "data": {
    "probabilities_by_game": {
      "0022400123": {
        "home_win_prob": 0.65,
        "away_win_prob": 0.35,
        "timestamp": "2025-01-15T20:45:30Z",
        "probability_history": [
          {
            "home_win_prob": 0.62,
            "away_win_prob": 0.38
          }
        ]
      }
    }
  }
}
```

**Update Frequency:**

- Scoreboard updates sent at fixed intervals (e.g., ~8 seconds for live scoreboard) when changes are detected
- AI insights generated and sent when meaningful game changes occur
- Initial data sent immediately upon connection

**How it works:**
The backend polls the NBA API at fixed intervals (e.g., ~8 seconds for live scoreboard) and caches the latest scoreboard data. WebSocket connections read from this cache, so multiple clients don't trigger multiple API calls.

When live games are detected, the backend generates batched AI insights for all games in one Groq API call. These insights are sent as separate messages with `type: "insights"` so the frontend can handle them differently from scoreboard updates.

The backend also automatically detects key moments by analyzing play-by-play events. When a key moment is detected (like a game-tying shot or lead change), it's sent as a separate message with `type: "key_moments"`. Each moment includes AI-generated context explaining why it matters.

Win probability updates are sent every 8 seconds for all live games as separate messages with `type: "win_probability"`. This provides real-time probability shifts as games progress.

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

- Updates sent at fixed intervals (e.g., ~5 seconds for play-by-play) when new plays are detected
- All historical plays sent immediately upon connection

**How it works:**
The backend polls the NBA API at fixed intervals (e.g., ~5 seconds for play-by-play) for active games and caches the latest play-by-play data. WebSocket connections read from this cache, so multiple clients watching the same game don't trigger multiple API calls.

---

## Rate Limiting

The API handles rate limiting for two different services: NBA API calls and Groq AI calls.

### NBA API Rate Limiting

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

### Groq AI Rate Limiting

**Why it exists:**
Groq has strict rate limits: 28 requests per minute (RPM) and 5800 tokens per minute (TPM). We track both and wait before making calls if we're approaching limits.

**How it works:**

- Tracks requests and tokens in rolling 60-second windows
- Automatically waits if approaching limits
- Uses batching to reduce total calls (one call for all games)
- Caches results to avoid repeated calls

**Where it applies:**

- Batched insights endpoint (`/scoreboard/insights`)
- Lead change explanations (`/scoreboard/game/{game_id}/lead-change`)
- Predictions page AI explanations

All Groq calls go through the same rate limiter. If a limit is hit, the system waits and retries automatically.

---

## Data Cache Service

The data cache service reduces NBA API calls by polling in the background and caching results.

**What it does:**

- Polls NBA API at fixed intervals (e.g., ~8 seconds for live scoreboard, ~5 seconds for play-by-play)
- Caches the latest data in memory
- WebSocket connections read from cache instead of making API calls

**Why it exists:**
If 100 people are watching the scoreboard, we don't want 100 API calls. The cache ensures only one poller exists per data type, and all WebSocket clients read from the same cached data.

**How WebSockets use it:**
WebSocket managers (`websockets_manager.py`) never call the NBA API directly. They call `data_cache.get_scoreboard()` or `data_cache.get_playbyplay()`, which returns cached data. The cache service handles all the polling and rate limiting in the background.

**Example:**

```python
from app.services.data_cache import data_cache

# Get latest cached scoreboard (no API call, reads from cache)
scoreboard = await data_cache.get_scoreboard()

# Get latest cached play-by-play for a game (no API call, reads from cache)
playbyplay = await data_cache.get_playbyplay(game_id)
```

**Result:**
Multiple WebSocket clients = one API poller. Much more efficient.

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
