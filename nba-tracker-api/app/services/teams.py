import asyncio
from fastapi import HTTPException
from sqlalchemy import select
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from nba_api.stats.endpoints import TeamDetails

from app.schemas.team import TeamDetailsResponse
from app.models import Team, TeamDetailsCache


async def get_team(team_id: int, db: AsyncSession) -> TeamDetailsResponse:
    """
    Retrieves detailed information about a specific team.
    """
    try:
        stmt = select(TeamDetailsCache).where(TeamDetailsCache.team_id == team_id)
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()
        if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(seconds=60):
            return TeamDetailsResponse.model_validate_json(cached.data)

        # Fetch team details using nba_api (adjust endpoint if needed)
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

        data_json = team_details.model_dump_json()
        if cached:
            cached.data = data_json
            cached.fetched_at = datetime.utcnow()
        else:
            db.add(
                TeamDetailsCache(
                    team_id=team_details.team_id,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )

        result = await db.execute(select(Team).where(Team.id == team_details.team_id))
        existing_team = result.scalar_one_or_none()

        if existing_team is None:
            db.add(
                Team(
                    id=team_details.team_id,
                    name=team_details.team_name,
                    abbreviation=team_details.abbreviation or "",
                )
            )
        else:
            updated = False
            if team_details.team_name and existing_team.name != team_details.team_name:
                existing_team.name = team_details.team_name
                updated = True
            if team_details.abbreviation and existing_team.abbreviation != team_details.abbreviation:
                existing_team.abbreviation = team_details.abbreviation
                updated = True
            if updated:
                db.add(existing_team)

        await db.commit()

        return team_details

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}") from e