from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.scoreboard import router as scoreboard_router
from app.routers.health import router as health_router

# Initialize FastAPI app
app = FastAPI()

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

# Register API route for live scores
app.include_router(scoreboard_router, prefix="/api/v1")

# Register API route for health check
app.include_router(health_router, prefix="/api/v1")
