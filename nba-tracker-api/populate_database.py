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
from app import models as m

from app.services.scoreboard import getScoreboard, getBoxScore
from app.services.standings import getSeasonStandings
from app.services.teams import get_team
from app.services.players import getPlayer
from app.services.search import search_entities
from app.services.schedule import getGamesForDate

async def clear_database(session):
    """Remove all existing rows from every table."""
    model_names = [
        "ScoreboardGame",
        "ScoreboardSnapshot",
        "StandingsSnapshot",
        "TeamDetailsCache",
        "PlayerSummaryCache",
        "PlayerSearchCache",
        "ScheduleCache",
        "BoxScoreCache",
        "Player",
        "Team",
    ]

    models_to_clear = [getattr(m, name) for name in model_names if hasattr(m, name)]

    for model in models_to_clear:
        await session.execute(delete(model))
    await session.commit()


async def populate_teams(session):
    """Insert all NBA teams."""
    for team in static_teams.get_teams():
        session.add(
            m.Team(
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

    result = await session.execute(select(m.Team.id))
    existing_team_ids = {row[0] for row in result}

    for _, row in df.iterrows():
        team_id = int(row["TEAM_ID"]) if not pd.isna(row.get("TEAM_ID")) else None
        if team_id not in existing_team_ids:
            team_id = None

        session.add(
            m.Player(
                id=int(row["PERSON_ID"]),
                name=f"{row['PLAYER_FIRST_NAME']} {row['PLAYER_LAST_NAME']}",
                team_id=team_id,
                position=row.get("POSITION"),
            )
        )
    await session.commit()

# Leaving the function definition in case you want to reuse it later
async def populate_team_details(session):
    """Cache details for all teams."""
    result = await session.execute(select(m.Team.id))
    team_ids = [row[0] for row in result]
    for team_id in team_ids:
        await get_team(int(team_id), session)


async def populate_player_summaries(session):
    """Cache summaries for all players."""
    result = await session.execute(select(m.Player.id))
    player_ids = [row[0] for row in result]
    for player_id in player_ids:
        await getPlayer(str(player_id), session)


async def populate_player_search(session):
    """Precompute basic player search results."""
    for letter in "abcdefghijklmnopqrstuvwxyz":
        results = await search_entities(letter, session)
        session.add(
            m.PlayerSearchCache(
                search_term=letter,
                fetched_at=datetime.utcnow(),
                data=results.model_dump_json(),
            )
        )
    await session.commit()


async def populate_schedule(session):
    """Cache today's schedule."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    await getGamesForDate(today, session)


async def populate_box_scores(session):
    """Cache box scores for today's games."""
    scoreboard = await getScoreboard(session)
    for game in scoreboard.scoreboard.games:
        await getBoxScore(game.gameId, session)


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
        # await populate_team_details(session)  # Removed due to timeouts
        await populate_player_summaries(session)
        await populate_player_search(session)
        await populate_scoreboard(session)
        await populate_schedule(session)
        await populate_box_scores(session)
        await populate_standings(session)


if __name__ == "__main__":
    asyncio.run(main())
