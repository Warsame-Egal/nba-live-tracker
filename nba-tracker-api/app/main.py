from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.live_scores import router as live_scores_router
from app.routers.health import router as health_router

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],
)

# Root endpoint (Optional)
@app.get("/")
def home():
    return {"message": "NBA Live Tracker API is running"}

# Include routers
app.include_router(live_scores_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")

