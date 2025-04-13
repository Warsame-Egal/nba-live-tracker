import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.games import router as game_router
from app.routers.health import router as health_router
from app.routers.players import router as player_router
from app.routers.schedule import router as schedule_router
from app.routers.scoreboard import router as scoreboard_router
from app.routers.standings import router as standings_router
from app.routers.teams import router as team_router
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)


# Manages WebSocket broadcasting lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Starts WebSocket broadcasting on app startup and shuts it down on exit."""

    print("Starting WebSocket broadcasting...")

    # Start background tasks for both Scoreboard and Play-by-Play
    scoreboard_task = asyncio.create_task(scoreboard_websocket_manager.broadcast_updates())
    playbyplay_task = asyncio.create_task(playbyplay_websocket_manager.broadcast_playbyplay_updates())

    try:
        yield  # Keep broadcasting active while the app runs
    finally:
        print("Shutting down WebSocket broadcasting...")

        # Cancel and cleanly shut down WebSocket tasks
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


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="NBA Tracker API",
    description="An API providing NBA live scoreboard, schedule, and game stats.",
    version="1.0.0",
    lifespan=lifespan,  # Starts WebSocket broadcasting on app startup
)

origins = [
    "http://localhost:3000",
    "https://nba-frontend.onrender.com"
]

# Enable Cross-Origin Resource Sharing frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any React Vite
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],
)


# Root endpoint to check if API is running


@app.get("/")
def home():
    """Root endpoint for API health check."""
    return {"message": "NBA Live Tracker API is running"}


# Register API route for health check
app.include_router(health_router, prefix="/api/v1")

# Register API route for scoreboard
app.include_router(scoreboard_router, prefix="/api/v1")

# Register API route for schedule
app.include_router(schedule_router, prefix="/api/v1")

# Register API route for standings
app.include_router(standings_router, prefix="/api/v1")

app.include_router(player_router, prefix="/api/v1")

app.include_router(game_router, prefix="/api/v1")

app.include_router(team_router, prefix="/api/v1")
