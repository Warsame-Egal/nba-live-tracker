# NBA Live Tracker

Real-time NBA scoreboard and stats tracker. Watch live games, track player and team stats, browse rosters, and get game predictions.

**Live Demo:** [https://nba-live-tracker-one.vercel.app](https://nba-live-tracker-one.vercel.app)

## What It Does

A web app that shows live NBA game scores, player stats, team information, and game predictions. Built with React and FastAPI, using the `nba_api` library to fetch data from NBA.com.

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Material UI (Material Design 3)
- Vite
- React Router
- Recharts
- WebSockets

**Backend:**
- FastAPI with Python
- WebSockets for live updates
- Rate limiting for NBA API calls
- Uvicorn

**Data Source:**
- [`nba_api`](https://github.com/swar/nba_api) Python package

## Features

- **Live Scoreboard** - Real-time score updates with WebSocket connections
- **Play-by-Play** - See every shot, foul, and timeout as it happens
- **Players Page** - Browse season leaders and all active players
- **Teams Page** - View team statistics and performance charts
- **Player Profiles** - Detailed stats, game logs, and performance charts
- **Team Profiles** - Team details, rosters, and game logs
- **Game Predictions** - Statistical win probability and score predictions
- **League Standings** - Track playoff races and conference rankings
- **Universal Sidebar** - Quick search for players and teams across all pages

## Screenshots

### Scoreboard
![Scoreboard](nba-tracker/public/screenshots/Scoreboard.png)

### Player Profile
![Player Profile](nba-tracker/public/screenshots/Player.png)

### Team Page
![Team Page](nba-tracker/public/screenshots/Team.png)

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

## API Usage Examples

### Get Player Details
```bash
curl http://localhost:8000/api/v1/player/2544
```

### Get Live Scoreboard
```bash
curl http://localhost:8000/api/v1/schedule/date/2025-01-15
```

### WebSocket for Live Updates
```javascript
const ws = new WebSocket("ws://localhost:8000/api/v1/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Live scores:", data);
};
```

## API Documentation

- **Local development:** http://localhost:8000/docs
- **Full documentation:** [API_DOCUMENTATION.md](nba-tracker-api/app/docs/API_DOCUMENTATION.md)

## Project Structure

```
nba-live-tracker/
├── nba-tracker/          # Frontend React app
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
└── nba-tracker-api/      # Backend FastAPI app
    └── app/
        ├── routers/      # API routes
        ├── services/     # Business logic
        └── schemas/      # Data models
```

## Deployment

- **Frontend:** Vercel (automatic HTTPS, global CDN)
- **Backend:** Oracle Cloud Infrastructure free tier (Ubuntu VM)
- **Tunnel:** Cloudflare Tunnel for secure HTTPS access to backend

See [DEPLOYMENT.local.md](DEPLOYMENT.local.md) for detailed setup instructions.

## Credits

Uses the [`nba_api`](https://github.com/swar/nba_api) Python package to access NBA.com data.

---

Made by Warsame Egal
