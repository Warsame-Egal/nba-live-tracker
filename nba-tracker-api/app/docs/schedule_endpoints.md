# NBA Schedule API Documentation

## Overview

The NBA Schedule API provides endpoints to retrieve game schedules for an entire season or for a specific team.

## Endpoints

### 1. Get Full Season Schedule

**GET** `/schedule/season/{season}`  
**Description:** Fetches all NBA games for a given season.

#### **Request Parameters**

| Parameter | Type     | Required | Description                                  |
| --------- | -------- | -------- | -------------------------------------------- |
| `season`  | `string` | Yes      | The NBA season identifier (e.g., `2023-24`). |

#### **Possible Responses**

| Status Code                 | Meaning        | Description                                  |
| --------------------------- | -------------- | -------------------------------------------- |
| `200 OK`                    | Success        | Returns the full season schedule.            |
| `404 Not Found`             | No Games Found | No games available for the requested season. |
| `500 Internal Server Error` | Server Error   | Unexpected error.                            |

---

### 2. Get Team's Season Schedule

**GET** `/schedule/team/{team_id}/season/{season}`  
**Description:** Fetches all games for a specific NBA team in a given season.

#### **Request Parameters**

| Parameter | Type     | Required | Description                                   |
| --------- | -------- | -------- | --------------------------------------------- |
| `team_id` | `int`    | Yes      | The NBA Team ID (e.g., `1610612744` for GSW). |
| `season`  | `string` | Yes      | The NBA season identifier (e.g., `2023-24`).  |

#### **Possible Responses**

| Status Code                 | Meaning        | Description                                         |
| --------------------------- | -------------- | --------------------------------------------------- |
| `200 OK`                    | Success        | Returns the team's season schedule.                 |
| `404 Not Found`             | No Games Found | No games available for the requested team & season. |
| `500 Internal Server Error` | Server Error   | Unexpected error.                                   |

---

## Schema Descriptions

### **ScheduledGame**

| Field               | Type    | Description                                     |
| ------------------- | ------- | ----------------------------------------------- |
| `season_id`         | `int`   | NBA season year, e.g., `2023`.                  |
| `team_id`           | `int`   | Unique identifier for the NBA team.             |
| `team_abbreviation` | `str`   | Three-letter team abbreviation (e.g., `"GSW"`). |
| `game_id`           | `str`   | Unique game identifier.                         |
| `game_date`         | `str`   | Scheduled date of the game (`YYYY-MM-DD`).      |
| `matchup`           | `str`   | Matchup format (`"GSW vs. SAC"`).               |
| `win_loss`          | `str`   | `"W"` (Win) or `"L"` (Loss).                    |
| `points_scored`     | `int`   | Total points scored by the team.                |
| `field_goal_pct`    | `float` | Field goal percentage (`0.427 = 42.7%`).        |
| `three_point_pct`   | `float` | Three-point percentage (`0.333 = 33.3%`).       |

### **ScheduleResponse**

| Field   | Type                  | Description                                  |
| ------- | --------------------- | -------------------------------------------- |
| `games` | `List[ScheduledGame]` | List of games for the requested season/team. |

---

## Versioning & Updates

- **API Version:** `v1`
- **Last Updated:** March 9, 2025

### Future Enhancements:

- Add player statistics per game.
- Filter schedule by home vs. away games.

---

## How to Use

1. Use **Postman** or `curl` to test the API.
2. Include the correct `team_id` and `season` values in the request.
3. Use `/schedule/season/{season}` for full season schedules.
4. Use `/schedule/team/{team_id}/
