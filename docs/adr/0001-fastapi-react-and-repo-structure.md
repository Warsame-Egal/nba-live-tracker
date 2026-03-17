# ADR 0001: FastAPI + React and two-app repo structure

## Status

Accepted.

## Context

We needed a full-stack app for real-time NBA scores, stats, and a modern UI. The backend must serve REST and WebSocket APIs; the frontend must be responsive and support live updates.

## Decision

- **Backend:** FastAPI (Python). Chosen for async support, automatic OpenAPI docs, and simple WebSocket handling. Fits the existing Python ecosystem (e.g. `nba_api`).
- **Frontend:** React 19 with TypeScript, Vite, and Material UI. Vite gives fast dev experience; MUI provides consistent components; React supports real-time UI updates.
- **Repo structure:** Single repository with two top-level apps — `nba-tracker-api/` (FastAPI) and `nba-tracker/` (React). No monorepo tooling (e.g. Turborepo); keep the layout simple and easy to copy for take-home or similar projects.

## Consequences

- Clear separation: backend and frontend can be developed, tested, and deployed independently.
- One repo to clone; `docker-compose` at root runs both services.
- Reusable pattern: the same layout (FastAPI app + React app + shared docs) can be reused for other full-stack projects.
