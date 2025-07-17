import numpy as np
from fastapi import HTTPException
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from nba_api.stats.endpoints import leaguestandingsv3
from app.schemas.standings import StandingRecord, StandingsResponse
from app.models import StandingsSnapshot

def safe_str(value) -> str:
    """
    Safely converts a value to string. Returns an empty string if value is None.
    """
    return str(value) if value is not None else ""


async def getSeasonStandings(season: str, db: AsyncSession) -> StandingsResponse:
    """
    Retrieves and structures the NBA standings for the specified season.
    """
    try:
        stmt = (
            select(StandingsSnapshot)
            .where(StandingsSnapshot.season == season)
            .order_by(StandingsSnapshot.id.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        latest: StandingsSnapshot | None = result.scalar_one_or_none()
        if latest and (datetime.utcnow() - latest.fetched_at) < timedelta(hours=12):
            return StandingsResponse.model_validate_json(latest.data)

        df = await asyncio.to_thread(
            lambda: leaguestandingsv3.LeagueStandingsV3(
                league_id="00",
                season=season,
                season_type="Regular Season",
            ).get_data_frames()[0]
        )

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        df.replace({np.nan: None}, inplace=True)

        standings_list = []
        for team in df.to_dict(orient="records"):
            standing_record = StandingRecord(
                season_id=team["SeasonID"],
                team_id=int(team["TeamID"]),
                team_city=team["TeamCity"],
                team_name=team["TeamName"],
                conference=team["Conference"],
                division=team["Division"],
                conference_record=team["ConferenceRecord"],
                division_record=team["DivisionRecord"],
                playoff_rank=int(team["PlayoffRank"]),
                wins=int(team["WINS"]),
                losses=int(team["LOSSES"]),
                win_pct=float(team["WinPCT"]),
                home_record=team["HOME"],
                road_record=team["ROAD"],
                l10_record=team["L10"],
                current_streak=int(team["CurrentStreak"]),
                current_streak_str=team["strCurrentStreak"],
                games_back=safe_str(team.get("ConferenceGamesBack")),
                pre_as=team.get("PreAS"),
                post_as=team.get("PostAS"),
            )
            standings_list.append(standing_record)

        response = StandingsResponse(standings=standings_list)

        data_json = response.model_dump_json()
        if not latest or latest.data != data_json:
            db.add(
                StandingsSnapshot(
                    season=season,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )
            await db.commit()

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching season standings: {e}")
