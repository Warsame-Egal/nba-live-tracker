# Technical Details

Detailed technical information about API usage, rate limiting, and WebSocket behavior.

## API Usage Examples

### Get Player Details

```bash
curl http://localhost:8000/api/v1/player/2544
```

### Get Live Scoreboard

```bash
curl http://localhost:8000/api/v1/schedule/date/2025-01-15
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
- Predictions page (AI explanations for game predictions)
- Key moments context generation (batched)

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

- **Scoreboard:** Updates sent at fixed intervals (e.g., ~8 seconds) when changes are detected
- **Play-by-Play:** Updates sent at fixed intervals (e.g., ~5 seconds) when new plays are detected
- **AI Insights:** Generated and sent when meaningful game changes occur
- **Key Moments:** Sent automatically when detected (game-tying shots, lead changes, etc.)
- **Win Probability:** Updates sent every 8 seconds for all live games

### How It Works

The backend polls the NBA API at fixed intervals and caches the data in `data_cache.py`. WebSocket clients read from this cache, so multiple clients don't trigger multiple API calls.

**Important:** WebSockets never call the NBA API directly. They read from the cache. This means 100 people watching = 1 API call, not 100.

When live games are detected:
- Backend generates batched AI insights for all games in one Groq call
- Backend detects key moments by analyzing play-by-play events
- Backend fetches win probability for all live games
- All updates are sent via WebSocket as separate message types

### Frontend Handling

The frontend uses event listeners to handle different message types:

```javascript
// Listen for insights
window.addEventListener('websocket-insights', (event) => {
  const data = event.detail;
  // Handle insights
});

// Listen for key moments
window.addEventListener('websocket-key-moments', (event) => {
  const data = event.detail;
  // Handle key moments
});

// Listen for win probability
window.addEventListener('websocket-win-probability', (event) => {
  const data = event.detail;
  // Handle win probability
});
```

## Caching Strategy

### Data Cache

- **Scoreboard:** Polled at fixed intervals (e.g., ~8 seconds), cached in memory
- **Play-by-Play:** Polled at fixed intervals (e.g., ~5 seconds) per game, cached in memory
- **WebSocket clients read from cache** (no direct API calls)

### Insights Cache

- **Batched insights:** 60 seconds TTL
- **Lead change explanations:** 60 seconds TTL per game
- **Key moments context:** Cached per moment
- Reduces Groq API calls

### Win Probability Cache

- Cached per game in memory
- Updated every 8 seconds for live games
- Cleared when game ends

