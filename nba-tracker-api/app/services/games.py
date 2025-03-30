from nba_api.stats.endpoints import BoxScoreSummaryV2, BoxScoreTraditionalV2
from app.schemas.game import (
    GameDetailsResponse, GameSummary,
    PlayerGameEntry, PlayerGameStats
)
from fastapi import HTTPException
from typing import List
from app.services.players import getPlayer  #Import player details function
from typing import List

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
                position=row[player_stats_headers.index("START_POSITION")] if "START_POSITION" in player_stats_headers else None
            ) for row in player_stats_data
        ]

        return GameDetailsResponse(
            game_summary=GameSummary(
                game_date_est=game_summary.get("GAME_DATE_EST", "N/A"),
                game_id=game_summary.get("GAME_ID", "N/A"),
                game_status_text=game_summary.get("GAME_STATUS_TEXT", "N/A"),
                home_team_id=game_summary.get("HOME_TEAM_ID", 0),
                visitor_team_id=game_summary.get("VISITOR_TEAM_ID", 0),
                season=game_summary.get("SEASON", "N/A")
            ),
            players=players,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game details: {e}")



async def getGamePlayers(game_id: str) -> List[PlayerGameEntry]:
    try:
        stats_data = BoxScoreTraditionalV2(game_id=game_id).get_dict()  #Fetch player stats

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
                position=row[player_stats_headers.index("START_POSITION")] if has_start_position else None
            ) for row in player_stats_data
        ]

        if not players:
            raise HTTPException(status_code=404, detail="No players found for this game")

        return players

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game players: {e}")


async def getGameStats(game_id: str) -> List[PlayerGameStats]:
    try:
        stats_data = BoxScoreTraditionalV2(game_id=game_id).get_dict()

        if "resultSets" not in stats_data:
            raise HTTPException(status_code=404, detail="No game data found")

        player_stats_data = stats_data["resultSets"][0]["rowSet"]
        player_stats_headers = stats_data["resultSets"][0]["headers"]

        stats = []
        for row in player_stats_data:
            player_id = row[player_stats_headers.index("PLAYER_ID")]
            
            # Fetch full player profile from `/players/{player_id}`
            player_profile = await getPlayer(player_id)

            stats.append(PlayerGameStats(
                player_id=player_id,
                player_name=player_profile.full_name,
                team_id=row[player_stats_headers.index("TEAM_ID")],
                team_abbreviation=row[player_stats_headers.index("TEAM_ABBREVIATION")],
                points=row[player_stats_headers.index("PTS")],
                rebounds=row[player_stats_headers.index("REB")],
                assists=row[player_stats_headers.index("AST")],
                minutes=row[player_stats_headers.index("MIN")],
                steals=row[player_stats_headers.index("STL")],
                blocks=row[player_stats_headers.index("BLK")],
                turnovers=row[player_stats_headers.index("TO")]
            ))

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching game stats: {e}")