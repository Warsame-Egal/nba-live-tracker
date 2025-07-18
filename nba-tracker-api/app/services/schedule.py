from fastapi import HTTPException
from nba_api.stats.endpoints import scoreboardv2
from nba_api.stats.static import teams
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary, TopScorer
from app.models import ScheduleCache

# Map team IDs to abbreviations for quick lookup
NBA_TEAMS = {team["id"]: team["abbreviation"] for team in teams.get_teams()}


async def getGamesForDate(date: str, db: AsyncSession) -> GamesResponse:
    """Retrieve NBA games for a given date."""
    try:
        stmt = select(ScheduleCache).where(ScheduleCache.game_date == date)
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()
        if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(seconds=60):
            return GamesResponse.model_validate_json(cached.data)

        games_data = await asyncio.to_thread(lambda: scoreboardv2.ScoreboardV2(game_date=date).get_dict())

        if "resultSets" not in games_data or not games_data["resultSets"]:
            raise HTTPException(status_code=404, detail=f"No game data found for {date}")

        game_header_data = next((r for r in games_data["resultSets"] if r["name"] == "GameHeader"), None)
        team_leaders_data = next((r for r in games_data["resultSets"] if r["name"] == "TeamLeaders"), None)
        line_score_data = next((r for r in games_data["resultSets"] if r["name"] == "LineScore"), None)

        if not game_header_data or "rowSet" not in game_header_data:
            raise HTTPException(status_code=404, detail=f"No game header data found for {date}")

        game_headers = game_header_data["headers"]
        games_list = game_header_data["rowSet"]

        team_leaders_headers = team_leaders_data["headers"] if team_leaders_data else []
        team_leaders_list = team_leaders_data["rowSet"] if team_leaders_data else []

        line_score_headers = line_score_data["headers"] if line_score_data else []
        line_score_list = line_score_data["rowSet"] if line_score_data else []

        games = []

        for game in games_list:
            game_dict = dict(zip(game_headers, game))

            if "GAME_ID" not in game_dict:
                continue

            game_id = game_dict["GAME_ID"]
            home_team_id = game_dict.get("HOME_TEAM_ID")
            away_team_id = game_dict.get("VISITOR_TEAM_ID")

            # Skip if either team ID is missing
            if home_team_id is None or away_team_id is None:
                continue

            # Ensure both IDs are integers (not None or string)
            try:
                home_team_id = int(home_team_id)
                away_team_id = int(away_team_id)
            except (TypeError, ValueError):
                continue

            home_score = next(
                (
                    dict(zip(line_score_headers, s)).get("PTS", 0)
                    for s in line_score_list
                    if dict(zip(line_score_headers, s)).get("GAME_ID") == game_id
                    and dict(zip(line_score_headers, s)).get("TEAM_ID") == home_team_id
                ),
                0,
            )
            away_score = next(
                (
                    dict(zip(line_score_headers, s)).get("PTS", 0)
                    for s in line_score_list
                    if dict(zip(line_score_headers, s)).get("GAME_ID") == game_id
                    and dict(zip(line_score_headers, s)).get("TEAM_ID") == away_team_id
                ),
                0,
            )

            home_team = TeamSummary(
                team_id=home_team_id,
                team_abbreviation=NBA_TEAMS.get(home_team_id, "N/A"),
                points=home_score,
            )
            away_team = TeamSummary(
                team_id=away_team_id,
                team_abbreviation=NBA_TEAMS.get(away_team_id, "N/A"),
                points=away_score,
            )

            top_scorer = next(
                (
                    TopScorer(
                        player_id=d.get("PTS_PLAYER_ID", 0),
                        player_name=d.get("PTS_PLAYER_NAME", "Unknown"),
                        team_id=d.get("TEAM_ID", 0),
                        points=d.get("PTS", 0),
                        rebounds=d.get("REB", 0),
                        assists=d.get("AST", 0),
                    )
                    for d in (dict(zip(team_leaders_headers, leader_row)) for leader_row in team_leaders_list)
                    if d.get("GAME_ID") == game_id
                ),
                None,
            )

            games.append(
                GameSummary(
                    game_id=game_id,
                    game_date=date,
                    matchup=f"{home_team.team_abbreviation} vs {away_team.team_abbreviation}",
                    game_status=game_dict.get("GAME_STATUS_TEXT", "Unknown"),
                    arena=game_dict.get("ARENA_NAME"),
                    home_team=home_team,
                    away_team=away_team,
                    top_scorer=top_scorer,
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
