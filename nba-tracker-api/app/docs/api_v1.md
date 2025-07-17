# NBA Tracker API v1

This document outlines the available endpoints after pruning unused functionality.

## Endpoints

### Players

- `GET /api/v1/player/{player_id}` - Retrieve a single player's details.
- `GET /api/v1/players/search/{search_term}` - Search for players by name.

### Teams

- `GET /api/v1/teams/{team_id}` - Retrieve team details.
- `GET /api/v1/scoreboard/team/{team_id}/roster/{season}` - Team roster for a season.

### Schedule

- `GET /api/v1/schedule/date/{date}` - Games for a specific date.

### Standings

- `GET /api/v1/standings/season/{season}` - League standings for a season.

### Game Data

- `GET /api/v1/scoreboard/game/{game_id}/boxscore` - Box score for a game.

### WebSockets

- `ws://<host>/api/v1/ws` - Live scoreboard updates.
- `ws://<host>/api/v1/ws/{game_id}/play-by-play` - Real‑time play‑by‑play for a game.
