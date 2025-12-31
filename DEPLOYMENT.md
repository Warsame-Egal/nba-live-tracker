# Deployment

## Infrastructure

- **Backend:** Oracle Cloud Infrastructure (Ubuntu 22.04 VM, free tier)
- **Frontend:** Vercel
- **Tunnel:** Cloudflare Tunnel (HTTPS access)

## Architecture

- FastAPI backend runs in a Docker container on Oracle Cloud VM
- React frontend is deployed to Vercel with environment variables for API URLs
- WebSocket connections handle real-time scoreboard updates
- The `nba_api` library gets patched at container startup for custom configuration

## Library Patching

The `nba_api` library handles all HTTP requests internally. To customize its behavior, I patch the library files directly when the Docker container starts:

1. `patch_http.py` finds the `nba_api/library/http.py` file and adds custom configuration
2. `patch_scoreboard.py` fixes the `WinProbability` KeyError by using `.get()` instead of direct dict access

This approach allows the app to work with the existing `nba_api` library while applying necessary modifications at runtime.
