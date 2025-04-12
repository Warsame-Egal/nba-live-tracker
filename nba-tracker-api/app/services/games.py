import re
from typing import List, Optional

from fastapi import HTTPException
from nba_api.stats.endpoints import BoxScoreSummaryV2, BoxScoreTraditionalV2

from app.schemas.game import (
    GameDetailsResponse,
    GameSummary,
    PlayerGameEntry,
    PlayerGameStats,
)


async def getGameDetails(game_id: str) -> GameDetailsResponse:
    try:
        raw_data = BoxScoreSummaryV2(game_id=game_id).get_dict()
        stats_data = BoxScoreTraditionalV2(game_id=game_id).get_dict()

        if not raw_data["resultSets"]:
            raise HTTPException(status_code=404, detail="No data found for this game")

        # Extract Game Summary
        game_summary_data = raw_data["resultSets"][0]["rowSet"]
        if not game_summary_data:
            raise HTTPException(status_code=404, detail="Game summary not available")

        game_summary = dict(zip(raw_data["resultSets"][0]["headers"], game_summary_data[0]))

        # Extract Players from `BoxScoreTraditionalV2`
        player_stats_data = stats_data["resultSets"][0]["rowSet"]
        player_stats_headers = stats_data["resultSets"][0]["headers"]

        players = [
            PlayerGameEntry(
                player_id=row[player_stats_headers.index("PLAYER_ID")],
                first_name=row[player_stats_headers.index("PLAYER_NAME")].split(" ")[0],
                last_name=row[player_stats_headers.index("PLAYER_NAME")].split(" ")[-1],
                team_abbreviation=row[player_stats_headers.index("TEAM_ABBREVIATION")],
                team_id=row[player_stats_headers.index("TEAM_ID")],
                position=(
                    row[player_stats_headers.index("START_POSITION")]
                    if "START_POSITION" in player_stats_headers
                    else None
                ),
            )
            for row in player_stats_data
        ]

        return GameDetailsResponse(
            game_summary=GameSummary(
                game_date_est=game_summary.get("GAME_DATE_EST", "N/A"),
                game_id=game_summary.get("GAME_ID", "N/A"),
                game_status_text=game_summary.get("GAME_STATUS_TEXT", "N/A"),
                home_team_id=game_summary.get("HOME_TEAM_ID", 0),
                visitor_team_id=game_summary.get("VISITOR_TEAM_ID", 0),
                season=game_summary.get("SEASON", "N/A"),
            ),
            players=players,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game details: {e}")


async def getGamePlayers(game_id: str) -> List[PlayerGameEntry]:
    try:
        stats_data = BoxScoreTraditionalV2(game_id=game_id).get_dict()  # Fetch player stats

        if "resultSets" not in stats_data:
            raise HTTPException(status_code=404, detail="No game data found")

        # Extract Player Stats Data
        player_stats_data = stats_data["resultSets"][0]["rowSet"]
        player_stats_headers = stats_data["resultSets"][0]["headers"]

        # Check if "START_POSITION" exists
        has_start_position = "START_POSITION" in player_stats_headers

        players = [
            PlayerGameEntry(
                player_id=row[player_stats_headers.index("PLAYER_ID")],
                first_name=row[player_stats_headers.index("PLAYER_NAME")].split(" ")[0],  # Extract first name
                last_name=row[player_stats_headers.index("PLAYER_NAME")].split(" ")[-1],  # Extract last name
                team_abbreviation=row[player_stats_headers.index("TEAM_ABBREVIATION")],
                team_id=row[player_stats_headers.index("TEAM_ID")],
                position=(row[player_stats_headers.index("START_POSITION")] if has_start_position else None),
            )
            for row in player_stats_data
        ]

        if not players:
            raise HTTPException(status_code=404, detail="No players found for this game")

        return players

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game players: {e}")


def clean_and_convert_minutes(minutes_str: Optional[str]) -> Optional[str]:
    """
    Cleans and converts the minutes string to a more usable format.

    Args:
        minutes_str: The minutes string from the data (e.g., "30.000000:00", "20.000000:07").

    Returns:
        The cleaned minutes string (e.g., "30:00", "20:07") or None if input is invalid.
    """
    if not minutes_str:
        return None  # Handle None or empty strings gracefully

    match = re.match(r"(\d+)\.\d+:(00|\d{2})", minutes_str)  # Improved regex
    if match:
        return f"{match.group(1)}:{match.group(2)}"
    else:
        # Handle unexpected formats gracefully (log, raise exception, or return None)
        print(f"Warning: Unexpected minutes format: {minutes_str}")
        return None  # Or raise ValueError(f"Invalid minutes format: {minutes_str}")


async def getGameStats(game_id: str) -> List[PlayerGameStats]:
    try:
        stats_data = BoxScoreTraditionalV2(game_id=game_id).get_dict()

        if "resultSets" not in stats_data:
            raise HTTPException(status_code=404, detail="No game data found")

        player_stats_data = stats_data["resultSets"][0]["rowSet"]
        player_stats_headers = stats_data["resultSets"][0]["headers"]

        stats = [
            PlayerGameStats(
                player_id=row[player_stats_headers.index("PLAYER_ID")],
                player_name=row[player_stats_headers.index("PLAYER_NAME")],  # Corrected line
                team_id=row[player_stats_headers.index("TEAM_ID")],
                team_abbreviation=row[player_stats_headers.index("TEAM_ABBREVIATION")],
                points=row[player_stats_headers.index("PTS")],
                rebounds=row[player_stats_headers.index("REB")],
                assists=row[player_stats_headers.index("AST")],
                minutes=clean_and_convert_minutes(row[player_stats_headers.index("MIN")]),
                steals=row[player_stats_headers.index("STL")],
                blocks=row[player_stats_headers.index("BLK")],
                turnovers=row[player_stats_headers.index("TO")],
            )
            for row in player_stats_data
        ]

        if not stats:
            raise HTTPException(status_code=404, detail="No players stats found for this game")

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game stats: {e}")
