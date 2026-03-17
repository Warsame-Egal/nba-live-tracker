import asyncio
import logging
import pandas as pd
from typing import List

from fastapi import HTTPException
from nba_api.stats.endpoints import playerindex
from nba_api.stats.static import teams
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.search import PlayerResult, TeamResult, SearchResults
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

# Set up logger for this file
logger = logging.getLogger(__name__)


async def search_entities(query: str) -> SearchResults:
    """
    Search for both players and teams by name.
    Returns matching players and teams in one response.

    Args:
        query: The search term (player name or team name)

    Returns:
        SearchResults: Lists of matching players and teams

    Raises:
        HTTPException: If API error occurs
    """
    try:
        search_lower = query.lower()
        player_results: List[PlayerResult] = []
        team_results: List[TeamResult] = []

        # Search for players
        try:
            # Get all players from NBA API
            api_kwargs = get_api_kwargs()
            await rate_limit()
            player_index_data = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
                ),
                timeout=15.0,
            )
            player_index_df = player_index_data.get_data_frames()[0]

            # Find players whose first or last name matches the search
            filtered_players = player_index_df[
                player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
                | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_lower, na=False)
            ].head(
                10
            )  # Limit to 10 players

            # Convert to native Python types immediately
            players_data = filtered_players.to_dict(orient="records")
            del filtered_players  # Delete filtered DataFrame
            del player_index_df  # Delete original DataFrame

            # Convert each player to our format
            for row in players_data:
                player_results.append(
                    PlayerResult(
                        id=int(row["PERSON_ID"]),
                        name=f"{row['PLAYER_FIRST_NAME']} {row['PLAYER_LAST_NAME']}",
                        team_id=int(row["TEAM_ID"]) if pd.notna(row.get("TEAM_ID")) else None,
                        team_abbreviation=(
                            row.get("TEAM_ABBREVIATION") if pd.notna(row.get("TEAM_ABBREVIATION")) else None
                        ),
                    )
                )
        except Exception as e:
            # If player search fails, log it but continue with team search
            logger.warning(f"Error searching players: {e}")

        # Search for teams
        all_teams = teams.get_teams()
        for team in all_teams:
            # Check if search term matches team name, abbreviation, or nickname
            if (
                search_lower in team["full_name"].lower()
                or search_lower in team["abbreviation"].lower()
                or search_lower in team["nickname"].lower()
            ):
                team_results.append(
                    TeamResult(
                        id=team["id"],
                        name=team["full_name"],
                        abbreviation=team["abbreviation"],
                    )
                )
                # Limit to 10 teams
                if len(team_results) >= 10:
                    break

        return SearchResults(players=player_results, teams=team_results)

    except Exception as e:
        logger.error(f"Error in search for query '{query}': {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
