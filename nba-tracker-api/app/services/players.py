import asyncio
import logging
import pandas as pd
from typing import List

from fastapi import HTTPException
from nba_api.stats.endpoints import PlayerGameLog, playerindex
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.player import PlayerGamePerformance, PlayerSummary

# Set up logger for this file
logger = logging.getLogger(__name__)


async def getPlayer(player_id: str) -> PlayerSummary:
    """
    Get detailed information about a specific player.
    Includes their stats and their last 5 games.
    
    Args:
        player_id: The NBA player ID
        
    Returns:
        PlayerSummary: All player information and recent games
        
    Raises:
        HTTPException: If player not found or API error
    """
    try:
        # Get the list of all players from NBA API
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        # Find the player we're looking for
        player_id_int = int(player_id)
        player_row = player_index_df[player_index_df["PERSON_ID"] == player_id_int]

        # If player doesn't exist, return 404 error
        if player_row.empty:
            raise HTTPException(status_code=404, detail=f"Player not found with ID: {player_id}")

        # Convert the player data to a dictionary
        player_data = player_row.iloc[0].to_dict()

        # Handle roster status (sometimes it's a number, sometimes a string)
        roster_status = player_data.get("ROSTER_STATUS")
        if isinstance(roster_status, float):
            roster_status = str(roster_status)

        # Get the player's recent game performances
        game_log_data = await asyncio.to_thread(lambda: PlayerGameLog(player_id=player_id).get_dict())
        game_log = game_log_data["resultSets"][0]["rowSet"]
        game_headers = game_log_data["resultSets"][0]["headers"]

        # Convert each game into our format (only last 5 games)
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
            for row in game_log[:5]  # Only get the last 5 games
        ]

        # Build the player summary with all their info
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player {player_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def search_players(search_term: str) -> List[PlayerSummary]:
    """
    Search for players by name.
    Looks for players whose first or last name matches the search term.
    
    Args:
        search_term: The name to search for
        
    Returns:
        List[PlayerSummary]: List of matching players (up to 20)
        
    Raises:
        HTTPException: If no players found or API error
    """

    try:
        # Get all players from NBA API
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        # Search for players whose name matches (case-insensitive)
        search_lower = search_term.lower()
        filtered_players = player_index_df[
            player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
            | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_lower, na=False)
        ]

        # If no players found, return 404 error
        if filtered_players.empty:
            raise HTTPException(status_code=404, detail="No players found matching the search term")

        # Limit to 20 results so we don't return too much data
        filtered_players = filtered_players.head(20)

        # Convert each player to our PlayerSummary format
        player_summaries: List[PlayerSummary] = []
        for _, row in filtered_players.iterrows():
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
                    recent_games=[],  # Don't include recent games in search results
                )
            )

        return player_summaries

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching players with term '{search_term}': {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
