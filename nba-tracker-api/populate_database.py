"""Populate PostgreSQL database with fresh NBA data.

This script clears existing data to avoid duplicates and inserts
fresh records for all tables using the nba_api package. It can be
executed at any time to safely refresh the database.
"""

import asyncio
from datetime import datetime

import pandas as pd
from nba_api.stats.endpoints import playerindex
from nba_api.stats.library.parameters import HistoricalNullable
from nba_api.stats.static import teams as static_teams

from sqlalchemy import delete, select

from app.database import async_session_factory
from app.models import (
    Player,
    Team,
    ScoreboardSnapshot,
    StandingsSnapshot,
    ScoreboardGame,
    TeamDetailsCache,
    PlayerSummaryCache,
    PlayerSearchCache,
    ScheduleCache,
    BoxScoreCache,
)
from app.services.scoreboard import getScoreboard
from app.services.standings import getSeasonStandings


async def clear_database(session):
    """Remove all existing rows from every table."""
    models = [
        ScoreboardGame,
        ScoreboardSnapshot,
        StandingsSnapshot,
        TeamDetailsCache,
        PlayerSummaryCache,
        PlayerSearchCache,
        ScheduleCache,
        BoxScoreCache,
        Player,
        Team,
    ]
    for model in models:
        await session.execute(delete(model))
    await session.commit()


async def populate_teams(session):
    """Insert all NBA teams."""
    for team in static_teams.get_teams():
        session.add(
            Team(
                id=team["id"],
                name=team["full_name"],
                abbreviation=team["abbreviation"],
            )
        )
    await session.commit()


async def populate_players(session):
    """Insert all players from the NBA player index."""
    player_index = await asyncio.to_thread(
        lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
    )
    df = player_index.get_data_frames()[0]

    result = await session.execute(select(Team.id))
    existing_team_ids = {row[0] for row in result}

    for _, row in df.iterrows():
        team_id = int(row["TEAM_ID"]) if not pd.isna(row.get("TEAM_ID")) else None
        if team_id not in existing_team_ids:
            team_id = None

        session.add(
            Player(
                id=int(row["PERSON_ID"]),
                name=f"{row['PLAYER_FIRST_NAME']} {row['PLAYER_LAST_NAME']}",
                team_id=team_id,
                position=row.get("POSITION"),
            )
        )
    await session.commit()


async def populate_scoreboard(session):
    """Fetch the latest scoreboard to populate scoreboard tables."""
    await getScoreboard(session)


async def populate_standings(session):
    """Fetch current season standings."""
    current_year = datetime.utcnow().year
    season = f"{current_year-1}-{str(current_year)[-2:]}"
    await getSeasonStandings(season, session)


async def main() -> None:
    async with async_session_factory() as session:
        await clear_database(session)
        await populate_teams(session)
        await populate_players(session)
        await populate_scoreboard(session)
        await populate_standings(session)


if __name__ == "__main__":
    asyncio.run(main())
