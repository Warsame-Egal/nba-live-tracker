from fastapi import HTTPException
from nba_api.stats.endpoints import scoreboardv2, leaguegamefinder
from nba_api.stats.static import teams
import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary, TopScorer
from app.models import ScheduleCache, ScoreboardGame
from app.config import RUNNING_ON_RENDER

# Map team IDs to abbreviations for quick lookup
NBA_TEAMS = {team["id"]: team["abbreviation"] for team in teams.get_teams()}


def _rows_to_games(rows: list[ScoreboardGame]) -> list[GameSummary]:
    """Convert ScoreboardGame ORM rows to response models."""
    games: list[GameSummary] = []

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
                    points=row.homeLeader_points or 0,
                    rebounds=row.homeLeader_rebounds or 0,
                top_scorer = TopScorer(
                    player_id=row.awayLeader_personId,
                    player_name=row.awayLeader_name or "",
                    team_id=row.awayTeam_teamId,
                    points=row.awayLeader_points or 0,
                    rebounds=row.awayLeader_rebounds or 0,
                    assists=row.awayLeader_assists or 0,
                )
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

    return games


async def _fetch_games_from_db(date: str, db: AsyncSession) -> list[GameSummary] | None:
    """Retrieve games from the ScoreboardGame table."""
    stmt_games = select(ScoreboardGame).where(ScoreboardGame.gameDate == date)
    result_games = await db.execute(stmt_games)
    rows = result_games.scalars().all()
    if rows:
        return _rows_to_games(rows)
    return None


async def _get_games_from_scoreboardv2(date: str) -> list[GameSummary]:
    """Fetch games for a date using the ScoreboardV2 endpoint."""
    try:
        games_data = await asyncio.to_thread(
            lambda: scoreboardv2.ScoreboardV2(game_date=date).get_dict()
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"NBA stats API error: {e}") from e

    if "resultSets" not in games_data or not games_data["resultSets"]:
        raise HTTPException(status_code=404, detail=f"No game data found for {date}")

    game_header_data = next(
        (r for r in games_data["resultSets"] if r["name"] == "GameHeader"), None
    )
    team_leaders_data = next(
        (r for r in games_data["resultSets"] if r["name"] == "TeamLeaders"), None
    )
    line_score_data = next(
        (r for r in games_data["resultSets"] if r["name"] == "LineScore"), None
    )

    if not game_header_data or "rowSet" not in game_header_data:
        raise HTTPException(
            status_code=404, detail=f"No game header data found for {date}"
        )

    game_headers = game_header_data["headers"]
    games_list = game_header_data["rowSet"]

    team_leaders_headers = team_leaders_data["headers"] if team_leaders_data else []
    team_leaders_list = team_leaders_data["rowSet"] if team_leaders_data else []

    line_score_headers = line_score_data["headers"] if line_score_data else []
    line_score_list = line_score_data["rowSet"] if line_score_data else []

    games: list[GameSummary] = []

    for game in games_list:
        game_dict = dict(zip(game_headers, game))

        if "GAME_ID" not in game_dict:
            continue

        game_id = game_dict["GAME_ID"]
        home_team_id = game_dict.get("HOME_TEAM_ID")
        away_team_id = game_dict.get("VISITOR_TEAM_ID")

        if home_team_id is None or away_team_id is None:
            continue

        try:
            home_team_id = int(home_team_id)
            away_team_id = int(away_team_id)
        except (TypeError, ValueError):
            continue

        # Skip games that are not between NBA teams (e.g., G League)
        if home_team_id not in NBA_TEAMS or away_team_id not in NBA_TEAMS:
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
                for d in (
                    dict(zip(team_leaders_headers, leader_row))
                    for leader_row in team_leaders_list
                )
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

    return games


async def _get_games_from_leaguegamefinder(date: str) -> list[GameSummary]:
    """Fetch games for a past date using the LeagueGameFinder endpoint."""
    try:
        data = await asyncio.to_thread(
            lambda: leaguegamefinder.LeagueGameFinder(
                date_from_nullable=date, date_to_nullable=date
            ).get_normalized_dict()
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"NBA stats API error: {e}") from e

    results = data.get("LeagueGameFinderResults", [])
    if not results:
        raise HTTPException(status_code=404, detail=f"No game data found for {date}")

    games_map: dict[str, dict] = {}
    for row in results:
        game_id = row.get("GAME_ID")
        if not game_id:
            continue

        team_id = int(row.get("TEAM_ID"))
        if team_id not in NBA_TEAMS:
            continue

        team = TeamSummary(
            team_id=team_id,
            team_abbreviation=row.get("TEAM_ABBREVIATION"),
            points=int(row.get("PTS", 0)),
        )

        matchup = row.get("MATCHUP", "").lower()
        is_home = "vs" in matchup

        game = games_map.setdefault(
            game_id,
            {"game_date": row.get("GAME_DATE"), "home_team": None, "away_team": None},
        )

        if is_home:
            game["home_team"] = team
        else:
            game["away_team"] = team

    games: list[GameSummary] = []
    for game_id, g in games_map.items():
        home_team = g["home_team"]
        away_team = g["away_team"]
        if not home_team or not away_team:
            continue
        games.append(
            GameSummary(
                game_id=game_id,
                game_date=date,
                matchup=f"{home_team.team_abbreviation} vs {away_team.team_abbreviation}",
                game_status="Final",
                arena=None,
                home_team=home_team,
                away_team=away_team,
                top_scorer=None,
            )
        )

    return games


async def getGamesForDate(date: str, db: AsyncSession) -> GamesResponse:
    """Retrieve NBA games for a given date."""
    try:
        stmt = select(ScheduleCache).where(ScheduleCache.game_date == date)
        result = await db.execute(stmt)
        cached = result.scalar_one_or_none()

        if cached:
            return GamesResponse.model_validate_json(cached.data)

        games_from_db = await _fetch_games_from_db(date, db)
        if games_from_db:
            response = GamesResponse(games=games_from_db)
            if not RUNNING_ON_RENDER:
                db.add(
                    ScheduleCache(
                        game_date=date,
                        fetched_at=datetime.utcnow(),
                        data=response.model_dump_json(),
                    )
                )
                await db.commit()
            return response

        if RUNNING_ON_RENDER:
            raise HTTPException(status_code=404, detail="Schedule data not available")

        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.utcnow().date()

        if target_date < today:
            games = await _get_games_from_leaguegamefinder(date)
        else:
            games = await _get_games_from_scoreboardv2(date)

        response = GamesResponse(games=games)
        db.add(
            ScheduleCache(
                game_date=date,
                fetched_at=datetime.utcnow(),
                data=response.model_dump_json(),
            )
        )
        await db.commit()

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving games: {str(e)}")
