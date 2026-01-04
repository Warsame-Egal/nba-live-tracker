# Overview

How the app is organized and how data flows.

## Service Structure

**Backend Services:**

- `batched_insights.py` - Generates AI insights for all live games in one call
- `groq_client.py` - Handles Groq API calls and rate limiting
- `groq_prompts.py` - AI prompt templates (evolve over time)
- `predictions.py` - Stat-based predictions with AI explanations
- `websockets_manager.py` - Broadcasts scoreboard, play-by-play, and insights
- `data_cache.py` - Caches NBA API data to reduce calls
- `rate_limiter.py` - NBA API rate limiting (600ms between calls)

**Frontend Services:**

- `websocketService.ts` - Main scoreboard WebSocket connection
- `PlayByPlayWebSocketService.ts` - Per-game play-by-play WebSocket

## Data Flow

**Live Scoreboard:**

1. Backend polls NBA API at fixed intervals (e.g., ~8 seconds for live scoreboard) with rate limiting
2. Data cached in `data_cache.py`
3. WebSocket manager reads from cache (no direct API calls)
4. Broadcasts to all connected clients
5. Frontend receives updates and renders

**Why caching matters:**
If 10 people are watching the scoreboard, we don't make 10 API calls. We make 1 call, cache it, and all 10 WebSocket connections read from the same cache.

**AI Insights:**

1. WebSocket manager detects live games
2. Formats game data for Groq
3. Calls `batched_insights.py` (one call for all games)
4. Groq client handles rate limiting
5. Insights cached for 60 seconds
6. Sent via WebSocket as separate message type
7. Frontend displays below game rows

**Predictions:**

1. User visits predictions page
2. Backend calculates win probabilities (Python math)
3. Calls Groq for AI explanations
4. Returns predictions with insights
5. Frontend displays cards with charts and explanations

## Rate Limiting

**NBA API:**

- 600ms minimum between calls
- Applied automatically to all NBA API endpoints
- Prevents throttling from NBA.com

**Groq:**

- 28 requests per minute
- 5800 tokens per minute
- Tracked in rolling 60-second windows
- Applied to all Groq calls (insights, predictions, lead changes)

## Caching

**Data Cache:**

- Scoreboard: Polled at fixed intervals (e.g., ~8 seconds), cached in memory
- Play-by-play: Polled at fixed intervals (e.g., ~5 seconds) per game, cached in memory (limited to 20 active games)
- WebSocket clients read from cache (no direct API calls)

**Insights Cache:**

- Batched insights: 60 seconds TTL, limited to 50 entries
- Lead change explanations: 60 seconds TTL per game, limited to 20 entries
- Reduces Groq API calls

## WebSocket Message Types

The main scoreboard WebSocket sends multiple types of messages:

1. **Scoreboard updates** - Standard game data (scores, status, etc.)
2. **Insights** - AI-generated insights with `type: "insights"`
3. **Key Moments** - Automatically detected important plays with `type: "key_moments"`
4. **Win Probability** - Real-time win probability updates with `type: "win_probability"`

The frontend handles them separately. Scoreboard updates go to the game list. Insights, key moments, and win probability are handled by their respective event listeners.

```

**How it works:**
The backend periodically polls the NBA API and caches the data in `data_cache.py`. WebSocket clients read from this cache, so multiple clients don't trigger multiple API calls. When live games are detected, the backend generates AI insights using Groq and sends them via WebSocket.

**Important:** WebSockets never call the NBA API directly. They read from the cache. This means 100 people watching = 1 API call, not 100.
```
