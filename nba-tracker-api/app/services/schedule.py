import numpy as np
from nba_api.stats.endpoints import leaguegamefinder
from app.schemas.schedule import ScheduledGame, ScheduleResponse
from fastapi import HTTPException
from app.utils.formatters import format_matchup


async def getSeasonSchedule(season: str) -> ScheduleResponse:
    """
    Retrieves and structures the schedule of all NBA games for the specified season.

    Args:
        season (str): NBA season identifier (e.g., '2023-24').

    Returns:
        ScheduleResponse: List of all games in the season.

    Raises:
        HTTPException: If no games are found or an error occurs.
    """
    try:
        # Fetch games for the specified season
        game_finder = leaguegamefinder.LeagueGameFinder(
            season_nullable=season,
            league_id_nullable="00"
        )
        df = game_finder.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404,
                                detail=f"No games found for season {season}")

        # Replace NaNs with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        games = []
        for game in df.to_dict(orient="records"):
            scheduled_game = ScheduledGame(
                # Removes leading digit
                season_id=int(str(game["SEASON_ID"])[1:]),
                team_id=int(game["TEAM_ID"]),
                team_abbreviation=game["TEAM_ABBREVIATION"],
                game_id=game["GAME_ID"],
                game_date=game["GAME_DATE"],
                matchup=format_matchup(game["MATCHUP"]),
                win_loss=game.get("WL"),
                points_scored=int(game["PTS"]) if game.get("PTS") else None,
                field_goal_pct=float(
                    game["FG_PCT"]) if game.get("FG_PCT") else None,
                three_point_pct=float(
                    game["FG3_PCT"]) if game.get("FG3_PCT") else None
            )
            games.append(scheduled_game)

        return ScheduleResponse(games=games)

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error fetching season schedule: {e}")


async def getTeamSchedule(team_id: int, season: str) -> ScheduleResponse:
    """
    Fetches and structures the schedule for a specific NBA team.

    Args:
        team_id (int): NBA Team ID.
        season (str): NBA season (e.g., '2023-24').

    Returns:
        ScheduleResponse: List of all games for the team.

    Raises:
        HTTPException: If no games are found or an error occurs.
    """
    try:
        # Fetch games for the specified team and season
        game_finder = leaguegamefinder.LeagueGameFinder(
            season_nullable=season,
            team_id_nullable=str(team_id),
            league_id_nullable="00"
        )
        df = game_finder.get_data_frames()[0]

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No games found for team {team_id} in season {season}")

        df.replace({np.nan: None}, inplace=True)

        games = []
        for game in df.to_dict(orient="records"):
            scheduled_game = ScheduledGame(
                # Removes leading digit
                season_id=int(str(game["SEASON_ID"])[1:]),
                team_id=int(game["TEAM_ID"]),
                team_abbreviation=game["TEAM_ABBREVIATION"],
                game_id=game["GAME_ID"],
                game_date=game["GAME_DATE"],
                matchup=format_matchup(game["MATCHUP"]),
                win_loss=game.get("WL"),
                points_scored=int(game["PTS"]) if game.get("PTS") else None,
                field_goal_pct=float(
                    game["FG_PCT"]) if game.get("FG_PCT") else None,
                three_point_pct=float(
                    game["FG3_PCT"]) if game.get("FG3_PCT") else None
            )
            games.append(scheduled_game)

        return ScheduleResponse(games=games)

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Error fetching team schedule: {e}")
