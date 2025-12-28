import asyncio
import logging

from fastapi import HTTPException
from nba_api.stats.endpoints import scoreboardv2
from nba_api.stats.static import teams

from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary, TopScorer

# Set up logger for this file
logger = logging.getLogger(__name__)

# Create a map of team IDs to abbreviations for quick lookup
# This helps us convert team IDs to abbreviations like "LAL" or "BOS"
NBA_TEAMS = {team["id"]: team["abbreviation"] for team in teams.get_teams()}


async def getGamesForDate(date: str) -> GamesResponse:
    """
    Get all NBA games for a specific date.
    Returns games that were played or scheduled for that day.
    
    Args:
        date: The date in YYYY-MM-DD format
        
    Returns:
        GamesResponse: List of all games for that date
        
    Raises:
        HTTPException: If no games found or API error
    """
    try:
        # Get game data from NBA API for the specified date
        games_data = await asyncio.to_thread(lambda: scoreboardv2.ScoreboardV2(game_date=date).get_dict())

        # Check if we got valid data
        if "resultSets" not in games_data or not games_data["resultSets"]:
            raise HTTPException(status_code=404, detail=f"No game data found for {date}")

        # Extract different parts of the game data
        # GameHeader has basic game info (teams, status, etc.)
        game_header_data = next((r for r in games_data["resultSets"] if r["name"] == "GameHeader"), None)
        # TeamLeaders has the top scorer for each game
        team_leaders_data = next((r for r in games_data["resultSets"] if r["name"] == "TeamLeaders"), None)
        # LineScore has the final scores
        line_score_data = next((r for r in games_data["resultSets"] if r["name"] == "LineScore"), None)

        # If no game header data, return 404 error
        if not game_header_data or "rowSet" not in game_header_data:
            raise HTTPException(status_code=404, detail=f"No game header data found for {date}")

        # Get the column names and game data
        game_headers = game_header_data["headers"]
        games_list = game_header_data["rowSet"]

        # Get headers and data for team leaders and scores (if available)
        team_leaders_headers = team_leaders_data["headers"] if team_leaders_data else []
        team_leaders_list = team_leaders_data["rowSet"] if team_leaders_data else []

        line_score_headers = line_score_data["headers"] if line_score_data else []
        line_score_list = line_score_data["rowSet"] if line_score_data else []

        games = []

        # Process each game
        for game in games_list:
            # Convert the game data to a dictionary
            game_dict = dict(zip(game_headers, game))

            # Skip if game ID is missing
            if "GAME_ID" not in game_dict:
                continue

            game_id = game_dict["GAME_ID"]
            home_team_id = game_dict.get("HOME_TEAM_ID")
            away_team_id = game_dict.get("VISITOR_TEAM_ID")

            # Skip if either team ID is missing
            if home_team_id is None or away_team_id is None:
                continue

            # Make sure both IDs are integers
            try:
                home_team_id = int(home_team_id)
                away_team_id = int(away_team_id)
            except (TypeError, ValueError):
                continue

            # Find the home team's score from the line score data
            home_score = next(
                (
                    dict(zip(line_score_headers, s)).get("PTS", 0)
                    for s in line_score_list
                    if dict(zip(line_score_headers, s)).get("GAME_ID") == game_id
                    and dict(zip(line_score_headers, s)).get("TEAM_ID") == home_team_id
                ),
                0,
            )
            # Find the away team's score
            away_score = next(
                (
                    dict(zip(line_score_headers, s)).get("PTS", 0)
                    for s in line_score_list
                    if dict(zip(line_score_headers, s)).get("GAME_ID") == game_id
                    and dict(zip(line_score_headers, s)).get("TEAM_ID") == away_team_id
                ),
                0,
            )

            # Create TeamSummary objects for both teams
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

            # Try to find the top scorer for this game
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
                    for d in (dict(zip(team_leaders_headers, leader_row)) for leader_row in team_leaders_list)
                    if d.get("GAME_ID") == game_id
                ),
                None,
            )

            # Create a GameSummary with all the game information
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

        return GamesResponse(games=games)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving games for date {date}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving games: {str(e)}")
