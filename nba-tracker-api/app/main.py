import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.players import router as player_router
from app.routers.schedule import router as schedule_router
from app.routers.scoreboard import router as scoreboard_router
from app.routers.standings import router as standings_router
from app.routers.teams import router as team_router
from app.routers.search import router as search_router
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)

# Set up logging - this helps us see what's happening in the app
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# This function runs when the app starts and stops
# It manages WebSocket connections that send live game updates
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Starts WebSocket broadcasting when app starts and stops it when app shuts down.
    WebSockets send live game scores and play-by-play updates to connected clients.
    """

    logger.info("Starting WebSocket broadcasting for live game updates...")

    # Start two background tasks that run continuously:
    # 1. Scoreboard updates - sends live scores to clients
    # 2. Play-by-play updates - sends game events to clients
    scoreboard_task = asyncio.create_task(scoreboard_websocket_manager.broadcast_updates())
    playbyplay_task = asyncio.create_task(playbyplay_websocket_manager.broadcast_playbyplay_updates())

    try:
        # Keep the app running and broadcasting updates
        yield
    finally:
        # When app shuts down, stop the background tasks
        logger.info("Shutting down WebSocket broadcasting...")

        # Stop both background tasks cleanly
        scoreboard_task.cancel()
        playbyplay_task.cancel()
        try:
            await scoreboard_task
        except asyncio.CancelledError:
            pass
        try:
            await playbyplay_task
        except asyncio.CancelledError:
            pass


# Create the FastAPI app - this is the main application
app = FastAPI(
    title="NBA Tracker API",
    description="An API providing NBA live scoreboard, schedule, and game stats.",
    version="1.0.0",
    lifespan=lifespan,  # Use the lifespan function to manage WebSocket connections
)

# Allow frontend to make requests to this API
# This is needed because frontend runs on a different port/domain
# CORS configuration
# In production, set FRONTEND_URL environment variable to your Vercel domain
import os
frontend_url = os.getenv("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple health check endpoint - just returns a message
@app.get("/")
def home():
    """Check if the API is running."""
    return {"message": "NBA Live Tracker API is running"}


# Register all API routes
# Each router handles a different part of the API (players, teams, games, etc.)
app.include_router(scoreboard_router, prefix="/api/v1")
app.include_router(schedule_router, prefix="/api/v1")
app.include_router(standings_router, prefix="/api/v1")
app.include_router(player_router, prefix="/api/v1")
app.include_router(team_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
