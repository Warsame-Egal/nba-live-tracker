import asyncio
import logging

from fastapi import HTTPException
from nba_api.stats.endpoints import TeamDetails

from app.schemas.team import TeamDetailsResponse
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

# Set up logger for this file
logger = logging.getLogger(__name__)


async def get_team(team_id: int) -> TeamDetailsResponse:
    """
    Get detailed information about a specific NBA team.
    Includes things like arena, owner, coach, etc.

    Args:
        team_id: The NBA team ID (like 1610612737 for Lakers)

    Returns:
        TeamDetailsResponse: All team information

    Raises:
        HTTPException: If team not found or API error
    """
    try:
        # Get team details from NBA API
        api_kwargs = get_api_kwargs()
        await rate_limit()
        team_details_data = await asyncio.wait_for(
            asyncio.to_thread(lambda: TeamDetails(team_id=team_id, **api_kwargs).get_dict()), timeout=10.0
        )

        # Check if we got valid data back
        if not team_details_data or "resultSets" not in team_details_data or not team_details_data["resultSets"]:
            raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

        # Extract the team background information
        team_background_data = team_details_data["resultSets"][0]
        team_background_headers = team_background_data["headers"]
        team_background_rows = team_background_data["rowSet"]

        # If no team data, return 404 error
        if not team_background_rows:
            raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

        # Convert the data to a dictionary for easier access
        team_background = dict(zip(team_background_headers, team_background_rows[0]))

        # Build the response with all team information
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team {team_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
