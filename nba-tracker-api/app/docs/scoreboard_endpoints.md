# NBA Scoreboard API Documentation

## Overview

The NBA Scoreboard API provides endpoints to retrieve information about team records, rosters, and matchups.

## Endpoints

### 1. Get Team Info (All-Time Games)

**GET** `/scoreboard/team/{team_id}/info`  
**Description:** Fetch all games played by a team across seasons.

#### **Request Parameters**

| Parameter | Type  | Required | Description                        |
| --------- | ----- | -------- | ---------------------------------- |
| `team_id` | `int` | Yes      | Unique identifier for the NBA team |

#### **Possible Responses**

| Status Code                 | Meaning        | Description                                  |
| --------------------------- | -------------- | -------------------------------------------- |
| `200 OK`                    | Success        | Returns the full schedule of all team games. |
| `404 Not Found`             | No Games Found | No games available for the requested team.   |
| `500 Internal Server Error` | Server Error   | Unexpected error.                            |

#### **Example Response**

```json
{
  "games": [
    {
      "season_id": 2024,
      "team_id": 1610612744,
      "team_abbreviation": "GSW",
      "game_id": "0022400919",
      "game_date": "2025-03-08",
      "matchup": "GSW vs DET",
      "win_loss": "W",
      "points_scored": 115,
      "field_goal_pct": 0.417,
      "three_point_pct": 0.293
    }
  ]
}
```

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

### 4. Get Head-to-Head Matchups

**GET** `/scoreboard/matchup/{team1_id}/{team2_id}`

### Description:

Retrieve past games where two teams played against each other.

### Request Parameters

| Parameter  | Type | Required | Description                                |
| ---------- | ---- | -------- | ------------------------------------------ |
| `team1_id` | int  | Yes      | Unique identifier for the first NBA team.  |
| `team2_id` | int  | Yes      | Unique identifier for the second NBA team. |

### Possible Responses

| Status Code                 | Meaning       | Description                                         |
| --------------------------- | ------------- | --------------------------------------------------- |
| `200 OK`                    | Success       | Returns a list of past games between the two teams. |
| `404 Not Found`             | No Data Found | No matchups found between the specified teams.      |
| `500 Internal Server Error` | Server Error  | Unexpected error.                                   |

### Example Response

```json
{
  "games": [
    {
      "season_id": 2024,
      "team_id": 1610612744,
      "team_abbreviation": "GSW",
      "game_id": "0022400919",
      "game_date": "2025-03-08",
      "matchup": "GSW vs DET",
      "win_loss": "W",
      "points_scored": 115,
      "field_goal_pct": 0.417,
      "three_point_pct": 0.293
    },
    {
      "season_id": 2024,
      "team_id": 1610612738,
      "team_abbreviation": "BOS",
      "game_id": "0022400885",
      "game_date": "2025-03-04",
      "matchup": "BOS vs GSW",
      "win_loss": "L",
      "points_scored": 110,
      "field_goal_pct": 0.489,
      "three_point_pct": 0.351
    }
  ]
}
```
