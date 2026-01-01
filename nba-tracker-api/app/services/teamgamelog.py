import asyncio
import logging
import pandas as pd

from fastapi import HTTPException
from nba_api.stats.endpoints import TeamGameLog
from nba_api.stats.library.parameters import SeasonTypeAllStar

from app.schemas.teamgamelog import TeamGameLogResponse, TeamGameLogEntry
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


async def get_team_game_log(team_id: str, season: str = "2024-25") -> TeamGameLogResponse:
    """Get game log with detailed stats for a team and season."""
    try:
        api_kwargs = get_api_kwargs()
        team_id_int = int(team_id)

        await rate_limit()
        game_log_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: TeamGameLog(team_id=team_id, season=season, season_type_all_star=SeasonTypeAllStar.regular, **api_kwargs).get_dict()
            ),
            timeout=10.0
        )

        if not game_log_data.get("resultSets") or len(game_log_data["resultSets"]) == 0:
            return TeamGameLogResponse(team_id=team_id_int, season=season, games=[])

        game_log = game_log_data["resultSets"][0].get("rowSet", [])
        game_headers = game_log_data["resultSets"][0].get("headers", [])

        games = []
        header_map = {header: idx for idx, header in enumerate(game_headers)}

        for row in game_log:
            try:
                def get_value(key: str, default=None, type_func=None):
                    idx = header_map.get(key)
                    if idx is None or idx >= len(row):
                        return default
                    value = row[idx]
                    if pd.isna(value):
                        return default
                    if type_func:
                        try:
                            return type_func(value)
                        except (ValueError, TypeError):
                            return default
                    return value

                def get_int(key: str) -> int:
                    val = get_value(key, 0, float)
                    return int(val) if val is not None else 0

                def get_optional_int(key: str):
                    val = get_value(key, None, float)
                    return int(val) if val is not None else None

                def get_optional_float(key: str):
                    return get_value(key, None, float)

                game_entry = TeamGameLogEntry(
                    game_id=str(get_value("Game_ID", "")),
                    game_date=pd.to_datetime(get_value("GAME_DATE", "")).strftime("%Y-%m-%d"),
                    matchup=str(get_value("MATCHUP", "")),
                    win_loss=str(val) if (val := get_value("WL", None)) is not None else None,
                    points=get_int("PTS"),
                    rebounds=get_int("REB"),
                    assists=get_int("AST"),
                    field_goals_made=get_optional_int("FGM"),
                    field_goals_attempted=get_optional_int("FGA"),
                    field_goal_pct=get_optional_float("FG_PCT"),
                    three_pointers_made=get_optional_int("FG3M"),
                    three_pointers_attempted=get_optional_int("FG3A"),
                    three_point_pct=get_optional_float("FG3_PCT"),
                    free_throws_made=get_optional_int("FTM"),
                    free_throws_attempted=get_optional_int("FTA"),
                    free_throw_pct=get_optional_float("FT_PCT"),
                    turnovers=get_int("TOV"),
                    steals=get_int("STL"),
                    blocks=get_int("BLK"),
                )
                games.append(game_entry)
            except (IndexError, ValueError, KeyError, TypeError) as e:
                logger.warning(f"Error parsing game log row for team {team_id}: {e}")
                continue

        games.sort(key=lambda x: x.game_date, reverse=True)

        return TeamGameLogResponse(team_id=team_id_int, season=season, games=games)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching game log for team {team_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching game log: {str(e)}")

