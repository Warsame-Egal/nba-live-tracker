# NBA Live Tracker — Documentation

All documentation lives in this folder. Start with [architecture.md](architecture.md) for system design (cache-first polling, LRU caches, Groq batching, agent, key moments).

## In this folder

| Doc | Purpose |
|-----|--------|
| [architecture.md](architecture.md) | System design: cache-first polling, LRU caches, Groq batching, agent, key moments. |
| [overview.md](overview.md) | High-level service list and data flow; defers to architecture.md for design details. |
| [technical-details.md](technical-details.md) | API curl examples, rate limits, WebSocket URLs, caching reference. |
| [groq-ai.md](groq-ai.md) | Groq usage: insights, predictions, key moments, agent; aligns with architecture.md. |
| [CONVENTIONS.md](CONVENTIONS.md) | Code conventions (routers, services, frontend structure). |
| [PRE_PUSH_CHECKLIST.md](PRE_PUSH_CHECKLIST.md) | Steps to run before push (aligned with CI and CONTRIBUTING). |
| [adr/](adr/README.md) | Architecture Decision Records — why we chose FastAPI, WebSockets, Docker, nba_api, Groq. |

## Quick links

- **Design & numbers:** [architecture.md](architecture.md)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Manual setup / deploy:** [MANUAL_SETUP.md](../MANUAL_SETUP.md)
- **API reference:** [nba-tracker-api/app/docs/API_DOCUMENTATION.md](../nba-tracker-api/app/docs/API_DOCUMENTATION.md) and http://localhost:8000/docs
