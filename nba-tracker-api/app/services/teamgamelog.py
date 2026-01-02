import asyncio
import logging
import pandas as pd

from fastapi import HTTPException
from nba_api.stats.endpoints import TeamGameLog, LeagueGameFinder
from nba_api.stats.library.parameters import SeasonTypeAllStar

from app.schemas.teamgamelog import TeamGameLogResponse, TeamGameLogEntry
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


async def get_team_game_log(team_id: str, season: str = "2024-25") -> TeamGameLogResponse:
    """
    Get game log with detailed stats for a team and season.
    Uses LeagueGameFinder to get all games (including upcoming) for the team.
    """
    try:
        api_kwargs = get_api_kwargs()
        team_id_int = int(team_id)

        await rate_limit()
        # Try LeagueGameFinder first to get all games (including upcoming)
        try:
            game_finder_data = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: LeagueGameFinder(
                        team_id_nullable=team_id_int,
                        season_nullable=season,
                        season_type_nullable=SeasonTypeAllStar.regular,
                        **api_kwargs
                    ).get_data_frames()[0]
                ),
                timeout=30.0
            )
            
            if not game_finder_data.empty:
                # Convert LeagueGameFinder DataFrame to game log format
                logger.info(f"Found {len(game_finder_data)} games via LeagueGameFinder for team {team_id}, season {season}")
                games = []
                for _, row in game_finder_data.iterrows():
                    try:
                        game_entry = TeamGameLogEntry(
                            game_id=str(row.get("GAME_ID", "")),
                            game_date=pd.to_datetime(row.get("GAME_DATE", "")).strftime("%Y-%m-%d") if pd.notna(row.get("GAME_DATE")) else "",
                            matchup=row.get("MATCHUP", ""),
                            win_loss=str(row.get("WL", "")) if pd.notna(row.get("WL")) and str(row.get("WL", "")).strip() else None,
                            points=int(row.get("PTS", 0)) if pd.notna(row.get("PTS")) else 0,
                            rebounds=int(row.get("REB", 0)) if pd.notna(row.get("REB")) else 0,
                            assists=int(row.get("AST", 0)) if pd.notna(row.get("AST")) else 0,
                            field_goals_made=int(row.get("FGM", 0)) if pd.notna(row.get("FGM")) else None,
                            field_goals_attempted=int(row.get("FGA", 0)) if pd.notna(row.get("FGA")) else None,
                            field_goal_pct=float(row.get("FG_PCT", 0)) if pd.notna(row.get("FG_PCT")) else None,
                            three_pointers_made=int(row.get("FG3M", 0)) if pd.notna(row.get("FG3M")) else None,
                            three_pointers_attempted=int(row.get("FG3A", 0)) if pd.notna(row.get("FG3A")) else None,
                            three_point_pct=float(row.get("FG3_PCT", 0)) if pd.notna(row.get("FG3_PCT")) else None,
                            free_throws_made=int(row.get("FTM", 0)) if pd.notna(row.get("FTM")) else None,
                            free_throws_attempted=int(row.get("FTA", 0)) if pd.notna(row.get("FTA")) else None,
                            free_throw_pct=float(row.get("FT_PCT", 0)) if pd.notna(row.get("FT_PCT")) else None,
                            turnovers=int(row.get("TOV", 0)) if pd.notna(row.get("TOV")) else 0,
                            steals=int(row.get("STL", 0)) if pd.notna(row.get("STL")) else 0,
                            blocks=int(row.get("BLK", 0)) if pd.notna(row.get("BLK")) else 0,
                        )
                        games.append(game_entry)
                    except Exception as e:
                        logger.warning(f"Error parsing LeagueGameFinder row: {e}")
                        continue
                
                games.sort(key=lambda x: x.game_date, reverse=True)
                logger.info(f"Successfully parsed {len(games)} games from LeagueGameFinder for team {team_id}, season {season}")
                return TeamGameLogResponse(team_id=team_id_int, season=season, games=games)
        except Exception as e:
            logger.warning(f"LeagueGameFinder failed for team {team_id}, season {season}: {e}. Falling back to TeamGameLog.")
        
        # Fallback: Use TeamGameLog (only completed games)
        await rate_limit()
        game_log_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: TeamGameLog(team_id=team_id, season=season, season_type_all_star=SeasonTypeAllStar.regular, **api_kwargs).get_dict()
            ),
            timeout=30.0
        )

        if not game_log_data.get("resultSets") or len(game_log_data["resultSets"]) == 0:
            logger.warning(f"No resultSets in game log data for team {team_id}, season {season}")
            return TeamGameLogResponse(team_id=team_id_int, season=season, games=[])

        game_log = game_log_data["resultSets"][0].get("rowSet", [])
        game_headers = game_log_data["resultSets"][0].get("headers", [])
        
        if not game_log:
            logger.warning(f"Empty game log rowSet for team {team_id}, season {season}")
            return TeamGameLogResponse(team_id=team_id_int, season=season, games=[])
        
        logger.info(f"Found {len(game_log)} games in game log for team {team_id}, season {season}")

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
        
        logger.info(f"Successfully parsed {len(games)} games for team {team_id}, season {season}")

        return TeamGameLogResponse(team_id=team_id_int, season=season, games=games)

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        logger.error(f"Timeout fetching game log for team {team_id}, season {season}")
        raise HTTPException(
            status_code=503,
            detail=f"Timeout fetching game log. The NBA API may be slow or unavailable. Please try again later."
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error fetching game log for team {team_id}, season {season}: {e}", exc_info=True)
        
        # Check if this might be a future season that doesn't exist yet
        from datetime import datetime
        try:
            current_year = datetime.now().year
            season_start_year = int(season.split('-')[0])
            if season_start_year > current_year or (season_start_year == current_year and datetime.now().month < 10):
                logger.info(f"Season {season} may not exist yet in NBA API")
                return TeamGameLogResponse(team_id=int(team_id), season=season, games=[])
        except (ValueError, AttributeError):
            pass
        
        # Check for connection errors
        if "Connection" in error_msg or "timeout" in error_msg.lower() or "resolve" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to NBA API. Please try again later."
            )
        
        raise HTTPException(status_code=500, detail=f"Error fetching game log: {error_msg}")

