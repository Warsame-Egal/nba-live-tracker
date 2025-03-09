from typing import List
import numpy as np
from nba_api.live.nba.endpoints import scoreboard
from nba_api.stats.endpoints import leaguestandingsv3
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.endpoints import playerindex
from app.schemas.scoreboard import (
    Team, LiveGame, PlayerStats, GameLeaders, ScoreboardResponse, Scoreboard
)
from app.schemas.player import TeamRoster, Player, PlayerSummary
from app.schemas.team import TeamDetails
from app.schemas.schedule import ScheduledGame, ScheduleResponse
from fastapi import HTTPException
from pydantic import ValidationError
from datetime import datetime
from app.utils.formatters import format_matchup

async def getScoreboard() -> ScoreboardResponse:
    """
    Fetches today's NBA games from the NBA API and structures the data into a scoreboard response.

    Steps:
    1. Retrieves current NBA game data.
    2. Extracts game details including teams, current status, scores, and top-performing players.
    3. Constructs structured response with live game details.

    Raises:
        HTTPException: If fetching data from the NBA API fails.
    """
    try:
        board = scoreboard.ScoreBoard().get_dict()
        raw_scoreboard_data = board.get("scoreboard", {})
        game_date = raw_scoreboard_data.get("gameDate", "")
        raw_games = raw_scoreboard_data.get("games", [])
        games = []

        for game in raw_games:
            home_team_data = game["homeTeam"]
            away_team_data = game["awayTeam"]

            home_team = Team(
                teamId=home_team_data["teamId"],
                teamName=home_team_data["teamName"],
                teamCity=home_team_data["teamCity"],
                teamTricode=home_team_data["teamTricode"],
                wins=home_team_data.get("wins"),
                losses=home_team_data.get("losses"),
                timeoutsRemaining=home_team_data.get("timeoutsRemaining")
            )

            away_team = Team(
                teamId=away_team_data["teamId"],
                teamName=away_team_data["teamName"],
                teamCity=away_team_data["teamCity"],
                teamTricode=away_team_data["teamTricode"],
                wins=away_team_data.get("wins"),
                losses=away_team_data.get("losses"),
                timeoutsRemaining=away_team_data.get("timeoutsRemaining")
            )

            game_leaders_data = game.get("gameLeaders", {})
            home_leader_data = game_leaders_data.get("homeLeaders")
            away_leader_data = game_leaders_data.get("awayLeaders")

            home_leader = PlayerStats(
                personId=home_leader_data["personId"],
                name=home_leader_data["name"],
                jerseyNum=home_leader_data["jerseyNum"],
                position=home_leader_data["position"],
                teamTricode=home_leader_data["teamTricode"],
                points=home_leader_data["points"],
                rebounds=home_leader_data["rebounds"],
                assists=home_leader_data["assists"]
            ) if home_leader_data else None

            away_leader = PlayerStats(
                personId=away_leader_data["personId"],
                name=away_leader_data["name"],
                jerseyNum=away_leader_data["jerseyNum"],
                position=away_leader_data["position"],
                teamTricode=away_leader_data["teamTricode"],
                points=away_leader_data["points"],
                rebounds=away_leader_data["rebounds"],
                assists=away_leader_data["assists"]
            ) if away_leader_data else None

            game_leaders = GameLeaders(
                homeLeaders=home_leader,
                awayLeaders=away_leader
            ) if home_leader or away_leader else None

            live_game = LiveGame(
                gameId=game["gameId"],
                gameStatus=game["gameStatus"],
                gameStatusText=game["gameStatusText"].strip(),
                period=game["period"],
                gameClock=game.get("gameClock"),
                gameTimeUTC=game["gameTimeUTC"],
                homeTeam=home_team,
                awayTeam=away_team,
                gameLeaders=game_leaders,
                pbOdds=None
            )

            games.append(live_game)

        scoreboard_obj = Scoreboard(gameDate=game_date, games=games)
        return ScoreboardResponse(scoreboard=scoreboard_obj)

    except Exception as e:
        print(f"Error fetching live scoreboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching live scores: {e}")
    
    
async def getTeamGamesByDate(team_id: int, game_date: str) -> ScheduleResponse:
    """
    Retrieves all games played by a specific team on a given date.

    Steps:
    1. Converts the input date format from "YYYY-MM-DD" to "MM/DD/YYYY" for the NBA API.
    2. Queries the NBA API to fetch games played by the given team on the specified date.
    3. Processes the retrieved data into structured game objects.
    4. Returns the structured game data.

    Args:
        team_id (int): Unique NBA team identifier.
        game_date (str): Game date in "YYYY-MM-DD" format.

    Returns:
        ScheduleResponse: A structured list of games played by the team.

    Raises:
        HTTPException:
            - 404: If no games are found for the given team on the specified date.
            - 500: If an error occurs during data retrieval.
    """
    try:
        # Convert date from "YYYY-MM-DD" to "MM/DD/YYYY" (required by NBA API)
        formatted_date = datetime.strptime(game_date, "%Y-%m-%d").strftime("%m/%d/%Y")

        # Fetch games played by the team on the specified date
        game_finder = leaguegamefinder.LeagueGameFinder(
            date_from_nullable=formatted_date,
            date_to_nullable=formatted_date,
            team_id_nullable=str(team_id),
            league_id_nullable="00"
        )

        df_list = game_finder.get_data_frames()

        # Handle cases where no data is returned
        if not df_list or df_list[0].empty:
            raise HTTPException(status_code=404, detail=f"No games found for team ID {team_id} on date {game_date}")

        df = df_list[0]

        # Replace NaN values with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        # Process game records into structured objects
        games = []
        for game in df.to_dict(orient="records"):
            scheduled_game = ScheduledGame(
                season_id=int(str(game["SEASON_ID"])[1:]),  # Removes the leading digit
                team_id=int(game["TEAM_ID"]),
                team_abbreviation=game["TEAM_ABBREVIATION"],
                game_id=game["GAME_ID"],
                game_date=game["GAME_DATE"],
                matchup=format_matchup(game["MATCHUP"]),  # Converts matchup format from 'TEAM @ TEAM' to 'TEAM vs TEAM'
                win_loss=game.get("WL"),
                points_scored=int(game["PTS"]) if game.get("PTS") else None,
                field_goal_pct=float(game["FG_PCT"]) if game.get("FG_PCT") else None,
                three_point_pct=float(game["FG3_PCT"]) if game.get("FG3_PCT") else None
            )
            games.append(scheduled_game)

        return ScheduleResponse(games=games)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching games for team ID {team_id} on date {game_date}: {e}")



async def getMatchupGames(team1_id: int, team2_id: int) -> ScheduleResponse:
    """
    Retrieves and structures past games where two teams have faced each other.

    Args:
        team1_id (int): Unique identifier for the first NBA team.
        team2_id (int): Unique identifier for the second NBA team.

    Returns:
        ScheduleResponse: A structured list of past head-to-head games.

    Raises:
        HTTPException:
            - 404: If no matchups are found between the two teams.
            - 500: If an error occurs during data retrieval.
    """
    try:
        # Fetch past matchups between the two teams
        game_finder = leaguegamefinder.LeagueGameFinder(
            team_id_nullable=str(team1_id),
            vs_team_id_nullable=str(team2_id),
            league_id_nullable="00"
        )
        df_list = game_finder.get_data_frames()

        if not df_list or df_list[0].empty:
            raise HTTPException(status_code=404, detail=f"No matchups found between {team1_id} and {team2_id}")

        df = df_list[0]

        # Replace NaN values with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        # Process game records into structured objects
        games = []
        for game in df.to_dict(orient="records"):
            scheduled_game = ScheduledGame(
                season_id=int(str(game["SEASON_ID"])[1:]),  # Removes leading digit
                team_id=int(game["TEAM_ID"]),
                team_abbreviation=game["TEAM_ABBREVIATION"],
                game_id=game["GAME_ID"],
                game_date=game["GAME_DATE"],
                matchup=format_matchup(game["MATCHUP"]),  # Converts matchup format
                win_loss=game.get("WL"),
                points_scored=int(game["PTS"]) if game.get("PTS") else None,
                field_goal_pct=float(game["FG_PCT"]) if game.get("FG_PCT") else None,
                three_point_pct=float(game["FG3_PCT"]) if game.get("FG3_PCT") else None
            )
            games.append(scheduled_game)

        return ScheduleResponse(games=games)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching matchup games between {team1_id} and {team2_id}: {e}")

    

async def getTeamInfo(team_id: int) -> ScheduleResponse:
    """
    Retrieves and structures all games played by a specific NBA team across seasons.

    Args:
        team_id (int): Unique identifier for the NBA team.

    Returns:
        ScheduleResponse: A structured list of all games played by the team.

    Raises:
        HTTPException:
            - 404: If no data is found for the given team.
            - 500: If an error occurs during data retrieval.
    """
    try:
        # Fetch team-related game data
        game_finder = leaguegamefinder.LeagueGameFinder(
            team_id_nullable=str(team_id),
            league_id_nullable="00"
        )
        df_list = game_finder.get_data_frames()

        if not df_list or df_list[0].empty:
            raise HTTPException(status_code=404, detail=f"No data found for team ID {team_id}")

        df = df_list[0]

        # Replace NaN values with None to prevent validation errors
        df.replace({np.nan: None}, inplace=True)

        # Process game records into structured objects
        games = []
        for game in df.to_dict(orient="records"):
            scheduled_game = ScheduledGame(
                season_id=int(str(game["SEASON_ID"])[1:]),  # Removes the leading digit
                team_id=int(game["TEAM_ID"]),
                team_abbreviation=game["TEAM_ABBREVIATION"],
                game_id=game["GAME_ID"],
                game_date=game["GAME_DATE"],
                matchup=format_matchup(game["MATCHUP"]),  # Converts matchup format
                win_loss=game.get("WL"),
                points_scored=int(game["PTS"]) if game.get("PTS") is not None else None,
                field_goal_pct=float(game["FG_PCT"]) if game.get("FG_PCT") is not None else 0.0,
                three_point_pct=float(game["FG3_PCT"]) if game.get("FG3_PCT") is not None else 0.0,
                free_throw_pct=float(game["FT_PCT"]) if game.get("FT_PCT") is not None else 0.0,
                plus_minus=float(game["PLUS_MINUS"]) if game.get("PLUS_MINUS") is not None else 0.0
            )
            games.append(scheduled_game)

        return ScheduleResponse(games=games)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team info for team ID {team_id}: {e}")


    
def getLiveTeam(team_id: int) -> TeamDetails:
    """Fetch team standings and details from NBA API."""
    try:
        raw_standings = leaguestandingsv3.LeagueStandingsV3(
            league_id="00", 
            season="2023-24", 
            season_type="Regular Season"
        ).get_dict()

        standings_data = raw_standings["resultSets"][0]["rowSet"]
        column_names = raw_standings["resultSets"][0]["headers"]

        # Find team data
        team_data = next((team for team in standings_data if team[2] == team_id), None)

        if not team_data:
            raise HTTPException(status_code=404, detail=f"No team details found for team ID {team_id}")

        # Convert to dictionary for mapping
        team_dict = dict(zip(column_names, team_data))

        return TeamDetails(
            team_id=team_dict["TeamID"],  
            team_name=team_dict["TeamName"],
            conference=team_dict["Conference"],
            division=team_dict["Division"],
            wins=team_dict["WINS"],
            losses=team_dict["LOSSES"],
            win_pct=team_dict["WinPCT"],
            home_record=str(team_dict["HOME"]),
            road_record=str(team_dict["ROAD"]),
            last_10=str(team_dict["L10"]),
            current_streak=str(team_dict["CurrentStreak"])
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team details: {e}")
    
    
def getTeamRoster(team_id: int, season: str) -> TeamRoster:
    """Fetch the full roster from NBA API."""
    try:
        # Fetch roster
        raw_roster = commonteamroster.CommonTeamRoster(team_id=team_id, season=season).get_dict()
        player_data = raw_roster["resultSets"][0]["rowSet"]

        if not player_data:
            raise HTTPException(status_code=404, detail=f"No roster found for team ID {team_id} in {season}")

        # Convert player data to schema
        players = []
        column_names = raw_roster["resultSets"][0]["headers"]

        for row in player_data:
            player_dict = dict(zip(column_names, row))

            players.append(
                Player(
                    player_id=int(player_dict["PLAYER_ID"]),
                    name=player_dict["PLAYER"],
                    jersey_number=player_dict["NUM"] or None,
                    position=player_dict["POSITION"] or None,
                    height=player_dict["HEIGHT"] or None,
                    weight=int(player_dict["WEIGHT"]) or None,
                    birth_date=player_dict["BIRTH_DATE"] or None,
                    age=int(player_dict["AGE"]) or None,
                    experience=str(player_dict["EXP"]),
                    school=player_dict["SCHOOL"] or None
                )
            )

        # Return schema
        return TeamRoster(
            team_id=team_id,
            team_name=player_data[0][1],
            season=season,
            players=players,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team roster: {e}")

def getPlayerDetails(player_id: int) -> PlayerSummary:
    """Fetch details for a specific player using PlayerIndex API."""
    try:
        # Fetch player data from API
        raw_data = playerindex.PlayerIndex().get_dict()
        column_names = raw_data["resultSets"][0]["headers"]  # Column names from API
        player_list = raw_data["resultSets"][0]["rowSet"]  # Player data rows

        # Convert rows into a list of dictionaries
        players = [dict(zip(column_names, row)) for row in player_list]

        # Find the player by ID
        player_dict = next((player for player in players if player["PERSON_ID"] == player_id), None)

        if not player_dict:
            raise HTTPException(status_code=404, detail=f"No details found for player ID {player_id}")

        #Return response using dictionary
        return PlayerSummary(
            player_id=player_dict["PERSON_ID"],
            full_name=f"{player_dict['PLAYER_FIRST_NAME']} {player_dict['PLAYER_LAST_NAME']}",
            team_id=player_dict["TEAM_ID"] if player_dict["TEAM_ID"] else None,
            team_name=player_dict["TEAM_NAME"] if player_dict["TEAM_NAME"] else None,
            team_abbreviation=player_dict["TEAM_ABBREVIATION"] if player_dict["TEAM_ABBREVIATION"] else None,
            jersey_number=player_dict["JERSEY_NUMBER"] if player_dict["JERSEY_NUMBER"] else None,
            position=player_dict["POSITION"] if player_dict["POSITION"] else None,
            height=player_dict["HEIGHT"] if player_dict["HEIGHT"] else None,
            weight=int(player_dict["WEIGHT"]) if player_dict["WEIGHT"] else None,
            college=player_dict["COLLEGE"] if player_dict["COLLEGE"] else None,
            country=player_dict["COUNTRY"] if player_dict["COUNTRY"] else None,
            draft_year=int(player_dict["DRAFT_YEAR"]) if player_dict["DRAFT_YEAR"] else None,
            draft_round=int(player_dict["DRAFT_ROUND"]) if player_dict["DRAFT_ROUND"] else None,
            draft_number=int(player_dict["DRAFT_NUMBER"]) if player_dict["DRAFT_NUMBER"] else None,
            from_year=int(player_dict["FROM_YEAR"]) if player_dict["FROM_YEAR"] else None,
            to_year=int(player_dict["TO_YEAR"]) if player_dict["TO_YEAR"] else None,
            points_per_game=float(player_dict["PTS"]) if player_dict["PTS"] else None,
            rebounds_per_game=float(player_dict["REB"]) if player_dict["REB"] else None,
            assists_per_game=float(player_dict["AST"]) if player_dict["AST"] else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching player details: {e}")


def searchPlayerByName(player_name: str) -> List[PlayerSummary]:
    """Search for players by name using PlayerIndex API."""
    try:
        # Fetch player data from API
        raw_data = playerindex.PlayerIndex().get_dict()
        column_names = raw_data["resultSets"][0]["headers"]  # Column names from API
        player_list = raw_data["resultSets"][0]["rowSet"]  # Player data rows

        # Convert rows into a list of dictionaries
        players = [dict(zip(column_names, row)) for row in player_list]

        # Filter players that match the search query
        matching_players = [
            player for player in players
            if player_name.lower() in f"{player['PLAYER_FIRST_NAME']} {player['PLAYER_LAST_NAME']}".lower()
        ]

        if not matching_players:
            raise HTTPException(status_code=404, detail=f"No players found matching '{player_name}'")

        #Return list of players
        return [
            PlayerSummary(
                player_id=player["PERSON_ID"],
                full_name=f"{player['PLAYER_FIRST_NAME']} {player['PLAYER_LAST_NAME']}",
                team_id=player["TEAM_ID"] if player["TEAM_ID"] else None,
                team_name=player["TEAM_NAME"] if player["TEAM_NAME"] else None,
                team_abbreviation=player["TEAM_ABBREVIATION"] if player["TEAM_ABBREVIATION"] else None,
                jersey_number=player["JERSEY_NUMBER"] if player["JERSEY_NUMBER"] else None,
                position=player["POSITION"] if player["POSITION"] else None,
                height=player["HEIGHT"] if player["HEIGHT"] else None,
                weight=int(player["WEIGHT"]) if player["WEIGHT"] else None,
                college=player["COLLEGE"] if player["COLLEGE"] else None,
                country=player["COUNTRY"] if player["COUNTRY"] else None,
                draft_year=int(player["DRAFT_YEAR"]) if player["DRAFT_YEAR"] else None,
                draft_round=int(player["DRAFT_ROUND"]) if player["DRAFT_ROUND"] else None,
                draft_number=int(player["DRAFT_NUMBER"]) if player["DRAFT_NUMBER"] else None,
                from_year=int(player["FROM_YEAR"]) if player["FROM_YEAR"] else None,
                to_year=int(player["TO_YEAR"]) if player["TO_YEAR"] else None,
                points_per_game=float(player["PTS"]) if player["PTS"] else None,
                rebounds_per_game=float(player["REB"]) if player["REB"] else None,
                assists_per_game=float(player["AST"]) if player["AST"] else None
            )
            for player in matching_players
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching for players: {e}")
