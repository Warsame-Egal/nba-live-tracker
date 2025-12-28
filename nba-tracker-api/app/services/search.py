from typing import List
from fastapi import HTTPException
import asyncio

from nba_api.stats.endpoints import playerindex
from nba_api.stats.library.parameters import HistoricalNullable
from nba_api.stats.static import teams

from app.schemas.search import PlayerResult, TeamResult, SearchResults


async def search_entities(query: str) -> SearchResults:
    try:
        query_lower = query.lower()
        player_results: List[PlayerResult] = []
        team_results: List[TeamResult] = []

        # Search teams from static data
        all_teams = teams.get_teams()
        for team in all_teams:
            team_name_lower = team["full_name"].lower()
            abbreviation_lower = team["abbreviation"].lower()
            city_lower = team["city"].lower()

            if (
                query_lower in team_name_lower
                or query_lower in abbreviation_lower
                or query_lower in city_lower
            ):
                team_results.append(
                    TeamResult(
                        id=team["id"],
                        name=team["full_name"],
                        abbreviation=team["abbreviation"],
                    )
                )
                if len(team_results) >= 5:  # Limit teams to 5
                    break

        # Search players from NBA API
        remaining = 10 - len(team_results)
        if remaining > 0:
            player_index_data = await asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
            )
            player_index_df = player_index_data.get_data_frames()[0]

            matching_players = player_index_df[
                player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(query_lower, na=False)
                | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(query_lower, na=False)
                | (player_index_df["PLAYER_FIRST_NAME"] + " " + player_index_df["PLAYER_LAST_NAME"])
                .str.lower()
                .str.contains(query_lower, na=False)
            ]

            for _, row in matching_players.head(remaining).iterrows():
                player_data = row.to_dict()
                player_results.append(
                    PlayerResult(
                        id=int(player_data["PERSON_ID"]),
                        name=f"{player_data['PLAYER_FIRST_NAME']} {player_data['PLAYER_LAST_NAME']}",
                        team_id=player_data.get("TEAM_ID"),
                        team_abbreviation=player_data.get("TEAM_ABBREVIATION"),
                    )
                )

        return SearchResults(players=player_results, teams=team_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
