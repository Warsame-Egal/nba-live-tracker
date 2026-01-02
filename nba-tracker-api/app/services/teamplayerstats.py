import asyncio
import logging
import pandas as pd

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar

from app.schemas.teamplayerstats import TeamPlayerStatsResponse, TeamPlayerStat
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


async def get_team_player_stats(team_id: int, season: str = "2024-25") -> TeamPlayerStatsResponse:
    """
    Get player statistics for a specific team and season.
    
    Args:
        team_id: NBA team ID
        season: Season in format "YYYY-YY"
        
    Returns:
        TeamPlayerStatsResponse: Player statistics for the team
    """
    try:
        api_kwargs = get_api_kwargs()
        await rate_limit()
        
        # Get player stats for the season
        try:
            stats_data = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: leaguedashplayerstats.LeagueDashPlayerStats(
                        season=season,
                        per_mode_detailed=PerModeDetailed.per_game,
                        season_type_all_star=SeasonTypeAllStar.regular,
                        **api_kwargs
                    ).get_data_frames()[0]
                ),
                timeout=30.0
            )
        except Exception as api_error:
            # Check if this is a season that doesn't exist yet
            from datetime import datetime
            try:
                current_year = datetime.now().year
                season_start_year = int(season.split('-')[0])
                if season_start_year > current_year or (season_start_year == current_year and datetime.now().month < 10):
                    logger.info(f"Season {season} may not exist yet in NBA API")
                    return TeamPlayerStatsResponse(team_id=team_id, season=season, players=[])
            except (ValueError, AttributeError):
                pass
            
            # If it's a connection/API error, return empty rather than failing
            error_msg = str(api_error).lower()
            if "connection" in error_msg or "timeout" in error_msg or "resolve" in error_msg or "empty" in error_msg:
                logger.warning(f"NBA API error for season {season}: {api_error}")
                return TeamPlayerStatsResponse(team_id=team_id, season=season, players=[])
            
            # Re-raise if it's something else
            raise
        
        # Check if data is empty (season might not exist)
        if stats_data.empty:
            logger.warning(f"No player stats data returned from NBA API for season {season}")
            return TeamPlayerStatsResponse(team_id=team_id, season=season, players=[])
        
        # Filter by team_id
        if "TEAM_ID" not in stats_data.columns:
            logger.error(f"TEAM_ID column not found in player stats data for season {season}")
            return TeamPlayerStatsResponse(team_id=team_id, season=season, players=[])
        
        team_stats = stats_data[stats_data["TEAM_ID"] == team_id].copy()
        
        if team_stats.empty:
            logger.info(f"No players found for team {team_id} in season {season}")
            return TeamPlayerStatsResponse(team_id=team_id, season=season, players=[])
        
        # Replace NaN values
        team_stats = team_stats.fillna(0)
        
        players = []
        for _, row in team_stats.iterrows():
            try:
                # Calculate assist to turnover ratio
                ast_to = None
                if row.get("TOV", 0) > 0:
                    ast_to = row.get("AST", 0) / row.get("TOV", 0)
                
                player = TeamPlayerStat(
                    player_id=int(row.get("PLAYER_ID", 0)),
                    player_name=f"{row.get('PLAYER_NAME', 'Unknown')}",
                    position=row.get("POSITION") if pd.notna(row.get("POSITION")) else None,
                    jersey_number=str(int(row.get("JERSEY_NUMBER", 0))) if pd.notna(row.get("JERSEY_NUMBER")) else None,
                    games_played=int(row.get("GP", 0)),
                    games_started=int(row.get("GS", 0)),
                    minutes=float(row.get("MIN", 0.0)),
                    points=float(row.get("PTS", 0.0)),
                    offensive_rebounds=float(row.get("OREB", 0.0)),
                    defensive_rebounds=float(row.get("DREB", 0.0)),
                    rebounds=float(row.get("REB", 0.0)),
                    assists=float(row.get("AST", 0.0)),
                    steals=float(row.get("STL", 0.0)),
                    blocks=float(row.get("BLK", 0.0)),
                    turnovers=float(row.get("TOV", 0.0)),
                    personal_fouls=float(row.get("PF", 0.0)),
                    assist_to_turnover=round(ast_to, 1) if ast_to is not None else None,
                )
                players.append(player)
            except Exception as e:
                logger.warning(f"Error parsing player stat row: {e}")
                continue
        
        # Sort by points descending
        players.sort(key=lambda x: x.points, reverse=True)
        
        return TeamPlayerStatsResponse(team_id=team_id, season=season, players=players)
        
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        logger.error(f"Timeout fetching team player stats for team {team_id}, season {season}")
        raise HTTPException(
            status_code=503,
            detail=f"Timeout fetching player stats. The NBA API may be slow or unavailable. Please try again later."
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error fetching team player stats for team {team_id}, season {season}: {e}", exc_info=True)
        
        # Check if this might be a future season that doesn't exist yet
        from datetime import datetime
        try:
            current_year = datetime.now().year
            season_start_year = int(season.split('-')[0])
            if season_start_year > current_year or (season_start_year == current_year and datetime.now().month < 10):
                raise HTTPException(
                    status_code=404,
                    detail=f"Player stats not available for season {season}. The season may not have started yet or data is not available."
                )
        except (ValueError, AttributeError):
            pass
        
        # Check for connection errors
        if "Connection" in error_msg or "timeout" in error_msg.lower() or "resolve" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to NBA API. Please try again later."
            )
        
        raise HTTPException(status_code=500, detail=f"Error fetching team player stats: {error_msg}")

