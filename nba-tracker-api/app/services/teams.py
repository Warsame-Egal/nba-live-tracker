from typing import List

import pandas as pd
from fastapi import HTTPException
from nba_api.stats.endpoints import TeamDetails
from nba_api.stats.static import teams

from app.schemas.team import TeamDetailsResponse, TeamSummary


async def get_team(team_id: int) -> TeamDetailsResponse:
    """
    Retrieves detailed information about a specific team.
    """
    try:
        # Fetch team details using nba_api (adjust endpoint if needed)
        team_details_data = TeamDetails(team_id=team_id).get_dict()

        # Validation: Check if data is present
        if not team_details_data or "resultSets" not in team_details_data or not team_details_data["resultSets"]:
            raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

        team_background_data = team_details_data["resultSets"][0]
        team_background_headers = team_background_data["headers"]
        team_background_rows = team_background_data["rowSet"]

        if not team_background_rows:
            raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

        team_background = dict(zip(team_background_headers, team_background_rows[0]))

        # Map nba_api data to your TeamDetailsResponse schema
        team_details = TeamDetailsResponse(
            team_id=int(team_background["TEAM_ID"]),
            team_name=team_background["NICKNAME"],
            team_city=team_background["CITY"],
            abbreviation=team_background.get("ABBREVIATION"),
            year_founded=team_background.get("YEARFOUNDED"),
            arena=team_background.get("ARENA"),
            arena_capacity=team_background.get("ARENACAPACITY"),
            owner=team_background.get("OWNER"),
            general_manager=team_background.get("GENERALMANAGER"),
            head_coach=team_background.get("HEADCOACH"),
        )

        return team_details

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}") from e


async def search_teams(search_term: str) -> List[TeamSummary]:
    """
    Optimized NBA team search by city, name, or abbreviation (partial match).
    """
    try:
        nba_teams = teams.get_teams()
        team_list_data = pd.DataFrame(nba_teams)

        # Create a lower-cased full name column once
        team_list_data["full_name_lower"] = (
            team_list_data["city"].str.lower() + " " + team_list_data["nickname"].str.lower()
        )

        search_term_lower = search_term.lower()

        # Filter with vectorized string matching
        mask = (
            team_list_data["city"].str.lower().str.contains(search_term_lower)
            | team_list_data["nickname"].str.lower().str.contains(search_term_lower)
            | team_list_data["full_name_lower"].str.lower().str.contains(search_term_lower)
            | team_list_data["abbreviation"].str.lower().str.contains(search_term_lower)
        )

        filtered_teams = team_list_data[mask]

        if filtered_teams.empty:
            raise HTTPException(status_code=404, detail="No teams found matching the search term")

        # Build response list
        team_summaries = []
        for _, row in filtered_teams.iterrows():
            team_summary = TeamSummary(
                team_id=row["id"],
                abbreviation=row["abbreviation"],
                city=row["city"],
                full_name=row["full_name"],
                nickname=row["nickname"],
                state=row.get("state"),
                year_founded=row.get("year_founded"),
            )

            team_summaries.append(team_summary)

        return team_summaries

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
