from typing import Optional
import numpy as np
from nba_api.stats.endpoints import leaguestandingsv3
from fastapi import HTTPException
from app.schemas.standings import StandingsResponse, StandingRecord


def clean_clinch_indicator(value: Optional[str]) -> Optional[str]:
    """
    Cleans the clinch indicator by removing dashes, spaces, and ensuring it's a valid value.

    Args:
        value (Optional[str]): Raw clinch indicator from API.

    Returns:
        Optional[str]: Cleaned value if valid, otherwise None.
    """
    if value:
        value = value.strip()  # Remove spaces around the value
        
        # Explicitly check for "- c" or "- x"
        if value == "- c":
            return "c"  # Clinched Playoffs
        elif value == "- x":
            return "x"  # Eliminated
        elif value == "-":
            return "-"  # No clinch indicator
        

    return None  # If invalid, return None

async def getSeasonStandings(season: str) -> StandingsResponse:
    """
    Retrieves and structures the NBA standings for the specified season.

    Args:
        season (str): NBA season identifier (e.g., '2019-20').

    Returns:
        StandingsResponse: List of standings for all teams in the season.

    Raises:
        HTTPException: If no data is found or an error occurs.
    """
    try:
        # Fetch league standings for the specified season using V3
        standings = leaguestandingsv3.LeagueStandingsV3(
            league_id="00",
            season=season,
            season_type="Regular Season"  # You can change to "Playoffs" if needed
        )

        df = standings.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        # Replace NaNs with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        standings_list = []
        for team in df.to_dict(orient="records"):
            standing_record = StandingRecord(
                season_id=team["SeasonID"],
                team_id=int(team["TeamID"]),
                team_city=team["TeamCity"],
                team_name=team["TeamName"],
                conference=team["Conference"],
                conference_record=team["ConferenceRecord"],
                playoff_rank=int(team["PlayoffRank"]),
                clinch_indicator=clean_clinch_indicator(team.get("ClinchIndicator")),  # Fix applied
                division=team["Division"],
                division_record=team["DivisionRecord"],
                wins=int(team["WINS"]),
                losses=int(team["LOSSES"]),
                win_pct=float(team["WinPCT"]),
                home_record=team["HOME"],
                road_record=team["ROAD"],
                last_10=team["L10"],
                pre_as=team.get("PreAS"),
                post_as=team.get("PostAS"),
            )
            standings_list.append(standing_record)

        return StandingsResponse(standings=standings_list)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching season standings: {e}")

async def getTeamStandings(team_id: int, season: str) -> StandingRecord:
    """
    Fetches and structures the standings for a specific NBA team.

    Args:
        team_id (int): NBA Team ID.
        season (str): NBA season (e.g., '2019-20').

    Returns:
        StandingRecord: Standings for the specified team.

    Raises:
        HTTPException: If no data is found or an error occurs.
    """
    try:
        # Fetch standings for the entire league using LeagueStandingsV3
        standings = leaguestandingsv3.LeagueStandingsV3(
            league_id="00",
            season=season,
            season_type="Regular Season"
        )

        df = standings.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        # Replace NaNs with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        # Filter for the specific team
        team_data = df[df["TeamID"] == team_id].to_dict(orient="records")

        if not team_data:
            raise HTTPException(status_code=404, detail=f"No standings found for team {team_id} in season {season}")

        team = team_data[0]  # Extract first (and only) result

        return StandingRecord(
            season_id=team["SeasonID"],
            team_id=int(team["TeamID"]),
            team_city=team["TeamCity"],
            team_name=team["TeamName"],
            conference=team["Conference"],
            conference_record=team["ConferenceRecord"],
            playoff_rank=int(team["PlayoffRank"]),
            clinch_indicator=clean_clinch_indicator(team.get("ClinchIndicator")),
            division=team["Division"],
            division_record=team["DivisionRecord"],
            wins=int(team["WINS"]),
            losses=int(team["LOSSES"]),
            win_pct=float(team["WinPCT"]),
            home_record=team["HOME"],
            road_record=team["ROAD"],
            last_10=team["L10"],
            pre_as=team.get("PreAS"),
            post_as=team.get("PostAS"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team standings: {e}")
