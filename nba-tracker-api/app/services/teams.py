import asyncio
from fastapi import HTTPException
from nba_api.stats.endpoints import TeamDetails

from app.schemas.team import TeamDetailsResponse


async def get_team(team_id: int) -> TeamDetailsResponse:
    """
    Retrieves detailed information about a specific team.
    """
    try:
        # Fetch team details using nba_api
        team_details_data = await asyncio.to_thread(lambda: TeamDetails(team_id=team_id).get_dict())

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
