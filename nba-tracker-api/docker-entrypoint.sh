#!/bin/bash
set -e

# Fix nba_api WinProbability bug
python3 /app/patch_scoreboard.py || echo "Failed to patch scoreboard"

# Patch nba_api to use proxy if configured
if [ -n "$NBA_API_PROXY" ]; then
    python3 /app/patch_http.py || echo "Failed to patch http"
fi

# Start FastAPI server
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

