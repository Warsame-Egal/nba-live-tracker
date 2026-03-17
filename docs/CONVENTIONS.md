# Code conventions

Short reference for how the NBA Live Tracker codebase is structured. For system design and numbers, see [architecture.md](architecture.md). For architecture decisions (why we chose X), see [adr/](adr/).

## Backend (nba-tracker-api)

- **Routers** (`app/routers/`): Thin HTTP layer. Handle request/response and delegate to services. No business logic or NBA API calls in routers.
- **Services** (`app/services/`): Business logic and all calls to `nba_api` or external APIs. Use `get_api_kwargs()` from `app.config` for proxy/config when calling NBA endpoints.
- **Schemas** (`app/schemas/`): Pydantic models for request/response validation and serialization. Use for API contracts.
- **Config**: Env vars loaded from `nba-tracker-api/.env` (see `.env.example`). `app.config` exposes `get_api_kwargs()` and `get_groq_api_key()`.
- **Formatting**: Black. Run `python -m black .` from `nba-tracker-api`. Type hints where practical.

## Frontend (nba-tracker)

- **Pages** (`src/pages/`): Route-level components. Fetch data via `apiClient` or hooks; pass data to child components.
- **Components** (`src/components/`): Reusable UI. Receive data via props; no direct API calls unless component-specific (e.g. WebSocket in a dedicated service).
- **Services** (`src/services/`): API clients and WebSocket wrappers (e.g. `apiClient.ts`, `websocketService.ts`).
- **Utils** (`src/utils/`): Helpers, config (e.g. `apiConfig.ts`, `season.ts`), and shared constants.
- **Types** (`src/types/`): TypeScript interfaces and types for API responses and app state.
- **Lint/format**: ESLint and Prettier. Run `npm run lint` and `npm run format` from `nba-tracker`.
