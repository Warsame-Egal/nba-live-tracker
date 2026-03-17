# ADR 0002: WebSockets and server-side cached polling for real-time data

## Status

Accepted.

## Context

The app must show live scores and play-by-play without requiring users to refresh. The NBA data source is external and rate-sensitive; we cannot have each browser tab or WebSocket connection trigger its own API calls.

## Decision

- **Single source of truth on the server:** A background task (in `data_cache`) polls the NBA API at a fixed interval and updates in-memory cache.
- **WebSockets for push:** When clients connect via WebSocket, they receive updates by the server reading from the cache and broadcasting. No client triggers NBA API calls.
- **REST for on-demand:** Endpoints like player details, standings, and search still use REST; they may call `nba_api` or internal services as needed, with caching where appropriate.

## Consequences

- Predictable load on the NBA API; no thundering herd from many clients.
- All connected clients see the same data at the same cadence.
- Real-time feel for scoreboard and play-by-play without complex client logic. Trade-off: latency is bounded by the polling interval, which is acceptable for score updates.
