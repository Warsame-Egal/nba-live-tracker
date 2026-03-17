# ADR 0004: Data source (nba_api) and optional Groq AI

## Status

Accepted.

## Context

We need official-ish NBA data (scores, players, standings, play-by-play) and optional AI-generated insights (e.g. game summaries, predictions) without maintaining our own data pipeline.

## Decision

- **Primary data:** Use the [nba_api](https://github.com/swar/nba_api) Python package, which wraps NBA.com endpoints. All server-side data fetching goes through this; we cache results in memory (see ADR 0002) to limit external calls.
- **AI insights:** Use Groq for optional features (e.g. natural-language game insights, predictions). Groq is called from the backend only; API keys stay server-side. If the key is missing or the service is down, the app still works; AI features degrade gracefully.

## Consequences

- We rely on nba_api’s stability and NBA.com’s availability; we do not scrape or reverse-engineer undocumented APIs directly.
- AI adds value without being required for core functionality; the app is usable with or without Groq configured.
- Clear split: data layer (nba_api + cache) vs. AI layer (Groq); easy to swap or add providers later.
