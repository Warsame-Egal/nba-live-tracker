# NBA Scoreboard API Documentation

## Overview

The NBA Scoreboard API endpoints to retrieve information about player details.

## Endpoints

### 1. Get Player Details

**GET** `/player/{player_id}`

### Description:

Retrieve detailed information about a specific player.

### Request Parameters

| Parameter   | Type | Required | Description                       |
| ----------- | ---- | -------- | --------------------------------- |
| `player_id` | int  | Yes      | Unique identifier for the player. |

### Possible Responses

| Status Code                 | Meaning       | Description                           |
| --------------------------- | ------------- | ------------------------------------- |
| `200 OK`                    | Success       | Returns detailed player information.  |
| `404 Not Found`             | No Data Found | No player found with the provided ID. |
| `500 Internal Server Error` | Server Error  | Unexpected error.                     |

### Example Response

```json
{
  "player_id": 201935,
  "full_name": "James Harden",
  "team_id": 1610612746,
  "team_name": "Clippers",
  "team_abbreviation": "LAC",
  "jersey_number": "1",
  "position": "G",
  "height": "6-5",
  "weight": 220,
  "college": "Arizona State",
  "country": "USA",
  "from_year": 2009,
  "to_year": 2024,
  "points_per_game": 22.1,
  "rebounds_per_game": 5.7,
  "assists_per_game": 8.5
}
```

### 5. Search Players

GET /players/search

### Description: Search for a player by name.

### Request Parameters

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `name`    | string | Yes      | The player's full name, first name, or last name |

### Possible Responses

| Status Code                 | Meaning       | Description                                    |
| --------------------------- | ------------- | ---------------------------------------------- |
| `200 OK`                    | Success       | Returns a list of players matching the search. |
| `404 Not Found`             | No Data Found | No players found with the provided name.       |
| `500 Internal Server Error` | Server Error  | Unexpected error.                              |

### Example Requests

- `/players/search?name=LeBron`
- `/players/search?name=James`
- `/players/search?name=LeBron James`

Example Response

```json
[
  {
    "player_id": 2544,
    "full_name": "LeBron James",
    "team_id": 1610612747,
    "team_name": "Lakers",
    "team_abbreviation": "LAL",
    "jersey_number": "23",
    "position": "F",
    "height": "6-9",
    "weight": 250,
    "college": "St. Vincent-St. Mary HS (OH)",
    "country": "USA",
    "from_year": 2003,
    "to_year": 2024,
    "points_per_game": 25.0,
    "rebounds_per_game": 8.2,
    "assists_per_game": 8.5
  }
]
```

Versioning & Updates
API Version: v1
Last Updated: March 9, 2025
