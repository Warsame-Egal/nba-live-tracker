# NBA Scoreboard API Documentation

## Overview

The NBA Scoreboard API provides endpoints to retrieve information about team records, rosters, and matchups.

## Endpoints

### 1. Get Live Scoreboard

**GET** `/scoreboard`
**Description:** Fetch and return live NBA scores from the NBA API.

#### **Example Response**

```json
{
  "scoreboard": {
    "gameDate": "2025-03-08",
    "games": []
  }
}
```

### Caching & Database

The API stores each fetch in the `scoreboard_snapshots` table. If the same data
was retrieved within the last 60 seconds, the endpoint returns this cached
snapshot instead of calling the NBA API again. WebSocket updates use the same
cache to avoid redundant network requests.

### 2. Get Current Team Record

**GET** `/scoreboard/team/{team_id}/record`

### Description:

Fetch the current season's record, ranking, and performance for a team.

### Request Parameters

| Parameter | Type | Required | Description                         |
| --------- | ---- | -------- | ----------------------------------- |
| `team_id` | int  | Yes      | Unique identifier for the NBA team. |

### Possible Responses

| Status Code                 | Meaning       | Description                                 |
| --------------------------- | ------------- | ------------------------------------------- |
| `200 OK`                    | Success       | Returns the current record of the team.     |
| `404 Not Found`             | No Data Found | No record available for the requested team. |
| `500 Internal Server Error` | Server Error  | Unexpected error.                           |

### Example Response

```json
{
  "team_id": 1610612760,
  "team_name": "Thunder",
  "conference": "West",
  "division": "Northwest",
  "wins": 57,
  "losses": 25,
  "win_pct": 0.695,
  "home_record": "33-8",
  "road_record": "24-17",
  "last_10": "7-3",
  "current_streak": "5"
}
```

### 3. Get Team Roster

**GET** `/scoreboard/team/{team_id}/roster/{season}`

### Description:

Fetch the full roster and coaching staff for a given team and season.

### Request Parameters

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `team_id` | int    | Yes      | Unique identifier for the NBA team.          |
| `season`  | string | Yes      | The NBA season identifier (e.g., `2024-25`). |

### Possible Responses

| Status Code                 | Meaning       | Description                                 |
| --------------------------- | ------------- | ------------------------------------------- |
| `200 OK`                    | Success       | Returns the team's roster for the season.   |
| `404 Not Found`             | No Data Found | No roster available for the requested team. |
| `500 Internal Server Error` | Server Error  | Unexpected error.                           |

```json
{
  "team_id": 1610612738,
  "team_name": "Boston Celtics",
  "season": "2024-25",
  "players": [
    {
      "player_id": 1628369,
      "name": "Jayson Tatum",
      "jersey_number": "0",
      "position": "F-G",
      "height": "6-8",
      "weight": 210,
      "birth_date": "MAR 03, 1998",
      "age": 27,
      "experience": "7",
      "school": "Duke"
    },
    {
      "player_id": 201950,
      "name": "Jrue Holiday",
      "jersey_number": "4",
      "position": "G",
      "height": "6-4",
      "weight": 205,
      "birth_date": "JUN 12, 1990",
      "age": 34,
      "experience": "15",
      "school": "UCLA"
    }
  ]
}
```

### 4. Search Players

**GET** `/players/search`
**Description:** Search for players by name.

#### Request Parameters

| Parameter | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `name`    | string | Yes      | Full or partial player name to search for. |

#### Possible Responses

| Status Code                 | Meaning       | Description                         |
| --------------------------- | ------------- | ----------------------------------- |
| `200 OK`                    | Success       | Returns a list of matching players. |
| `404 Not Found`             | No Data Found | No players match the search query.  |
| `500 Internal Server Error` | Server Error  | Unexpected error.                   |

## 5. Get Box Score for a Game

### **GET** `/scoreboard/game/{game_id}/boxscore`

### **Description**

Retrieve detailed game stats, including team and player performance for a given NBA game.

### **Request Parameters**

| Parameter | Type  | Required | Description                         |
| --------- | ----- | -------- | ----------------------------------- |
| `game_id` | `str` | Yes      | Unique identifier for the NBA game. |

### **Possible Responses**

| Status Code                 | Meaning       | Description                             |
| --------------------------- | ------------- | --------------------------------------- |
| `200 OK`                    | Success       | Returns the full box score of the game. |
| `404 Not Found`             | No Data Found | No box score found for the given game.  |
| `500 Internal Server Error` | Server Error  | Unexpected error.                       |

### **Example Response**

```json
{
  "game_id": "0022400919",
  "status": "Final",
  "home_team": {
    "team_id": 1610612752,
    "team_name": "New York Knicks",
    "score": 115,
    "field_goal_pct": 0.472,
    "three_point_pct": 0.398,
    "free_throw_pct": 0.812,
    "rebounds_total": 48,
    "assists": 26,
    "steals": 7,
    "blocks": 5,
    "turnovers": 13,
    "players": [
      {
        "player_id": 203944,
        "name": "Julius Randle",
        "position": "F",
        "minutes": "PT36M",
        "points": 24,
        "rebounds": 10,
        "assists": 4,
        "steals": 1,
        "blocks": 0,
        "turnovers": 2
      }
    ]
  },
  "away_team": {
    "team_id": 1610612738,
    "team_name": "Boston Celtics",
    "score": 110,
    "field_goal_pct": 0.455,
    "three_point_pct": 0.367,
    "free_throw_pct": 0.789,
    "rebounds_total": 44,
    "assists": 23,
    "steals": 6,
    "blocks": 3,
    "turnovers": 12,
    "players": [
      {
        "player_id": 1627759,
        "name": "Jayson Tatum",
        "position": "F",
        "minutes": "PT38M",
        "points": 30,
        "rebounds": 8,
        "assists": 5,
        "steals": 1,
        "blocks": 1,
        "turnovers": 3
      }
    ]
  }
}
```

## 6. Get Team Statistics for a Game

### **GET** `/scoreboard/game/{game_id}/team/{team_id}/stats`

### **Description**

Retrieve a specific team's detailed performance statistics for a given NBA game.

### **Request Parameters**

| Parameter | Type  | Required | Description                         |
| --------- | ----- | -------- | ----------------------------------- |
| `game_id` | `str` | Yes      | Unique identifier for the NBA game. |
| `team_id` | `int` | Yes      | Unique identifier for the NBA team. |

### **Possible Responses**

| Status Code                 | Meaning       | Description                                 |
| --------------------------- | ------------- | ------------------------------------------- |
| `200 OK`                    | Success       | Returns the team’s game statistics.         |
| `404 Not Found`             | No Data Found | No stats found for the given team and game. |
| `500 Internal Server Error` | Server Error  | Unexpected error.                           |

### **Example Response**

```json
{
  "game_id": "0022400919",
  "team_id": 1610612752,
  "team_name": "New York Knicks",
  "score": 115,
  "field_goal_pct": 0.472,
  "three_point_pct": 0.398,
  "free_throw_pct": 0.812,
  "rebounds_total": 48,
  "assists": 26,
  "steals": 7,
  "blocks": 5,
  "turnovers": 13,
  "players": [
    {
      "player_id": 203944,
      "name": "Julius Randle",
      "position": "F",
      "minutes": "PT36M",
      "points": 24,
      "rebounds": 10,
      "assists": 4,
      "steals": 1,
      "blocks": 0,
      "turnovers": 2
    },
    {
      "player_id": 1629611,
      "name": "RJ Barrett",
      "position": "G-F",
      "minutes": "PT34M",
      "points": 19,
      "rebounds": 5,
      "assists": 6,
      "steals": 1,
      "blocks": 1,
      "turnovers": 1
    }
  ]
}
```

## 7. Get Game Leaders

### **GET** `/scoreboard/game/{game_id}/leaders`

### **Description**

Retrieve the top-performing players in key categories like points, assists, and rebounds.

### **Request Parameters**

| Parameter | Type  | Required | Description                         |
| --------- | ----- | -------- | ----------------------------------- |
| `game_id` | `str` | Yes      | Unique identifier for the NBA game. |

### **Possible Responses**

| Status Code                 | Meaning       | Description                          |
| --------------------------- | ------------- | ------------------------------------ |
| `200 OK`                    | Success       | Returns the top players in the game. |
| `404 Not Found`             | No Data Found | No leader data found for the game.   |
| `500 Internal Server Error` | Server Error  | Unexpected error.                    |

### **Example Response**

```json
{
  "game_id": "0022400919",
  "points_leader": {
    "player_id": 203507,
    "name": "Joel Embiid",
    "position": "C",
    "minutes": "PT32M",
    "points": 35,
    "rebounds": 12,
    "assists": 5,
    "steals": 1,
    "blocks": 3,
    "turnovers": 2
  },
  "assists_leader": {
    "player_id": 1628389,
    "name": "Luka Doncic",
    "position": "G",
    "minutes": "PT38M",
    "points": 28,
    "rebounds": 7,
    "assists": 12,
    "steals": 2,
    "blocks": 0,
    "turnovers": 3
  },
  "rebounds_leader": {
    "player_id": 1629027,
    "name": "Clint Capela",
    "position": "C",
    "minutes": "PT34M",
    "points": 14,
    "rebounds": 17,
    "assists": 1,
    "steals": 0,
    "blocks": 2,
    "turnovers": 1
  }
}
```

## 8. Get Play-by-Play Breakdown

**GET** `/scoreboard/game/{game_id}/play-by-play`

### Description:

Retrieve a real-time breakdown of game events, including scoring plays, assists, turnovers, and other key actions.

### Request Parameters

| Parameter | Type  | Required | Description                         |
| --------- | ----- | -------- | ----------------------------------- |
| `game_id` | `str` | Yes      | Unique identifier for the NBA game. |

### Possible Responses

| Status Code                 | Meaning       | Description                                     |
| --------------------------- | ------------- | ----------------------------------------------- |
| `200 OK`                    | Success       | Returns a detailed list of play-by-play events. |
| `404 Not Found`             | No Data Found | No play-by-play data found for the game.        |
| `500 Internal Server Error` | Server Error  | Unexpected error.                               |

### Example Response

```json
{
  "game_id": "0022400919",
  "plays": [
    {
      "action_number": 4,
      "clock": "PT11M58.00S",
      "period": 1,
      "team_id": 1610612738,
      "team_tricode": "BOS",
      "action_type": "jumpball",
      "description": "Jump Ball T. Thompson vs. N. Vucevic: Tip to G. Williams",
      "player_id": 1629684,
      "player_name": "G. Williams",
      "score_home": "0",
      "score_away": "0"
    },
    {
      "action_number": 10,
      "clock": "PT10M32.00S",
      "period": 1,
      "team_id": 1610612737,
      "team_tricode": "ATL",
      "action_type": "shot",
      "description": "Trae Young makes 3-pt jump shot",
      "player_id": 1629027,
      "player_name": "T. Young",
      "score_home": "3",
      "score_away": "0"
    }
  ]
}
```

## 9. Scoreboard WebSocket

**Endpoint:** `/ws`

### Description

Establish a WebSocket connection to receive live scoreboard updates. When a client connects, the server immediately sends the current scoreboard data and continues broadcasting updates whenever game scores or statuses change.

### Request Example

```bash
wscat -c ws://localhost:8000/api/v1/ws
```

### Response Example

```json
{
  "scoreboard": {
    "gameDate": "2025-03-08",
    "games": [
      {
        "gameId": "0022400919",
        "gameStatus": 3,
        "gameStatusText": "Final",
        "period": 4,
        "gameClock": null,
        "gameTimeUTC": "2025-03-08T01:00:00Z",
        "homeTeam": {
          "teamId": 1610612752,
          "teamName": "New York Knicks",
          "teamCity": "New York",
          "teamTricode": "NYK",
          "score": 115
        },
        "awayTeam": {
          "teamId": 1610612738,
          "teamName": "Boston Celtics",
          "teamCity": "Boston",
          "teamTricode": "BOS",
          "score": 110
        }
      }
    ]
  }
}
```

### Usage Notes

- The message format matches the `/scoreboard` REST endpoint.
- Keep the connection open to continue receiving updates.
- Use `wss://` when the application is served over HTTPS.

## 10. Play-by-Play WebSocket

**Endpoint:** `/ws/{game_id}/play-by-play`

### Description

Connect to this endpoint to stream real-time play-by-play data for a specific game. Upon connection, the latest list of plays is sent. Subsequent messages contain updated play sequences as the game progresses.

### Request Example

```bash
wscat -c ws://localhost:8000/api/v1/ws/0022400919/play-by-play
```

### Response Example

```json
{
  "game_id": "0022400919",
  "plays": [
    {
      "action_number": 4,
      "clock": "PT11M58.00S",
      "period": 1,
      "team_id": 1610612738,
      "team_tricode": "BOS",
      "action_type": "jumpball",
      "description": "Jump Ball T. Thompson vs. N. Vucevic: Tip to G. Williams",
      "player_id": 1629684,
      "player_name": "G. Williams",
      "score_home": "0",
      "score_away": "0"
    }
  ]
}
```

### Usage Notes

- Establish separate connections for different `game_id` values if tracking multiple games.
- The payload structure mirrors the `GET /scoreboard/game/{game_id}/play-by-play` response.
- Updates are pushed whenever new plays are available.
