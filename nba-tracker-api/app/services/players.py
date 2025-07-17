from typing import List

import asyncio
import pandas as pd
from fastapi import HTTPException
from sqlalchemy import select
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from nba_api.stats.endpoints import PlayerGameLog, playerindex
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.player import PlayerGamePerformance, PlayerSummary
from app.models import Player, PlayerSummaryCache, Team


async def getPlayer(player_id: str, db: AsyncSession) -> PlayerSummary:
    """
    Retrieves detailed information about a specific player, including stats and recent performances.
    """
    try:
        stmt = select(PlayerSummaryCache).where(PlayerSummaryCache.player_id == int(player_id))
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()
        if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(seconds=60):
            return PlayerSummary.model_validate_json(cached.data)

        result = await db.execute(select(Player).where(Player.id == int(player_id)))
        stored = result.scalar_one_or_none()
        if stored and cached is None:
            # return minimal info if cached summary not found but player row exists
            return PlayerSummary(
                PERSON_ID=stored.id,
                PLAYER_LAST_NAME=stored.name.split(" ")[-1],
                PLAYER_FIRST_NAME=" ".join(stored.name.split(" ")[:-1]),
                TEAM_ID=stored.team_id,
                POSITION=stored.position,
                recent_games=[],
            )

        # Get player index to fetch player details
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time)
        )
        player_index_df = player_index_data.get_data_frames()[0]

        player_id_int = int(player_id)
        player_row = player_index_df[player_index_df["PERSON_ID"] == player_id_int]

        if player_row.empty:
            raise HTTPException(status_code=404, detail="Player not found in player index")

        player_data = player_row.iloc[0].to_dict()

        roster_status = player_data.get("ROSTER_STATUS")
        if isinstance(roster_status, float):
            roster_status = str(roster_status)

        # Fetch player's recent game performances
        game_log_data = await asyncio.to_thread(lambda: PlayerGameLog(player_id=player_id).get_dict())
        game_log = game_log_data["resultSets"][0]["rowSet"]
        game_headers = game_log_data["resultSets"][0]["headers"]

        recent_games = [
            PlayerGamePerformance(
                game_id=row[game_headers.index("Game_ID")],  # Link game ID
                date=pd.to_datetime(row[game_headers.index("GAME_DATE")]).strftime("%Y-%m-%d"),
                opponent_team_abbreviation=row[game_headers.index("MATCHUP")][-3:],  # Extract opponent team
                points=row[game_headers.index("PTS")],
                rebounds=row[game_headers.index("REB")],
                assists=row[game_headers.index("AST")],
                steals=row[game_headers.index("STL")],
                blocks=row[game_headers.index("BLK")],
            )
            for row in game_log[:5]  # Limit to last 5 games
        ]

        player_summary = PlayerSummary(
            PERSON_ID=player_data["PERSON_ID"],
            PLAYER_LAST_NAME=player_data["PLAYER_LAST_NAME"],
            PLAYER_FIRST_NAME=player_data["PLAYER_FIRST_NAME"],
            PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
            TEAM_ID=player_data.get("TEAM_ID"),
            TEAM_SLUG=player_data.get("TEAM_SLUG"),
            IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
            TEAM_CITY=player_data.get("TEAM_CITY"),
            TEAM_NAME=player_data.get("TEAM_NAME"),
            TEAM_ABBREVIATION=player_data.get("TEAM_ABBREVIATION"),
            JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
            POSITION=player_data.get("POSITION"),
            HEIGHT=player_data.get("HEIGHT"),
            WEIGHT=player_data.get("WEIGHT"),
            COLLEGE=player_data.get("COLLEGE"),
            COUNTRY=player_data.get("COUNTRY"),
            ROSTER_STATUS=roster_status,
            PTS=player_data.get("PTS"),
            REB=player_data.get("REB"),
            AST=player_data.get("AST"),
            STATS_TIMEFRAME=player_data.get("STATS_TIMEFRAME"),
            FROM_YEAR=player_data.get("FROM_YEAR"),
            TO_YEAR=player_data.get("TO_YEAR"),
            recent_games=recent_games,
        )

        if player_summary.TEAM_ID is not None:
            result = await db.execute(select(Team).where(Team.id == player_summary.TEAM_ID))
            team = result.scalar_one_or_none()
            if team is None:
                db.add(
                    Team(
                        id=player_summary.TEAM_ID,
                        name=player_summary.TEAM_NAME or "",
                        abbreviation=player_summary.TEAM_ABBREVIATION or "",
                    )
                )

        stmt = select(Player).where(Player.id == player_summary.PERSON_ID)
        result = await db.execute(stmt)
        player = result.scalar_one_or_none()

        if player is None:
            db.add(
                Player(
                    id=player_summary.PERSON_ID,
                    name=f"{player_summary.PLAYER_FIRST_NAME} {player_summary.PLAYER_LAST_NAME}",
                    team_id=player_summary.TEAM_ID,
                    position=player_summary.POSITION,
                )
            )
        else:
            if player.team_id != player_summary.TEAM_ID:
                player.team_id = player_summary.TEAM_ID
            if player.position != player_summary.POSITION:
                player.position = player_summary.POSITION

        data_json = player_summary.model_dump_json()
        if cached:
            cached.data = data_json
            cached.fetched_at = datetime.utcnow()
        else:
            db.add(
                PlayerSummaryCache(
                    player_id=player_summary.PERSON_ID,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )

        await db.commit()

        return player_summary

    except HTTPException as http_exception:
        raise http_exception
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def search_players(search_term: str, db: AsyncSession) -> List[PlayerSummary]:
    """Search players by name using only records stored in the database."""

    try:
        stmt = select(Player).where(Player.name.ilike(f"%{search_term}%"))
        result = await db.execute(stmt)
        players = result.scalars().all()

        if not players:
            raise HTTPException(status_code=404, detail="No players found matching the search term")

        player_summaries: List[PlayerSummary] = []
        for p in players:
            parts = p.name.split(" ")
            first_name = " ".join(parts[:-1]) if len(parts) > 1 else parts[0]
            last_name = parts[-1] if len(parts) > 1 else ""

            player_summaries.append(
                PlayerSummary(
                    PERSON_ID=p.id,
                    PLAYER_LAST_NAME=last_name,
                    PLAYER_FIRST_NAME=first_name,
                    TEAM_ID=p.team_id,
                    POSITION=p.position,
                    recent_games=[],
                )
            )

        return player_summaries

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")