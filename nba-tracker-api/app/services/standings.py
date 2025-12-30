import asyncio
import logging
import numpy as np

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3

from app.schemas.standings import StandingRecord, StandingsResponse
from app.config import get_proxy_kwargs

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


async def getSeasonStandings(season: str) -> StandingsResponse:
    """
    Get the NBA standings (win/loss records) for all teams in a season.
    Shows which teams are in the playoffs and their records.
    
    Args:
        season: The season year like "2023-24"
        
    Returns:
        StandingsResponse: Standings for all teams
        
    Raises:
        HTTPException: If no standings found or API error
    """
    try:
        # Get standings data from NBA API
        proxy_kwargs = get_proxy_kwargs()
        df = await asyncio.to_thread(
            lambda: leaguestandingsv3.LeagueStandingsV3(
                league_id="00",  # "00" means NBA (not WNBA or G-League)
                season=season,
                season_type="Regular Season",  # Get regular season standings
                **proxy_kwargs
            ).get_data_frames()[0]
        )

        # If no data, return 404 error
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        # Replace NaN (not a number) values with None so they become null in JSON
        df.replace({np.nan: None}, inplace=True)

        # Convert each team's data to our StandingRecord format
        standings_list = []
        for team in df.to_dict(orient="records"):
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
                l10_record=team["L10"],  # Last 10 games record
                current_streak=int(team["CurrentStreak"]),
                current_streak_str=team["strCurrentStreak"],  # Like "W4" or "L2"
                games_back=safe_str(team.get("ConferenceGamesBack")),  # Games behind conference leader
            )
            standings_list.append(standing_record)

        return StandingsResponse(standings=standings_list)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching season standings for {season}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching season standings: {e}")
