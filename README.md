# CourtIQ

NBA Live scores, AI insights, win probability, key moment detection, and player/team stats.

**Live Demo:** [courtiq.vercel.app](https://nba-live-tracker-delta.vercel.app)

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Live Scoreboard** | Real-time scores via WebSocket. Updates every 2–8s when data changes. |
| **AI Live Insights** | Groq insights for all live games in one batched call. |
| **Key Moments** | Detection of game-tying shots, lead changes, scoring runs, clutch plays, big shots. Each gets a one-sentence AI explanation. |
| **Win Probability** | Real-time NBA win probability, polled every 30s and pushed via WebSocket. |
| **Predictions** | Win probability (season %, recent form, net rating, home court) + AI narrative, key drivers, risk factors. |
| **Player Profiles** | Season stats, game log, shooting zones, clutch performance, splits, defense, passing. |
| **Team Pages** | Roster, game log, lineups, on/off splits, player stats. |
| **Player Compare** | Side-by-side comparison with radar chart, trend chart, scouting report, head-to-head. |
| **CourtIQ Agent** | Ask about live scores, standings, stats, predictions. |
| **MCP Server** | NBA data to Claude Desktop and Cursor via Model Context Protocol. |
| **Post-Game Recap** | Short AI recap for completed games, cached permanently. |

---

## Architecture

```
NBA API  →  DataCache (background poller)  →  WebSocket Manager  →  Browser clients
                                           →  HTTP endpoints
Groq API ←  batched_insights, key_moments, predictions, agent
```

- One background poller per data type. Scoreboard every 8s. Play-by-play every 5s per live game. Win probability every 30s.
- All WebSocket connections read from the shared cache. **100 clients = 1 NBA API call.**
- Groq calls are batched: one call for all live game insights, one for all key moment contexts, one for all prediction insights.
- Rate limiter enforces 600ms minimum between NBA API calls with an asyncio lock (no race condition).
- All caches are LRU-bounded (play-by-play: 20 games, predictions: 100, moment context: 1000, win prob: 20).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12, asyncio, WebSockets |
| AI | Groq API (llama-3.1-8b-instant) |
| NBA Data | nba_api Python package |
| Frontend | React 19, TypeScript, Material UI v6, Recharts, Vite |
| Deployment | Vercel (frontend), GCP (backend) |
| Observability | Sentry (errors), /api/v1/health (cache + Groq stats) |
| Testing | pytest (backend), TypeScript strict mode (frontend) |

---

## Running Locally

### Docker (recommended)

```bash
git clone https://github.com/Warsame-Egal/nba-live-tracker.git
cd nba-live-tracker
cp .env.example .env        # add your GROQ_API_KEY
docker-compose up --build
```

Frontend: http://localhost:3000 · API: http://localhost:8000 · Swagger: http://localhost:8000/docs

### Manual

**Backend:**
```bash
cd nba-tracker-api
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd nba-tracker
npm install && npm run dev
```

---

## API Reference

Full Swagger UI at http://localhost:8000/docs when running locally.

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Cache stats, polling status, WebSocket counts, Groq usage |
| `GET /api/v1/scoreboard/today` | Today's scoreboard from cache |
| `GET /api/v1/scoreboard/game/{id}/boxscore` | Full box score |
| `GET /api/v1/scoreboard/game/{id}/play-by-play` | Play-by-play events |
| `GET /api/v1/scoreboard/game/{id}/key-moments` | Detected key moments with AI context |
| `GET /api/v1/scoreboard/game/{id}/win-probability` | Win probability data |
| `GET /api/v1/scoreboard/game/{id}/lead-change` | AI explanation of latest lead change |
| `GET /api/v1/scoreboard/insights` | Batched AI insights for all live games |
| `GET /api/v1/game/{id}/detail` | Aggregated: score + box score + key moments + win prob + AI summary |
| `GET /api/v1/game/{id}/recap` | AI post-game recap (completed games only, cached) |
| `GET /api/v1/game/{id}/summary` | AI game summary |
| `GET /api/v1/predictions/date/{date}` | Predictions for all games on a date |
| `GET /api/v1/player/{id}` | Player season stats + game log |
| `GET /api/v1/players/search/{name}` | Player search |
| `GET /api/v1/players/season-leaders` | Season stat leaders |
| `GET /api/v1/teams/{id}` | Team info |
| `GET /api/v1/teams/{id}/game-log` | Team game log |
| `GET /api/v1/teams/{id}/lineups` | Team lineup data |
| `GET /api/v1/teams/{id}/on-off` | Player on/off splits |
| `GET /api/v1/standings/season/{season}` | Conference standings |
| `GET /api/v1/compare/{p1}/{p2}` | Head-to-head player comparison |
| `GET /api/v1/league/leaders` | League stat leaders |
| `POST /api/v1/agent/ask` | Non-streaming agent query |
| `POST /api/v1/agent/stream` | Streaming SSE agent query |
| `WS /api/v1/ws` | Live scoreboard WebSocket |
| `WS /api/v1/ws/{game_id}/play-by-play` | Per-game play-by-play WebSocket |

---

## CourtIQ Agent

Ask questions about NBA data via the `/agent` page or the POST endpoints.

Rate limited to 5 requests/minute per IP. Makes 2 Groq calls per question (tool selection + answer generation). Both calls go through the shared Groq rate limiter.

Available tools: `get_live_scoreboard`, `get_player_stats`, `get_game_detail`, `get_standings`, `get_league_leaders`

---

## MCP Server

Exposes NBA data to Claude Desktop and Cursor via [Model Context Protocol](https://modelcontextprotocol.io).

```json
{
  "mcpServers": {
    "nba-tracker": {
      "command": "python",
      "args": ["/path/to/nba-tracker-api/app/mcp_server.py"],
      "env": { "PYTHONPATH": "/path/to/nba-tracker-api" }
    }
  }
}
```

---

## Testing

```bash
cd nba-tracker-api
pytest app/tests/ -v
```
---

## Key Moment Detection

| Type | Logic |
|------|-------|
| Game-tying shot | Score tied after play, was not tied before, scoring play |
| Lead change | Different team leading vs previous play |
| Scoring run | 8+ unanswered points over last ~20 plays |
| Clutch play | Scoring play in Q4+, <2 min left, score within 5 |
| Big shot | 3-pointer extending lead to 10+ or cutting deficit to ≤5 |

---

Built by **Warsame Egal**
---
