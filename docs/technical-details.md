# Technical Details

Detailed technical information about API usage, rate limiting, and WebSocket behavior.

## API Usage Examples

### Health Check

```bash
curl http://localhost:8000/
```

### Config Check

```bash
curl http://localhost:8000/api/v1/config/check
```

### Get Player Details

```bash
curl http://localhost:8000/api/v1/player/2544
```

### Search Players

```bash
curl http://localhost:8000/api/v1/players/search/lebron
```

### Get Team Details

```bash
curl http://localhost:8000/api/v1/teams/1610612747
```

### Get Live Scoreboard

```bash
curl http://localhost:8000/api/v1/schedule/date/2025-01-15
```

### Get Standings

```bash
curl http://localhost:8000/api/v1/standings/season/2024-25
```

### Get Box Score

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/boxscore
```

### Get Play-by-Play

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/play-by-play
```

### Get AI Insights

```bash
curl http://localhost:8000/api/v1/scoreboard/insights
```

### Get Lead Change Explanation

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/lead-change
```

### Get Key Moments

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/key-moments
```

### Get Win Probability

```bash
curl http://localhost:8000/api/v1/scoreboard/game/0022400123/win-probability
```

### Get League Leaders

```bash
curl "http://localhost:8000/api/v1/league/leaders?stat_category=PTS&season=2024-25"
```

### Get Predictions

```bash
curl http://localhost:8000/api/v1/predictions/date/2024-01-15?season=2024-25
```

### Search

```bash
curl "http://localhost:8000/api/v1/search?q=lakers"
```

## Rate Limiting

### NBA API

**Rate Limit:**

- All NBA API calls wait 600ms between requests
- Prevents throttling from NBA.com
- Applied automatically to all endpoints

**Implementation:**

- Uses `rate_limiter.py` utility
- Tracks last call time globally
- Automatically waits if less than 600ms has passed
- Applied before every NBA API call

### Groq AI

**Rate Limits:**

- 28 requests per minute (RPM)
- 5800 tokens per minute (TPM)
- Tracked in rolling 60-second windows

**Implementation:**

- Uses `groq_client.py` with `GroqRateLimiter` class
- Tracks requests and tokens in rolling windows
- Automatically waits if approaching limits
- Used for insights, predictions, and lead change explanations

**Where Rate Limiting Applies:**

- Batched insights (all live games in one call)
- Lead change explanations (on-demand)
- Predictions page (AI explanations for game predictions - batched for all games)
- Key moments context generation (batched for all moments needing context)

All Groq calls go through the same rate limiter. If we hit a limit, we wait and retry.

## WebSocket Behavior

### Connection

**Main Scoreboard WebSocket:**

```
ws://localhost:8000/api/v1/ws
```

**Per-Game Play-by-Play WebSocket:**

```
ws://localhost:8000/api/v1/ws/{game_id}/play-by-play
```

### Message Types

The main scoreboard WebSocket sends multiple message types:

1. **Scoreboard Updates** - Standard game data (scores, status, teams, etc.)
2. **Insights** - AI-generated insights with `type: "insights"`
3. **Key Moments** - Automatically detected important plays with `type: "key_moments"`
4. **Win Probability** - Real-time win probability updates with `type: "win_probability"`

### Update Frequency

- **Scoreboard:** Polled every 8 seconds from NBA API, broadcast to clients every 2 seconds when changes detected
- **Play-by-Play:** Polled every 5 seconds from NBA API per game, broadcast to clients every 2 seconds when new plays detected
- **AI Insights:** Generated and sent when meaningful game changes occur (batched for all live games)
- **Key Moments:** Sent automatically when detected (game-tying shots, lead changes, etc.), only moments from last 30 seconds
- **Win Probability:** Updates sent every 8 seconds for all live games

### How It Works

The backend polls the NBA API at fixed intervals and caches the data in `data_cache.py`. WebSocket clients read from this cache, so multiple clients don't trigger multiple API calls.

**Important:** WebSockets never call the NBA API directly. They read from the cache. This means 100 people watching = 1 API call, not 100.

When live games are detected:

- Backend generates batched AI insights for all games in one Groq call
- Backend detects key moments by analyzing play-by-play events
- Backend fetches win probability for all live games
- All updates are sent via WebSocket as separate message types

```

## Caching Strategy

### Data Cache

- **Scoreboard:** Polled every 8 seconds from NBA API, cached in memory
- **Play-by-Play:** Polled every 5 seconds from NBA API per active game, cached in memory
- **WebSocket clients read from cache** (no direct API calls)
- Only active games (gameStatus == 2) are polled for play-by-play

### Insights Cache

- **Batched insights:** 60 seconds TTL
- **Lead change explanations:** 60 seconds TTL per game
- **Key moments:** Cached for 5 minutes per game (recent moments only)
- **Key moments context:** Cached permanently (until server restart) per moment
- Reduces Groq API calls

### Predictions Cache

- **Predictions:** Cached permanently (until server restart) by date+season
- **Team statistics:** 1 hour TTL by season (used for predictions)
- Once generated for a date+season, same predictions returned for all requests
- Reduces Groq API calls for prediction explanations

### League Leaders Cache

- **League leaders:** 5 minutes TTL by stat category + season
- Reduces NBA API calls for leaderboard data

### Win Probability Cache

- Cached per game in memory
- Updated every 8 seconds for live games
- Cleared when game ends

```
