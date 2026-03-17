# Pre-push checklist

Run these **before pushing** so CI passes and the repo stays in good shape. Same steps as [.github/workflows/ci.yml](../.github/workflows/ci.yml).

## 1. Backend (nba-tracker-api)

```bash
cd nba-tracker-api
# Activate venv first (Windows PowerShell):
#   .\venv\Scripts\Activate.ps1
# Then:
pip install -r requirements.txt   # or: uv sync / pip install -e .
ruff check app/
python -m black . --check         # or: python -m black .   to fix formatting
pytest
```

- **Ruff:** Lint; must pass. Same as CI.
- **Black:** Run with `python -m black` so it uses the venv (Windows often doesn't find `black` on PATH). If `--check` fails, run `python -m black .` and commit the changes.
- **pytest:** Some tests call external NBA APIs. If they fail locally (e.g. proxy/network), CI may still pass (no proxy in GitHub Actions). The home endpoint and mocked tests should pass; real API tests can be skipped locally if needed.

## 2. Frontend (nba-tracker)

```bash
cd nba-tracker
npm install
npm run lint
npm run format
npm run build
```

- **lint:** ESLint must pass (no errors).
- **format:** Prettier; run before commit if needed.
- **build:** TypeScript and Vite build must succeed.

## 3. Quick one-liner (from repo root)

Backend (with venv active in nba-tracker-api):

```bash
cd nba-tracker-api && ruff check app/ && python -m black . --check && pytest
```

Frontend:

```bash
cd nba-tracker && npm run lint && npm run format && npm run build
```

## 4. Run the app (optional but recommended before push)

Test that the app runs both ways so nothing is broken.

**Dev way (two terminals):**

- Backend: `cd nba-tracker-api`, activate venv, `uvicorn app.main:app --reload`
- Frontend: `cd nba-tracker`, `npm run dev`
- Open http://localhost:3000 and http://localhost:8000/docs

**Docker way (from repo root):**

```bash
docker-compose up --build
```

- Open http://localhost:3000 and http://localhost:8000/docs
- Stop with Ctrl+C, then `docker-compose down` if you want to remove containers.

If both start and basic pages load, you're good. CI only runs lint/tests/build; running the app catches Docker and dev-path issues.

## 5. Checklist alignment

Aligned with [.github/workflows/ci.yml](../.github/workflows/ci.yml): backend (ruff, black, pytest), frontend (lint, format, build). See [CONTRIBUTING.md](../CONTRIBUTING.md) and [docs/README.md](README.md).
