import asyncio
import logging
import re
from typing import Optional

from fastapi import HTTPException
from nba_api.stats.endpoints import shotchartdetail
from nba_api.stats.library.parameters import SeasonTypeAllStar, ContextMeasureSimple

from app.schemas.shotchart import ShotChartResponse, ShotDetail, LeagueAverage
from app.config import get_api_kwargs

logger = logging.getLogger(__name__)


def extract_shot_chart_data(shot_chart_obj):
    """
    Extracts shot chart data from the API response.
    Returns shot_rows, shot_headers, league_rows, league_headers, shot_chart_data, league_avg_data.
    """
    shot_chart_dataset = shot_chart_obj.shot_chart_detail if hasattr(shot_chart_obj, 'shot_chart_detail') and shot_chart_obj.shot_chart_detail else None
    league_avg_dataset = shot_chart_obj.league_averages if hasattr(shot_chart_obj, 'league_averages') and shot_chart_obj.league_averages else None
    
    shot_chart_data = shot_chart_dataset.data if shot_chart_dataset else {}
    league_avg_data = league_avg_dataset.data if league_avg_dataset else {}
    
    shot_rows = shot_chart_data.get("data", [])
    shot_headers = shot_chart_data.get("headers", [])
    league_rows = league_avg_data.get("data", [])
    league_headers = league_avg_data.get("headers", [])
    
    return shot_rows, shot_headers, league_rows, league_headers, shot_chart_data, league_avg_data


async def get_player_shot_chart(
    player_id: int,
    team_id: int,
    season: str = "2024-25",
    season_type: str = "Regular Season",
    context_measure: str = "FGA",
    last_n_games: int = 0,
    month: int = 0,
    opponent_team_id: int = 0,
    period: int = 0,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> ShotChartResponse:
    """
    Get shot chart data for a player with X/Y coordinates.
    
    Args:
        player_id: NBA player ID
        team_id: NBA team ID
        season: Season in format "YYYY-YY" (e.g., "2024-25")
        season_type: "Regular Season", "Playoffs", or "Pre Season"
        context_measure: "FGA" (field goals attempted) or "FGM" (field goals made)
        last_n_games: Last N games filter (0 = all games)
        month: Month filter (0 = all months)
        opponent_team_id: Opponent team filter (0 = all teams)
        period: Period filter (0 = all periods)
        date_from: Start date filter (YYYY-MM-DD format)
        date_to: End date filter (YYYY-MM-DD format)
        
    Returns:
        ShotChartResponse: Shot chart data with X/Y coordinates
        
    Raises:
        HTTPException: If API error or player not found
    """
    try:
        api_kwargs = get_api_kwargs()
        
        season_type_map = {
            "Regular Season": SeasonTypeAllStar.regular,
            "Playoffs": SeasonTypeAllStar.playoffs,
            "Pre Season": SeasonTypeAllStar.preseason,
        }
        season_type_enum = season_type_map.get(season_type, SeasonTypeAllStar.regular)
        
        context_measure_map = {
            "FGA": ContextMeasureSimple.fga,
            "FGM": ContextMeasureSimple.fgm,
        }
        context_measure_enum = context_measure_map.get(context_measure, ContextMeasureSimple.fga)
        shot_chart_obj = None
        shot_chart_data = {}
        league_avg_data = {}
        shot_rows = []
        shot_headers = []
        league_rows = []
        league_headers = []
        used_team_id = team_id
        
        try:
            shot_chart_obj = await asyncio.to_thread(
                lambda: shotchartdetail.ShotChartDetail(
                    team_id=team_id,
                    player_id=player_id,
                    season_nullable=season,
                    season_type_all_star=season_type_enum,
                    context_measure_simple=context_measure_enum,
                    last_n_games=last_n_games,
                    month=month,
                    opponent_team_id=opponent_team_id,
                    period=period,
                    date_from_nullable=date_from or "",
                    date_to_nullable=date_to or "",
                    **api_kwargs
                )
            )
            
            shot_rows, shot_headers, league_rows, league_headers, shot_chart_data, league_avg_data = extract_shot_chart_data(shot_chart_obj)
            
            if shot_rows:
                logger.info(f"Found {len(shot_rows)} shots for player {player_id} with team {team_id}")
        except Exception as e:
            logger.warning(f"Error fetching shot chart for player {player_id} with team {team_id}: {e}")
        
        if not shot_rows:
            logger.info(f"No shots found with requested team {team_id}, checking game log for season {season} to find correct team...")
            try:
                from nba_api.stats.endpoints import PlayerGameLog
                from nba_api.stats.static import teams
                game_log_data = await asyncio.to_thread(
                    lambda: PlayerGameLog(
                        player_id=player_id,
                        season=season,
                        season_type_all_star=season_type_enum,
                        **api_kwargs
                    ).get_dict()
                )
                
                if game_log_data.get("resultSets") and len(game_log_data["resultSets"]) > 0:
                    game_log = game_log_data["resultSets"][0].get("rowSet", [])
                    game_headers = game_log_data["resultSets"][0].get("headers", [])
                    
                    if game_log and "MATCHUP" in game_headers:
                        matchup_idx = game_headers.index("MATCHUP")
                        first_matchup = game_log[0][matchup_idx] if matchup_idx < len(game_log[0]) else ""
                        
                        team_abbrevs = re.findall(r'\b([A-Z]{3})\b', first_matchup)
                        
                        if len(team_abbrevs) >= 2:
                            teams_list = teams.get_teams()
                            team_map = {team["abbreviation"]: team["id"] for team in teams_list}
                            
                            for team_abbrev in team_abbrevs[:2]:
                                if team_abbrev in team_map:
                                    detected_team_id = team_map[team_abbrev]
                                    
                                    if detected_team_id == team_id:
                                        continue
                                    
                                    logger.info(f"Trying team {team_abbrev} (ID: {detected_team_id}) from game log MATCHUP: {first_matchup}")
                                    
                                    try:
                                        shot_chart_obj = await asyncio.to_thread(
                                            lambda t_id=detected_team_id: shotchartdetail.ShotChartDetail(
                                                team_id=t_id,
                                                player_id=player_id,
                                                season_nullable=season,
                                                season_type_all_star=season_type_enum,
                                                context_measure_simple=context_measure_enum,
                                                last_n_games=last_n_games,
                                                month=month,
                                                opponent_team_id=opponent_team_id,
                                                period=period,
                                                date_from_nullable=date_from or "",
                                                date_to_nullable=date_to or "",
                                                **api_kwargs
                                            )
                                        )
                                        
                                        shot_rows, shot_headers, league_rows, league_headers, shot_chart_data, league_avg_data = extract_shot_chart_data(shot_chart_obj)
                                        
                                        if shot_rows:
                                            used_team_id = detected_team_id
                                            logger.info(f"Found {len(shot_rows)} shots for player {player_id} with team {team_abbrev} (ID: {detected_team_id})")
                                            break
                                    except Exception as e:
                                        logger.debug(f"Error fetching shot chart with team {team_abbrev} (ID: {detected_team_id}): {e}")
                                        continue
            except Exception as e:
                logger.warning(f"Error finding correct team from game log: {e}", exc_info=True)
        
        if not shot_rows and shot_chart_data and "rowSet" in shot_chart_data:
            shot_rows = shot_chart_data.get("rowSet", [])
            logger.info("Using 'rowSet' key instead of 'data' key")
        
        if not league_rows and league_avg_data and "rowSet" in league_avg_data:
            league_rows = league_avg_data.get("rowSet", [])
        logger.info(f"Shot chart data for player {player_id}: {len(shot_rows)} shots found, {len(shot_headers)} headers (using team_id: {used_team_id})")
        if not shot_rows:
            logger.warning(f"No shot rows found for player {player_id} with any team for {season} {season_type}")
        
        shots = []
        for row in shot_rows:
            shot_dict = dict(zip(shot_headers, row)) if isinstance(row, list) and shot_headers else (row if isinstance(row, dict) else {})
            shots.append(ShotDetail(
                grid_type=str(shot_dict.get("GRID_TYPE", "")) if shot_dict.get("GRID_TYPE") else None,
                game_id=str(shot_dict.get("GAME_ID", "")) if shot_dict.get("GAME_ID") else None,
                game_event_id=int(shot_dict.get("GAME_EVENT_ID", 0)) if shot_dict.get("GAME_EVENT_ID") is not None else None,
                player_id=int(shot_dict.get("PLAYER_ID", player_id)),
                player_name=str(shot_dict.get("PLAYER_NAME", "")),
                team_id=int(shot_dict.get("TEAM_ID", team_id)),
                team_name=str(shot_dict.get("TEAM_NAME", "")),
                period=int(shot_dict.get("PERIOD", 0)),
                minutes_remaining=int(shot_dict.get("MINUTES_REMAINING", 0)),
                seconds_remaining=int(shot_dict.get("SECONDS_REMAINING", 0)),
                event_type=str(shot_dict.get("EVENT_TYPE", "")) if shot_dict.get("EVENT_TYPE") else None,
                action_type=str(shot_dict.get("ACTION_TYPE", "")) if shot_dict.get("ACTION_TYPE") else None,
                shot_type=str(shot_dict.get("SHOT_TYPE", "")) if shot_dict.get("SHOT_TYPE") else None,
                shot_zone_basic=str(shot_dict.get("SHOT_ZONE_BASIC", "")) if shot_dict.get("SHOT_ZONE_BASIC") else None,
                shot_zone_area=str(shot_dict.get("SHOT_ZONE_AREA", "")) if shot_dict.get("SHOT_ZONE_AREA") else None,
                shot_zone_range=str(shot_dict.get("SHOT_ZONE_RANGE", "")) if shot_dict.get("SHOT_ZONE_RANGE") else None,
                shot_distance=float(shot_dict.get("SHOT_DISTANCE", 0)) if shot_dict.get("SHOT_DISTANCE") is not None else None,
                loc_x=int(shot_dict.get("LOC_X", 0)) if shot_dict.get("LOC_X") is not None else None,
                loc_y=int(shot_dict.get("LOC_Y", 0)) if shot_dict.get("LOC_Y") is not None else None,
                shot_attempted_flag=int(shot_dict.get("SHOT_ATTEMPTED_FLAG", 0)),
                shot_made_flag=int(shot_dict.get("SHOT_MADE_FLAG", 0)),
                game_date=str(shot_dict.get("GAME_DATE", "")) if shot_dict.get("GAME_DATE") else None,
                htm=str(shot_dict.get("HTM", "")) if shot_dict.get("HTM") else None,
                vtm=str(shot_dict.get("VTM", "")) if shot_dict.get("VTM") else None,
            ))
        
        league_avg_list = []
        for row in league_rows:
            avg_dict = dict(zip(league_headers, row)) if isinstance(row, list) and league_headers else (row if isinstance(row, dict) else {})
            league_avg_list.append(LeagueAverage(
                grid_type=str(avg_dict.get("GRID_TYPE", "")) if avg_dict.get("GRID_TYPE") else None,
                shot_zone_basic=str(avg_dict.get("SHOT_ZONE_BASIC", "")) if avg_dict.get("SHOT_ZONE_BASIC") else None,
                shot_zone_area=str(avg_dict.get("SHOT_ZONE_AREA", "")) if avg_dict.get("SHOT_ZONE_AREA") else None,
                shot_zone_range=str(avg_dict.get("SHOT_ZONE_RANGE", "")) if avg_dict.get("SHOT_ZONE_RANGE") else None,
                fga=int(avg_dict.get("FGA", 0)) if avg_dict.get("FGA") is not None else None,
                fgm=int(avg_dict.get("FGM", 0)) if avg_dict.get("FGM") is not None else None,
                fg_pct=float(avg_dict.get("FG_PCT", 0)) if avg_dict.get("FG_PCT") is not None else None,
            ))
        
        player_name = shots[0].player_name if shots else ""
        team_name = shots[0].team_name if shots else ""
        
        if not player_name or not team_name:
        if not player_name or not team_name:
            try:
                from nba_api.stats.endpoints import playerindex
                from nba_api.stats.library.parameters import HistoricalNullable
                
                api_kwargs = get_api_kwargs()
                player_index_data = await asyncio.to_thread(
                    lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
                )
                player_index_df = player_index_data.get_data_frames()[0]
                player_row = player_index_df[player_index_df["PERSON_ID"] == player_id]
                
                if not player_row.empty:
                    player_data = player_row.iloc[0].to_dict()
                    if not player_name:
                        first_name = player_data.get("PLAYER_FIRST_NAME", "")
                        last_name = player_data.get("PLAYER_LAST_NAME", "")
                        player_name = f"{first_name} {last_name}".strip()
                    if not team_name:
                        team_name = player_data.get("TEAM_NAME", "")
            except Exception as e:
                logger.warning(f"Could not fetch player name/team from player index: {e}")
        
        return ShotChartResponse(
            player_id=player_id,
            player_name=player_name,
            team_id=used_team_id,
            team_name=team_name,
            season=season,
            season_type=season_type,
            shots=shots,
            league_averages=league_avg_list,
        )
        
    except Exception as e:
        logger.error(f"Error fetching shot chart for player {player_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching shot chart: {str(e)}"
        )

