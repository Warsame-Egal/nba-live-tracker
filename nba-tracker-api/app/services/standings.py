import asyncio
import logging
import numpy as np

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3

from app.schemas.standings import StandingRecord, StandingsResponse
from app.config import get_api_kwargs

# Set up logger for this file
logger = logging.getLogger(__name__)


def safe_str(value) -> str:
    """
    Convert a value to a string safely.
    Returns empty string if the value is None.
    
    Args:
        value: The value to convert
        
    Returns:
        str: The value as a string, or empty string if None
    """
    return str(value) if value is not None else ""


async def getSeasonStandings(season: str, max_retries: int = 3) -> StandingsResponse:
    """
    Get the NBA standings (win/loss records) for all teams in a season.
    Shows which teams are in the playoffs and their records.
    
    Args:
        season: The season year like "2023-24"
        max_retries: Maximum number of retry attempts for API calls
        
    Returns:
        StandingsResponse: Standings for all teams
        
    Raises:
        HTTPException: If no standings found or API error
    """
    from requests.exceptions import ConnectionError, Timeout
    
    for attempt in range(max_retries):
        try:
            # Get standings data from NBA API
            api_kwargs = get_api_kwargs()
            df = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: leaguestandingsv3.LeagueStandingsV3(
                        league_id="00",  # "00" means NBA (not WNBA or G-League)
                        season=season,
                        season_type="Regular Season",  # Get regular season standings
                        **api_kwargs
                    ).get_data_frames()[0]
                ),
                timeout=15.0  # 15 second timeout
            )

            # If no data, return 404 error
            if df.empty:
                logger.warning(f"No standings data returned from NBA API for season {season}")
                raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

            # Replace NaN (not a number) values with None so they become null in JSON
            df.replace({np.nan: None}, inplace=True)

            # Convert each team's data to our StandingRecord format
            standings_list = []
            for team in df.to_dict(orient="records"):
                # Get PPG, OPP PPG, and DIFF if available (may not exist in all seasons)
                ppg = None
                opp_ppg = None
                diff = None
                
                try:
                    # Try to get PPG and OPP PPG from various possible column names
                    ppg_raw = team.get("PointsPG") or team.get("PTS") or team.get("Points")
                    opp_ppg_raw = team.get("OppPointsPG") or team.get("OPP_PTS") or team.get("OppPoints")
                    
                    # Convert to float if not None and not NaN
                    if ppg_raw is not None:
                        try:
                            ppg_val = float(ppg_raw)
                            if not (np.isnan(ppg_val) or np.isinf(ppg_val)):
                                ppg = ppg_val
                        except (ValueError, TypeError):
                            pass
                    
                    if opp_ppg_raw is not None:
                        try:
                            opp_ppg_val = float(opp_ppg_raw)
                            if not (np.isnan(opp_ppg_val) or np.isinf(opp_ppg_val)):
                                opp_ppg = opp_ppg_val
                        except (ValueError, TypeError):
                            pass
                    
                    # Calculate diff if both values are available
                    if ppg is not None and opp_ppg is not None:
                        diff = ppg - opp_ppg
                except Exception as e:
                    logger.debug(f"Could not extract PPG/OPP PPG for team {team.get('TeamID')}: {e}")
                
                try:
                    standing_record = StandingRecord(
                        season_id=team["SeasonID"],
                        team_id=int(team["TeamID"]),
                        team_city=team["TeamCity"],
                        team_name=team["TeamName"],
                        conference=team["Conference"],
                        division=team["Division"],
                        conference_record=team["ConferenceRecord"],
                        division_record=team["DivisionRecord"],
                        playoff_rank=int(team["PlayoffRank"]),
                        wins=int(team["WINS"]),
                        losses=int(team["LOSSES"]),
                        win_pct=float(team["WinPCT"]),
                        home_record=team["HOME"],
                        road_record=team["ROAD"],
                        l10_record=team["L10"],
                        current_streak=int(team["CurrentStreak"]),
                        current_streak_str=team["strCurrentStreak"],
                        games_back=safe_str(team.get("ConferenceGamesBack")),
                        ppg=ppg,
                        opp_ppg=opp_ppg,
                        diff=diff,
                    )
                    standings_list.append(standing_record)
                except Exception as e:
                    logger.error(f"Error creating StandingRecord for team {team.get('TeamID', 'unknown')}: {e}")
                    raise

            return StandingsResponse(standings=standings_list)
            
        except (ConnectionError, Timeout, asyncio.TimeoutError) as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                logger.warning(f"Connection error fetching standings for {season} (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Failed to fetch standings for {season} after {max_retries} attempts: {e}")
                raise HTTPException(status_code=503, detail=f"NBA API unavailable. Please try again later.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching season standings for {season}: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching season standings: {e}")
