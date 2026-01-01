import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.players import router as player_router
from app.routers.schedule import router as schedule_router
from app.routers.scoreboard import router as scoreboard_router
from app.routers.standings import router as standings_router
from app.routers.teams import router as team_router
from app.routers.search import router as search_router
from app.routers.predictions import router as predictions_router
from app.services.data_cache import data_cache
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Start background polling and WebSocket broadcasting on app startup.
    
    How it works:
    - Data cache polling: fetches from NBA API at fixed intervals
    - WebSocket broadcasting: reads from cache and sends to clients
    
    This ensures only one poller exists per data type, and WebSocket
    connections never trigger NBA API calls.
    """
    logger.info("Starting NBA data polling and WebSocket broadcasting...")
    
    # Start background polling tasks that fetch data from NBA API
    data_cache.start_polling()
    
    # Start WebSocket broadcast tasks that read from cache
    scoreboard_task = asyncio.create_task(scoreboard_websocket_manager.broadcast_updates())
    playbyplay_task = asyncio.create_task(playbyplay_websocket_manager.broadcast_playbyplay_updates())
    
    try:
        yield
    finally:
        logger.info("Shutting down background tasks...")
        
        await data_cache.stop_polling()
        
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


app = FastAPI(
    title="NBA Live API",
    description="Real-time NBA game data, player statistics, team information, and game predictions.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
frontend_url = os.getenv("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url] if frontend_url != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    """Health check endpoint."""
    return {"message": "NBA Live API is running"}


# Register all API routes
app.include_router(scoreboard_router, prefix="/api/v1")
app.include_router(schedule_router, prefix="/api/v1")
app.include_router(standings_router, prefix="/api/v1")
app.include_router(player_router, prefix="/api/v1")
app.include_router(team_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(predictions_router, prefix="/api/v1")
