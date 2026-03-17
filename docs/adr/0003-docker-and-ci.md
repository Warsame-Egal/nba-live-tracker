# ADR 0003: Docker and CI pipeline

## Status

Accepted.

## Context

We need a reliable way to run the full stack locally (backend + frontend) and to verify code quality and tests on every push.

## Decision

- **Local development:** Use Docker Compose at repo root. One `docker-compose up` brings up the API and (optionally) frontend so anyone can run the app without installing Python/Node versions manually.
- **CI (GitHub Actions):** Single workflow that runs in parallel:
  - **Backend job:** Set up Python, install deps, run Black (format check), run pytest. No deployment in CI; only validation.
  - **Frontend job:** Set up Node, install deps, run ESLint, Prettier, and `npm run build`. Ensures the app builds and passes lint.

Branch policy: CI runs on push and PRs to `main` and `dev`.

## Consequences

- Contributors get a one-command local setup; reviewers see that tests and build pass before merge.
- Format and lint are enforced in CI, keeping the codebase consistent.
- Same pattern (docker-compose + backend test + frontend build) is reusable for other full-stack repos.
