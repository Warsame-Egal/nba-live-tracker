# NBA Live Tracker

Real-time NBA scoreboard and stats tracker. Watch live games with play-by-play updates, AI-powered insights, and stat-based predictions.

**Live Demo:** [https://nba-live-tracker-one.vercel.app](https://nba-live-tracker-one.vercel.app)

## What It Does

A web app that shows live NBA game scores, player stats, team information, and game predictions. Built with React and FastAPI.

- **Live Scoreboard** - Real-time score updates, play-by-play, AI insights, and win probability
- **Key Moments Detection** - Automatically highlights game-tying shots, lead changes, and scoring runs
- **Momentum Visualization** - Visual timeline showing score differential and momentum shifts
- **Game Predictions** - Stat-based win probability and score predictions with AI explanations
- **Player & Team Stats** - Season leaders, team performance, and detailed profiles
- **League Standings** - Playoff races and conference rankings

## Tech Stack

**Frontend:** React 19, TypeScript, Material UI, Vite, Recharts, WebSockets  
**Backend:** FastAPI, Python, WebSockets, Groq AI  
**Data Source:** [`nba_api`](https://github.com/swar/nba_api) Python package

## Screenshots

<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
  <img src="nba-tracker/public/screenshots/Scoreboard.png" alt="Live Scoreboard" width="280" />
  <img src="nba-tracker/public/screenshots/Predictions1.png" alt="Game Predictions" width="280" />
  <img src="nba-tracker/public/screenshots/Predictions2.png" alt="League Standings" width="280" />
  <img src="nba-tracker/public/screenshots/Player.png" alt="Player Profile" width="280" />
</div>

## Quick Start

### Using Docker

```bash
git clone https://github.com/Warsame-Egal/nba-live-tracker.git
cd nba-live-tracker
docker-compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Backend:**

```bash
cd nba-tracker-api
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd nba-tracker
npm install
npm run dev
```

The frontend will run on http://localhost:3000 (or the next available port).

## Documentation

- **API Docs:** http://localhost:8000/docs
- **Full API Documentation:** [API_DOCUMENTATION.md](nba-tracker-api/app/docs/API_DOCUMENTATION.md)
- **Architecture:** [docs/architecture.md](docs/architecture.md)
- **Groq AI:** [docs/groq-ai.md](docs/groq-ai.md)
- **Technical Details:** [docs/technical-details.md](docs/technical-details.md) - API examples, rate limiting, WebSocket behavior

## Deployment

- **Frontend:** Vercel (automatic HTTPS, global CDN)
- **Backend:** Oracle Cloud Infrastructure free tier (Ubuntu VM)
- **Tunnel:** Cloudflare Tunnel for secure HTTPS access to backend

See [DEPLOYMENT.local.md](DEPLOYMENT.local.md) for detailed setup instructions.

## Credits

Uses the [`nba_api`](https://github.com/swar/nba_api) Python package to access NBA.com data.

---

Made by Warsame Egal
