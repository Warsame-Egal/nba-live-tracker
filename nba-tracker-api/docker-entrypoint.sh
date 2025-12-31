#!/bin/bash
set -e

# Apply library patches if they exist
if [ -f /app/patch_scoreboard.py ]; then
    python3 /app/patch_scoreboard.py || echo "Failed to patch scoreboard"
fi

if ([ -n "$NBA_API_CONFIG" ] || [ -n "$NBA_API_PROXY" ]) && [ -f /app/patch_http.py ]; then
    python3 /app/patch_http.py || echo "Failed to patch http"
fi

# Start FastAPI server
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

