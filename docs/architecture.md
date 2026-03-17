# NBA Live Tracker — Architecture

This document explains how the system is built and why. It is written for developers joining the project or for design review.

**See also:** [README.md](README.md) for the full doc index (overview, API examples, Groq AI, conventions, ADRs).

---

## 1. System Overview

The NBA Live Tracker is a full-stack app that shows **live NBA scores**, **game detail** (box score, key moments, win probability), **predictions**, **player/team stats**, and an **AI agent** that answers natural-language NBA questions. The backend is FastAPI; the frontend is React (Vite). Data ultimately comes from the NBA's public API; AI features use the Groq API.

The architecture is built around three constraints:

- **NBA API is rate-limited and blocking** — we must throttle calls and never block the event loop.
- **Many clients can subscribe to live data** — we avoid N×M API calls by caching once and pushing via WebSockets.
- **Groq has RPM/TPM limits** — we batch and queue AI calls so we don't burst and get 429s.

So we use: (1) a **cache-first polling pattern** so WebSockets never hit the NBA API directly, (2) **LRU-bounded caches** everywhere so memory stays predictable (important on free-tier deployments), and (3) a **single Groq queue** with priorities so agent requests get served first and batch jobs don't starve them.

---

## 2. Cache-First Polling Pattern

**Why WebSockets never call the NBA API directly**

If every WebSocket client triggered its own NBA API request, 100 users would mean 100× the load and we'd hit rate limits and timeouts immediately. So the rule is: **only one component talks to the NBA API for live data — the DataCache.**

**How DataCache works**

- On startup, `DataCache` starts two background asyncio tasks:
  - **Scoreboard poller**: every **8 seconds** it calls `getScoreboard()` (via `asyncio.to_thread`), stores the result in `_scoreboard_cache`, and updates the set of "active" (live) game IDs.
  - **Play-by-play poller**: every **5 seconds** it iterates over active game IDs and, for each, calls `getPlayByPlay(game_id)` (again via `asyncio.to_thread`) and stores the result in an **LRU cache** (max **20** games). A third task runs **every 5 minutes** to remove finished games and entries older than 24 hours.
- All WebSocket handlers and HTTP endpoints that need scoreboard or play-by-play data call `data_cache.get_scoreboard()` or `data_cache.get_playbyplay(game_id)`. They **never** call the NBA API directly for that data.
- When the NBA API is slow or down: the last successful result stays in the cache. The health endpoint reports `scoreboard_age_seconds`; the UI can show "data may be delayed." No crashes; we serve stale cache until the API recovers.

**Numbers**

| What              | Value        |
|-------------------|-------------|
| Scoreboard poll   | 8 s         |
| Play-by-play poll| 5 s         |
| Play-by-play cache size | 20 games (LRU) |
| Cleanup interval  | 300 s (5 min) |
| Stale entry purge| 24 h        |

---

## 3. Why Batched Groq Calls

**Naive approach (and why it's wrong)**

One Groq call per game for "insights" or "narrative" would mean 15 games → 15 requests in a short window. Groq enforces RPM and TPM limits (we use conservative defaults: **28 RPM**, **5800 TPM**). Bursts lead to 429s and failed requests.

**Batched approach**

- For **predictions**: we fetch standings and team stats once per season (cached 1 hour), then compute win probabilities and scores in-process. We make **one** Groq call per *date* (or per game only when we want enhanced narrative), not per game for basic prediction.
- For **key moments**: we collect all moments that need "context" in a short window and send them in **one** Groq request with a structured prompt; the model returns context for each moment in one response.
- For **batched insights**: we send multiple games' context in one prompt and get back insights for all of them.

So: **batch by time or by logical unit** (e.g. "all games today," "all new key moments this cycle") so we use one or a few Groq calls instead of N. The **AI priority queue** (see below) then serializes these so we don't exceed rate limits.

---

## 4. LRU Cache Everywhere

Every cache has a **max size** and **LRU eviction** (oldest unused entry is dropped when at capacity). Finished games are removed **immediately** when the scoreboard shows status "Final," so we don't keep dead data.

**Caches and limits**

| Cache                 | Max size / TTL        | Notes                          |
|-----------------------|------------------------|--------------------------------|
| Play-by-play          | 20 games               | LRU; finished games evicted    |
| Win probability       | 20 games, 1 h TTL      | LRU                            |
| Predictions           | 100 date+season, 30 min TTL | LRU                      |
| Key moments (list)    | Per game, 5 min window | Rolling; game finished → clear |
| Moment context (AI)   | 1000 entries           | LRU                            |
| Agent response cache  | 200 entries            | LRU; 120 s live / 300 s other   |
| Batched insights      | 50 batches, 20 lead-change | LRU                        |
| Game summary (AI)     | 24 h TTL               | Per game_id                    |

This keeps memory bounded on small instances (e.g. GCP free tier) and avoids unbounded growth over a long run.

---

## 5. Agent Architecture

The agent is a **tool-calling** flow: the model can request "tools" (e.g. "get today's scoreboard," "get game detail," "get standings"). The backend runs those tools and feeds results back into the model until it has enough to answer.

**Flow**

1. User sends `POST /api/v1/agent/ask` with `{ "question": "...", "history": [] }`.
2. Request is enqueued with **AIPriority.AGENT** (highest priority).
3. When the queue runs it: call Groq with the question and conversation history; if the response includes `tool_calls`, for each tool call we execute the corresponding function (e.g. fetch scoreboard, game detail, standings), append tool results to messages, and call Groq again. We repeat until the model returns no tool calls or we hit **max 5 iterations**.
4. If a tool fails (e.g. NBA API error), we inject an error message and let the model continue or conclude with what it has.
5. Final answer is returned as JSON: `{ "answer": "...", "tools_used": [...], "tool_results": [...] }`.

**Priority queue**

All Groq traffic goes through `get_ai_request_queue().run(priority, coro)`. Priorities (lower number = higher priority):

- **1 = AGENT** — user-facing Q&A (e.g. `/agent/ask`).
- **2 = NARRATIVE** — narrative generation.
- **3 = INSIGHTS** — insights batch.
- **4 = BATCH** — everything else (predictions enhancement, key moment context, etc.).

So agent requests are never starved by batch jobs. The queue is single-threaded (one Groq call at a time per process), with rate limiting (RPM/TPM) applied inside the Groq client.

---

## 6. Key Moments Detection

Key moments are "highlight" events: game-tying shot, lead change, scoring run (e.g. 8+ unanswered points), clutch play (final minutes, close score), big shot (momentum swing). They are **detected in the backend** from play-by-play and then sent to the frontend via WebSocket.

**Detection (5 patterns)**

- **Game-tying shot** — score after the shot ties the game.
- **Lead change** — score after the play changes who is ahead.
- **Scoring run** — one team scores 8+ unanswered points (we look at last ~20 plays).
- **Clutch play** — last ~2 minutes of regulation/OT and score within a few points.
- **Big shot** — significant shot that shifts momentum (criteria in code).

We process plays **incrementally**: we store `_last_checked_plays[game_id]` (last `action_number` we've seen) and only run detection on new plays. We never re-check the same play.

**AI context**

For each new moment we can generate a short "why it matters" text via Groq. To avoid one-call-per-moment, we **batch**: collect all moments that need context in a time window, build one prompt with all of them, and get one response with a blob of context per moment. Results are cached in `_moment_context_cache` (LRU, 1000 entries).

---

## 7. Data Flow Diagram

```
                    +------------------+
                    |   NBA API        |
                    | (scoreboard,     |
                    |  playbyplay,     |
                    |  box score, ...) |
                    +--------+---------+
                             |
         asyncio.to_thread   | (poll every 8s / 5s)
                             v
                    +------------------+
                    |   DataCache      |
                    | - scoreboard     |
                    | - play-by-play   |
                    |   (LRU 20)       |
                    +--------+---------+
                             |
         read-only           |           read-only
         get_scoreboard()    |           get_playbyplay(id)
         get_playbyplay(id)  |
         +------------------+------------------+
         |                  |                  |
         v                  v                  v
+----------------+  +----------------+  +----------------+
| WebSocket      |  | HTTP endpoints |  | Key moments /  |
| Manager        |  | (game detail,  |  | Win prob       |
| (push to       |  |  scoreboard    |  | (use cache +   |
|  clients)      |  |  JSON, etc.)   |  |  optional API) |
+----------------+  +----------------+  +----------------+
         |                  |                  |
         v                  v                  v
    [ Browser / clients ]


    Groq AI branch (separate from NBA path):

    [ Agent / Predictions / Key moments / Insights ]
                    |
                    v
            +------------------+
            | AI priority queue|
            | (1=agent, 2=nav, |
            |  3=insights,     |
            |  4=batch)        |
            +--------+---------+
                     |
                     v
            +------------------+
            | Groq API         |
            | (rate-limited    |
            |  28 RPM / 5800   |
            |  TPM)            |
            +------------------+
```

---

## Numbers Quick Reference

| Item                    | Value |
|-------------------------|-------|
| Scoreboard poll         | 8 s   |
| Play-by-play poll       | 5 s   |
| Play-by-play LRU size   | 20    |
| NBA API min delay       | 600 ms |
| Groq RPM (conservative) | 28    |
| Groq TPM (conservative) | 5800  |
| Agent max tool iterations | 5   |
| Key moment context LRU  | 1000  |
| Predictions cache TTL   | 30 min |
| Win probability cache  | 20 games, 1 h TTL |
