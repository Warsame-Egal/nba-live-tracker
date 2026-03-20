# NBA Live Tracker — Technical Details

## Groq Limits

- Groq RPM: `20`
- Groq TPM: `5500`

Predictions currently makes **two** Groq calls per date:
- batched insights
- enhanced analysis

## NBA API Rate Limiting

All NBA API calls are funneled through `DataCache` (shared polling + shared caches), and rate-limited so we keep a **minimum 600ms between NBA API calls** via the shared limiter.

## API Base

All HTTP routes are under: `/api/v1`

## Endpoint URLs

### Agent (tool-calling + SSE)
- `POST /api/v1/agent/ask`
- `POST /api/v1/agent/stream` (SSE, `text/event-stream`)
  - example: `POST /api/v1/agent/stream` with `{ "question": "Who is live right now?", "history": [] }`

### Live WebSockets
- `WS /api/v1/ws` (scoreboard updates + AI messages)
- `WS /api/v1/ws/{game_id}/play-by-play` (play-by-play updates)

### Scoreboard / Boxscore
- `GET /api/v1/scoreboard/today`
- `GET /api/v1/scoreboard/team/{team_id}/roster/{season}`
- `GET /api/v1/scoreboard/game/{game_id}/boxscore`
- `GET /api/v1/scoreboard/game/{game_id}/hustle`
- `GET /api/v1/scoreboard/game/{game_id}/advanced`
- `GET /api/v1/scoreboard/game/{game_id}/matchups`
- `GET /api/v1/scoreboard/game/{game_id}/play-by-play`
  - example: `GET /api/v1/scoreboard/game/0022400001/hustle`
  - example: `GET /api/v1/scoreboard/game/0022400001/advanced`
  - example: `GET /api/v1/scoreboard/game/0022400001/matchups`

### Game Detail + Summaries
- `GET /api/v1/game/{game_id}/detail`
- `GET /api/v1/game/{game_id}/summary`
- `GET /api/v1/game/{game_id}/recap`
  - example: `GET /api/v1/game/0022400001/summary`
  - example: `GET /api/v1/game/0022400001/recap`

### Live AI (insights, lead change, key moments, win probability)
- `GET /api/v1/scoreboard/insights`
- `GET /api/v1/scoreboard/game/{game_id}/lead-change`
- `GET /api/v1/scoreboard/game/{game_id}/key-moments`
- `GET /api/v1/scoreboard/game/{game_id}/win-probability`

### Predictions
- `GET /api/v1/predictions/date/{date}`

### Compare (head-to-head player comparison)
- `GET /api/v1/compare/search?q=...`
- `GET /api/v1/compare/seasons/{player_id}`
- `GET /api/v1/compare/{player1_id}/{player2_id}`
  - example: `GET /api/v1/compare/search?q=lebron`
  - example: `GET /api/v1/compare/seasons/2544`
  - example: `GET /api/v1/compare/2544/203507?season1=2024-25&season2=2024-25&last_n_games=20`

### Player Advanced Endpoints
- `GET /api/v1/player/{player_id}/shooting-zones`
- `GET /api/v1/player/{player_id}/clutch`
- `GET /api/v1/player/{player_id}/year-over-year`
- `GET /api/v1/player/{player_id}/passing`
- `GET /api/v1/player/{player_id}/defense`
- `GET /api/v1/player/{player_id}/splits`
- `GET /api/v1/player/{player_id}/shooting-splits`

### League
- `GET /api/v1/league/leaders`
- `GET /api/v1/league/hustle-leaders`
- `GET /api/v1/league/team-clutch`
- `GET /api/v1/league/playoff-picture`

## WebSocket Behavior (Message Shapes)

Scoreboard WebSocket (`/api/v1/ws`) sends:
- an initial scoreboard payload immediately after connect
- additional AI messages when available:
  - `{ "type": "insights", "data": ... }`
  - `{ "type": "key_moments", "data": { "moments_by_game": ... } }`
  - `{ "type": "win_probability", "data": { "probabilities_by_game": ... } }`

Key moments are cached for a rolling window and only recent moments are pushed to avoid flooding.

## Caching / TTL (Important)

- Win probability TTL:
  - `30s` for live games
  - `1h` for final games
- Game summary TTL:
  - `24h`, with a bounded cache (`max 200 entries`, LRU)
- Player stats cache:
  - `_player_stats_cache`: `500 entries`, `1h TTL`

