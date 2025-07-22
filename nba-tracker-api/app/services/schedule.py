from fastapi import HTTPException
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.static import teams
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary, TopScorer
from app.models import ScheduleCache, ScoreboardGame
from app.config import RUNNING_ON_RENDER

# Map team IDs to abbreviations for quick lookup
NBA_TEAMS = {team["id"]: team["abbreviation"] for team in teams.get_teams()}


async def getGamesForDate(date: str, db: AsyncSession) -> GamesResponse:
    """Retrieve NBA games for a given date."""
    try:
        stmt = select(ScheduleCache).where(ScheduleCache.game_date == date)
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()

        if RUNNING_ON_RENDER:
            if cached:
                return GamesResponse.model_validate_json(cached.data)

            stmt_games = select(ScoreboardGame).where(ScoreboardGame.gameDate == date)
            result_games = await db.execute(stmt_games)
            rows = result_games.scalars().all()

            if rows:
                games = []
                for row in rows:
                    home_team = TeamSummary(
                        team_id=row.homeTeam_teamId,
                        team_abbreviation=row.homeTeam_teamTricode,
                        points=row.homeTeam_score,
                    )
                    away_team = TeamSummary(
                        team_id=row.awayTeam_teamId,
                        team_abbreviation=row.awayTeam_teamTricode,
                        points=row.awayTeam_score,
                    )

                    top_scorer = None
                    if (row.homeLeader_points or 0) >= (row.awayLeader_points or 0):
                        if row.homeLeader_personId:
                            top_scorer = TopScorer(
                                player_id=row.homeLeader_personId,
                                player_name=row.homeLeader_name or "",
                                team_id=row.homeTeam_teamId,
                                player_id=row.awayLeader_personId,
                                player_name=row.awayLeader_name or "",
                                team_id=row.awayTeam_teamId,
                                points=row.awayLeader_points or 0,
                                rebounds=row.awayLeader_rebounds or 0,
                                assists=row.awayLeader_assists or 0,
                            )

                    games.append(
                        GameSummary(
                            game_id=row.gameId,
                            game_date=row.gameDate,
                            matchup=f"{row.homeTeam_teamTricode} vs {row.awayTeam_teamTricode}",
                            game_status=row.gameStatusText,
                            arena=None,
                            home_team=home_team,
                            away_team=away_team,
                            top_scorer=top_scorer,
                        )
                    )

                return GamesResponse(games=games)

            raise HTTPException(status_code=404, detail="Schedule data not available")

        games_df = await asyncio.to_thread(
            lambda: leaguegamefinder.LeagueGameFinder(
                date_from_nullable=date,
                date_to_nullable=date,
                player_or_team_abbreviation="T",
            ).get_data_frames()[0]
        )

        if games_df.empty:
            raise HTTPException(status_code=404, detail=f"No game data found for {date}")

        games_map: dict[str, dict[str, TeamSummary | str | None]] = {}
        for _, row in games_df.iterrows():
            game_id = row["GAME_ID"]
            info = games_map.setdefault(
                game_id,
                {"game_date": row["GAME_DATE"], "home": None, "away": None},
            )

            team_summary = TeamSummary(
                team_id=int(row["TEAM_ID"]),
                team_abbreviation=row["TEAM_ABBREVIATION"],
                points=int(row.get("PTS", 0)),
            )

            matchup = row["MATCHUP"]
            if "vs" in matchup:
                info["home"] = team_summary
            elif "@" in matchup:
                info["away"] = team_summary

        games: list[GameSummary] = []
        for gid, info in games_map.items():
            home_team: TeamSummary | None = info.get("home")  # type: ignore[assignment]
            away_team: TeamSummary | None = info.get("away")  # type: ignore[assignment]

            if not home_team or not away_team:
                continue

            games.append(
                GameSummary(
                    game_id=gid,
                    game_date=info["game_date"],
                    matchup=f"{home_team.team_abbreviation} vs {away_team.team_abbreviation}",
                    game_status="Final",
                    arena=None,
                    home_team=home_team,
                    away_team=away_team,
                    top_scorer=None,
                )
            )

        response = GamesResponse(games=games)

        data_json = response.model_dump_json()
        if cached:
            cached.data = data_json
            cached.fetched_at = datetime.utcnow()
        else:
            db.add(
                ScheduleCache(
                    game_date=date,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )
        await db.commit()

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving games: {str(e)}")