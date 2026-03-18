# Overview

High-level view of how the app is organized and how data flows. For design rationale, cache sizes, and numbers, see **[architecture.md](architecture.md)**.

## Service structure

**Backend (nba-tracker-api/app/services/):**

- `data_cache.py` — Polls NBA API (scoreboard 8s, play-by-play 5s per live game), LRU caches. Single source for live data; WebSockets read from here only.
- `websockets_manager.py` — Broadcasts scoreboard, play-by-play, insights, key moments, win probability to clients.
- `groq_client.py` — Groq API calls and rate limiting (RPM/TPM).
- Groq calls use a lightweight in-process rate limiter; at this scale we just call Groq directly from the agent and insights services.
- `agent_service.py` — Tool-calling agent: user questions → tools (scoreboard, game detail, standings) → Groq.
- `batched_insights.py` — AI insights for all live games in one call.
- `key_moments.py` — Detects game-tying shot, lead change, scoring run, clutch, big shot; batches AI context.
- `predictions.py` — Win probabilities and score predictions; one Groq call per date for narrative.
- `win_probability.py` — Win probability for live games.
- `game_detail.py` — Aggregated game detail (box score, key moments, win prob).
- `structured_groq.py` — Structured Groq calls with Pydantic schemas.
- `groq_prompts.py` — Prompt templates.
- `schedule.py`, `scoreboard.py`, `standings.py`, `teams.py`, `players.py`, `search.py`, `league_leaders.py`, etc. — Data and NBA API access.

**Frontend (nba-tracker/src/):**

- `websocketService.ts` — Main scoreboard WebSocket.
- `PlayByPlayWebSocketService.ts` — Per-game play-by-play WebSocket.

## Data flow (short)

1. **Live data:** DataCache polls NBA API at fixed intervals; WebSocket manager and HTTP endpoints read from cache only. No N×M API calls.
2. **AI:** Groq calls are batched by use case (insights, key moment context, predictions) and pass through a single rate-limited client. See [architecture.md](architecture.md) and [groq-ai.md](groq-ai.md).

## WebSocket message types

- **Scoreboard** — Game list, scores, status.
- **Insights** — `type: "insights"`.
- **Key moments** — `type: "key_moments"`.
- **Win probability** — `type: "win_probability"`.

Details and curl examples: [technical-details.md](technical-details.md).
