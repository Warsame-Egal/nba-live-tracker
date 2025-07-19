import asyncio
from datetime import datetime, timedelta
from fastapi import HTTPException
from nba_api.stats.endpoints import leagueleaders
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.league_leaders import Leader, LeagueLeadersResponse
from app.models import LeagueLeadersCache


async def getLeagueLeaders(season: str, stat: str, db: AsyncSession) -> LeagueLeadersResponse:
    """Return top players for a given stat and season."""
    try:
        stmt = select(LeagueLeadersCache).where(
            LeagueLeadersCache.season == season,
            LeagueLeadersCache.stat_category == stat,
        )
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()
        if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(hours=1):
            return LeagueLeadersResponse.model_validate_json(cached.data)

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

        leaders = [
            Leader(
                player_id=int(row["PLAYER_ID"]),
                rank=int(row["RANK"]),
                name=row["PLAYER"],
                team_id=int(row["TEAM_ID"]),
                team_abbreviation=row["TEAM"],
                stat_value=float(row[stat]),
            )
            for row in df.to_dict(orient="records")
        ]

        response = LeagueLeadersResponse(leaders=leaders)
        data_json = response.model_dump_json()
        if cached:
            cached.data = data_json
            cached.fetched_at = datetime.utcnow()
        else:
            db.add(
                LeagueLeadersCache(
                    stat_category=stat,
                    season=season,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )
        await db.commit()
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving league leaders: {e}")