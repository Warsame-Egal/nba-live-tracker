from typing import List

import asyncio
import pandas as pd
from fastapi import HTTPException
from nba_api.stats.endpoints import PlayerGameLog, playerindex
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.player import PlayerGamePerformance, PlayerSummary


async def getPlayer(player_id: str) -> PlayerSummary:
    """
    Retrieves detailed information about a specific player, including stats and recent performances.
    """
    try:
        # Get player index to fetch player details
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        player_id_int = int(player_id)
        player_row = player_index_df[player_index_df["PERSON_ID"] == player_id_int]

        if player_row.empty:
            raise HTTPException(status_code=404, detail="Player not found in player index")

        player_data = player_row.iloc[0].to_dict()

        roster_status = player_data.get("ROSTER_STATUS")
        if isinstance(roster_status, float):
            roster_status = str(roster_status)

        # Fetch player's recent game performances
        game_log_data = await asyncio.to_thread(lambda: PlayerGameLog(player_id=player_id).get_dict())
        game_log = game_log_data["resultSets"][0]["rowSet"]
        game_headers = game_log_data["resultSets"][0]["headers"]

        recent_games = [
            PlayerGamePerformance(
                game_id=row[game_headers.index("Game_ID")],
                date=pd.to_datetime(row[game_headers.index("GAME_DATE")]).strftime("%Y-%m-%d"),
                opponent_team_abbreviation=row[game_headers.index("MATCHUP")][-3:],
                points=row[game_headers.index("PTS")],
                rebounds=row[game_headers.index("REB")],
                assists=row[game_headers.index("AST")],
                steals=row[game_headers.index("STL")],
                blocks=row[game_headers.index("BLK")],
            )
            for row in game_log[:5]  # Limit to last 5 games
        ]

        player_summary = PlayerSummary(
            PERSON_ID=player_data["PERSON_ID"],
            PLAYER_LAST_NAME=player_data["PLAYER_LAST_NAME"],
            PLAYER_FIRST_NAME=player_data["PLAYER_FIRST_NAME"],
            PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
            TEAM_ID=player_data.get("TEAM_ID"),
            TEAM_SLUG=player_data.get("TEAM_SLUG"),
            IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
            TEAM_CITY=player_data.get("TEAM_CITY"),
            TEAM_NAME=player_data.get("TEAM_NAME"),
            TEAM_ABBREVIATION=player_data.get("TEAM_ABBREVIATION"),
            JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
            POSITION=player_data.get("POSITION"),
            HEIGHT=player_data.get("HEIGHT"),
            WEIGHT=player_data.get("WEIGHT"),
            COLLEGE=player_data.get("COLLEGE"),
            COUNTRY=player_data.get("COUNTRY"),
            ROSTER_STATUS=roster_status,
            PTS=player_data.get("PTS"),
            REB=player_data.get("REB"),
            AST=player_data.get("AST"),
            STATS_TIMEFRAME=player_data.get("STATS_TIMEFRAME"),
            FROM_YEAR=player_data.get("FROM_YEAR"),
            TO_YEAR=player_data.get("TO_YEAR"),
            recent_games=recent_games,
        )

        return player_summary

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def search_players(search_term: str) -> List[PlayerSummary]:
    """Search players by name using the NBA API."""
    try:
        # Get all players from player index
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        # Filter players by search term
        search_lower = search_term.lower()
        matching_players = player_index_df[
            player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
            | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_lower, na=False)
            | player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
            | (player_index_df["PLAYER_FIRST_NAME"] + " " + player_index_df["PLAYER_LAST_NAME"])
            .str.lower()
            .str.contains(search_lower, na=False)
        ]

        if matching_players.empty:
            raise HTTPException(status_code=404, detail="No players found matching the search term")

        player_summaries: List[PlayerSummary] = []
        for _, row in matching_players.head(20).iterrows():  # Limit to 20 results
            player_data = row.to_dict()
            roster_status = player_data.get("ROSTER_STATUS")
            if isinstance(roster_status, float):
                roster_status = str(roster_status)

            player_summaries.append(
                PlayerSummary(
                    PERSON_ID=player_data["PERSON_ID"],
                    PLAYER_LAST_NAME=player_data["PLAYER_LAST_NAME"],
                    PLAYER_FIRST_NAME=player_data["PLAYER_FIRST_NAME"],
                    PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
                    TEAM_ID=player_data.get("TEAM_ID"),
                    TEAM_SLUG=player_data.get("TEAM_SLUG"),
                    IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
                    TEAM_CITY=player_data.get("TEAM_CITY"),
                    TEAM_NAME=player_data.get("TEAM_NAME"),
                    TEAM_ABBREVIATION=player_data.get("TEAM_ABBREVIATION"),
                    JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
                    POSITION=player_data.get("POSITION"),
                    HEIGHT=player_data.get("HEIGHT"),
                    WEIGHT=player_data.get("WEIGHT"),
                    COLLEGE=player_data.get("COLLEGE"),
                    COUNTRY=player_data.get("COUNTRY"),
                    ROSTER_STATUS=roster_status,
                    PTS=player_data.get("PTS"),
                    REB=player_data.get("REB"),
                    AST=player_data.get("AST"),
                    STATS_TIMEFRAME=player_data.get("STATS_TIMEFRAME"),
                    FROM_YEAR=player_data.get("FROM_YEAR"),
                    TO_YEAR=player_data.get("TO_YEAR"),
                    recent_games=[],
                )
            )

        return player_summaries

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
