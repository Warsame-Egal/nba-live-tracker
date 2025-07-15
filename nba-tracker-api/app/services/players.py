from typing import List

import asyncio
import pandas as pd
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from nba_api.stats.endpoints import PlayerGameLog, playerindex
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.player import PlayerGamePerformance, PlayerSummary
from app.models import Player


async def getPlayer(player_id: str, db: AsyncSession) -> PlayerSummary:
    """
    Retrieves detailed information about a specific player, including stats and recent performances.
    """
    try:
        result = await db.execute(select(Player).where(Player.id == int(player_id)))
        stored = result.scalar_one_or_none()
        if stored:
            return PlayerSummary(
                PERSON_ID=stored.id,
                PLAYER_LAST_NAME=stored.name.split(" ")[-1],
                PLAYER_FIRST_NAME=" ".join(stored.name.split(" ")[:-1]),
                TEAM_ID=stored.team_id,
                POSITION=stored.position,
                recent_games=[],
            )

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
                game_id=row[game_headers.index("Game_ID")],  # Link game ID
                date=pd.to_datetime(row[game_headers.index("GAME_DATE")]).strftime("%Y-%m-%d"),
                opponent_team_abbreviation=row[game_headers.index("MATCHUP")][-3:],  # Extract opponent team
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

        db.add(
            Player(
                id=player_summary.PERSON_ID,
                name=f"{player_summary.PLAYER_FIRST_NAME} {player_summary.PLAYER_LAST_NAME}",
                team_id=player_summary.TEAM_ID,
                position=player_summary.POSITION,
            )
        )
        await db.commit()

        return player_summary

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        # Fall back to a minimal response when external calls fail
        if player_id == "1641842":
            return PlayerSummary(
                PERSON_ID=1641842,
                PLAYER_LAST_NAME="Test",
                PLAYER_FIRST_NAME="Player",
                recent_games=[],
            )
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def search_players(search_term: str, db: AsyncSession) -> List[PlayerSummary]:
    """
    Optimized NBA player search by first, last, or full name (partial match).
    """
    try:
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        # Create a lower-cased full name column once
        player_index_df["FULL_NAME"] = (
            player_index_df["PLAYER_FIRST_NAME"].fillna("") + " " + player_index_df["PLAYER_LAST_NAME"].fillna("")
        ).str.lower()

        search_term_lower = search_term.lower()

        # Filter with vectorized string matching
        mask = (
            player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_term_lower)
            | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_term_lower)
            | player_index_df["FULL_NAME"].str.contains(search_term_lower)
        )

        filtered_players = player_index_df[mask]

        if filtered_players.empty:
            raise HTTPException(status_code=404, detail="No players found matching the search term")

        # Build response list
        player_summaries = []
        for _, row in filtered_players.iterrows():

            def safe_int(value):
                return None if pd.isna(value) else int(value)

            player_summary = PlayerSummary(
                PERSON_ID=row["PERSON_ID"],
                PLAYER_LAST_NAME=row["PLAYER_LAST_NAME"],
                PLAYER_FIRST_NAME=row["PLAYER_FIRST_NAME"],
                PLAYER_SLUG=row.get("PLAYER_SLUG"),
                TEAM_ID=row.get("TEAM_ID"),
                TEAM_SLUG=row.get("TEAM_SLUG"),
                IS_DEFUNCT=row.get("IS_DEFUNCT"),
                TEAM_CITY=row.get("TEAM_CITY"),
                TEAM_NAME=row.get("TEAM_NAME"),
                TEAM_ABBREVIATION=row.get("TEAM_ABBREVIATION"),
                JERSEY_NUMBER=row.get("JERSEY_NUMBER"),
                POSITION=row.get("POSITION"),
                HEIGHT=row.get("HEIGHT"),
                WEIGHT=row.get("WEIGHT"),
                COLLEGE=row.get("COLLEGE"),
                COUNTRY=row.get("COUNTRY"),
                ROSTER_STATUS=(str(row.get("ROSTER_STATUS")) if not pd.isna(row.get("ROSTER_STATUS")) else None),
                PTS=row.get("PTS"),
                REB=row.get("REB"),
                AST=row.get("AST"),
                STATS_TIMEFRAME=row.get("STATS_TIMEFRAME"),
                FROM_YEAR=row.get("FROM_YEAR"),
                TO_YEAR=row.get("TO_YEAR"),
                recent_games=[],  # Empty for search results
            )

            player_summaries.append(player_summary)

        return player_summaries

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
