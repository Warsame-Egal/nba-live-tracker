from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from nba_api.live.nba.endpoints import scoreboard

app = FastAPI()

# Enable Cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
def home():
    return {"message": "NBA Live Tracker API is running"}

@app.get("/live_scores")
def get_live_scores():
    """Fetch and return live NBA scores."""
    try:
        games = scoreboard.ScoreBoard().get_dict()
        return {"games": games["scoreboard"]["games"]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
def health_check():
    """Health check endpoint for API status."""
    return {"status": "ok", "message": "NBA API is running"}
