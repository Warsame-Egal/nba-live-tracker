import numpy as np
from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3
from app.schemas.standings import StandingRecord, StandingsResponse


def safe_str(value) -> str:
    """
    Safely converts a value to string. Returns an empty string if value is None.
    """
    return str(value) if value is not None else ""


async def getSeasonStandings(season: str) -> StandingsResponse:
    """
    Retrieves and structures the NBA standings for the specified season.
    """
    try:
        standings = leaguestandingsv3.LeagueStandingsV3(
            league_id="00",
            season=season,
            season_type="Regular Season",
        )

        df = standings.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        df.replace({np.nan: None}, inplace=True)

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
                l10_record=team["L10"],
                current_streak=int(team["CurrentStreak"]),
                current_streak_str=team["strCurrentStreak"],
                games_back=safe_str(team.get("ConferenceGamesBack")),
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
    """
    try:
        standings = leaguestandingsv3.LeagueStandingsV3(league_id="00", season=season, season_type="Regular Season")

        df = standings.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No standings found for season {season}")

        df.replace({np.nan: None}, inplace=True)

        team_data = df[df["TeamID"] == team_id].to_dict(orient="records")

        if not team_data:
            raise HTTPException(
                status_code=404,
                detail=f"No standings found for team {team_id} in season {season}",
            )

        team = team_data[0]

        return StandingRecord(
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
            pre_as=team.get("PreAS"),
            post_as=team.get("PostAS"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team standings: {e}")
