import asyncio
from datetime import datetime, timedelta
from fastapi import HTTPException
from pydantic import ValidationError
from nba_api.stats.endpoints import leagueleaders
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.schemas.league_leaders import Leader, LeagueLeadersResponse
from app.models import LeagueLeadersCache


async def getLeagueLeaders(season: str, stat: str, db: AsyncSession) -> LeagueLeadersResponse:
    """Return top players for a given stat and season."""
    try:
        # Try cached result first
        stmt = select(LeagueLeadersCache).where(
            LeagueLeadersCache.season == season,
            LeagueLeadersCache.stat_category == stat,
        )
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()

        if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(hours=1):
            try:
                return LeagueLeadersResponse.model_validate_json(cached.data)
            except ValidationError:
                cached = None  # proceed to refetch if cache is corrupted

        # Fetch from NBA API
        df = await asyncio.to_thread(
            lambda: leagueleaders.LeagueLeaders(
                stat_category_abbreviation=stat,
                season=season,
                league_id="00",
                season_type_all_star="Regular Season",
            ).get_data_frames()[0]
        )

        if df.empty:
            raise HTTPException(status_code=404, detail="No leader data found")

        leaders = []
        for row in df.to_dict(orient="records"):
            games_played = int(row["GP"])
            stat_total = float(row[stat])
            per_game = stat_total / games_played if games_played else 0.0
            leaders.append(
                Leader(
                    player_id=int(row["PLAYER_ID"]),
                    rank=int(row["RANK"]),
                    name=row["PLAYER"],
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM"],
                    games_played=games_played,
                    stat_value=per_game,
                )
            )

        response = LeagueLeadersResponse(leaders=leaders)
        data_json = response.model_dump_json()

        # UPSERT using PostgreSQL ON CONFLICT
        insert_stmt = insert(LeagueLeadersCache).values(
            stat_category=stat,
            season=season,
            fetched_at=datetime.utcnow(),
            data=data_json,
        )
        update_stmt = insert_stmt.on_conflict_do_update(
            index_elements=["stat_category", "season"],
            set_={
                "fetched_at": datetime.utcnow(),
                "data": data_json,
            },
        )
        await db.execute(update_stmt)
        await db.commit()

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving league leaders: {e}")
