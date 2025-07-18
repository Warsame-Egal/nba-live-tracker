from typing import List
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Player, Team
from app.schemas.search import PlayerResult, TeamResult, SearchResults


async def search_entities(query: str, db: AsyncSession) -> SearchResults:
    try:
        players: List[Player] = []
        teams: List[Team] = []

        # exact player matches
        stmt = select(Player).where(Player.name.ilike(query))
        result = await db.execute(stmt)
        players += result.scalars().all()

        remaining = 10 - len(players) - len(teams)
        if remaining > 0:
            stmt = select(Team).where((Team.name.ilike(query)) | (Team.abbreviation.ilike(query)))
            result = await db.execute(stmt)
            teams += result.scalars().all()[:remaining]

        remaining = 10 - len(players) - len(teams)
        if remaining > 0:
            stmt = select(Player).where(Player.name.ilike(f"%{query}%"))
            exclude_player_ids = [p.id for p in players]
            if exclude_player_ids:
                stmt = stmt.where(Player.id.notin_(exclude_player_ids))
            stmt = stmt.limit(remaining)
            result = await db.execute(stmt)
            players += result.scalars().all()

        remaining = 10 - len(players) - len(teams)
        if remaining > 0:
            stmt = select(Team).where((Team.name.ilike(f"%{query}%")) | (Team.abbreviation.ilike(f"%{query}%")))
            exclude_team_ids = [t.id for t in teams]
            if exclude_team_ids:
                stmt = stmt.where(Team.id.notin_(exclude_team_ids))
            stmt = stmt.limit(remaining)
            result = await db.execute(stmt)
            teams += result.scalars().all()

        team_map = {}
        team_ids = {p.team_id for p in players if p.team_id is not None}
        if team_ids:
            result = await db.execute(select(Team.id, Team.abbreviation).where(Team.id.in_(team_ids)))
            team_map = {row[0]: row[1] for row in result.all()}

        player_results = [
            PlayerResult(
                id=p.id,
                name=p.name,
                team_id=p.team_id,
                team_abbreviation=team_map.get(p.team_id),
            )
            for p in players
        ]
        team_results = [TeamResult(id=t.id, name=t.name, abbreviation=t.abbreviation) for t in teams]
        return SearchResults(players=player_results, teams=team_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
