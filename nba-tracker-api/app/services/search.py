from typing import List
from fastapi import HTTPException
import asyncio
import pandas as pd
from nba_api.stats.endpoints import playerindex
from nba_api.stats.static import teams
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.search import PlayerResult, TeamResult, SearchResults


async def search_entities(query: str) -> SearchResults:
    """
    Search for players and teams by name using the NBA API.
    """
    try:
        search_lower = query.lower()
        player_results: List[PlayerResult] = []
        team_results: List[TeamResult] = []

        # Search players
        try:
            player_index_data = await asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
            )
            player_index_df = player_index_data.get_data_frames()[0]

            filtered_players = player_index_df[
                player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
                | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_lower, na=False)
            ].head(10)  # Limit to 10 players

            for _, row in filtered_players.iterrows():
                player_results.append(
                    PlayerResult(
                        id=int(row["PERSON_ID"]),
                        name=f"{row['PLAYER_FIRST_NAME']} {row['PLAYER_LAST_NAME']}",
                        team_id=int(row["TEAM_ID"]) if pd.notna(row.get("TEAM_ID")) else None,
                        team_abbreviation=row.get("TEAM_ABBREVIATION") if pd.notna(row.get("TEAM_ABBREVIATION")) else None,
                    )
                )
        except Exception as e:
            print(f"Error searching players: {e}")

        # Search teams
        all_teams = teams.get_teams()
        for team in all_teams:
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
                if len(team_results) >= 10:  # Limit to 10 teams
                    break

        return SearchResults(players=player_results, teams=team_results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
