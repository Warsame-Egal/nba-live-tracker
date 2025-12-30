#!/bin/bash
set -e

# Patch nba_api if NBA_API_PROXY is set
if [ -n "$NBA_API_PROXY" ]; then
    echo "🔧 Patching nba_api library with proxy configuration..."
    python3 /app/patch_nba_api.py || echo "⚠️  Warning: Failed to patch nba_api, continuing anyway..."
else
    echo "ℹ️  NBA_API_PROXY not set, skipping nba_api patch"
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

