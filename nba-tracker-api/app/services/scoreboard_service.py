from typing import List
import numpy as np
from nba_api.live.nba.endpoints import scoreboard
from nba_api.stats.endpoints import leaguestandingsv3
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.endpoints import playerindex
from app.schemas.scoreboard_schema import (
    ScoreboardResponse, Scoreboard, ScheduledGame,
    ScheduleResponse, TeamDetails, TeamRoster, Coach,
    Player, PlayerSummary
)
from fastapi import HTTPException
from pydantic import ValidationError

def getScoreboard() -> ScoreboardResponse:
    """Fetch and validate live NBA scores."""
    try:
        raw_scoreboard = scoreboard.ScoreBoard().get_dict()
        
        raw_scoreboard_data = raw_scoreboard.get("scoreboard")

        if not raw_scoreboard_data:
            raise HTTPException(status_code=404, detail="No live scoreboard data available")

        validated_scoreboard = Scoreboard(**raw_scoreboard_data)
        return ScoreboardResponse(scoreboard=validated_scoreboard)

    except ValidationError as ve:
        print(f"Validation Error: {ve.json()}")
        raise HTTPException(status_code=422, detail="Invalid scoreboard data format")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching live scores: {e}")


def getSeasonSchedule(season: str) -> ScheduleResponse:
    """Fetch all games for a given NBA season and format them into a structured response."""
    try:
        # Fetch data from NBA API
        raw_schedule_data = {
            "season_nullable": season,
            "league_id_nullable": "00"
        }
        game_finder = leaguegamefinder.LeagueGameFinder(**raw_schedule_data)
        df = game_finder.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No games found for season {season}")

        # Handle NaN values by replacing them with None
        df.replace({np.nan: None}, inplace=True)

        # Convert DataFrame rows into Pydantic models
        games = []
        for _, row in df.iterrows():
            try:
                game = ScheduledGame(
                    season_id=int(row["SEASON_ID"]),
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM_ABBREVIATION"],
                    team_name=row["TEAM_NAME"],
                    game_id=row["GAME_ID"],
                    game_date=row["GAME_DATE"],
                    matchup=row["MATCHUP"],
                    win_loss=row["WL"] if row["WL"] is not None else None,  # Handle missing W/L
                    minutes=int(row["MIN"]) if row["MIN"] is not None else 0,
                    points=int(row["PTS"]) if row["PTS"] is not None else 0,
                    field_goals_made=int(row["FGM"]) if row["FGM"] is not None else 0,
                    field_goals_attempted=int(row["FGA"]) if row["FGA"] is not None else 0,
                    field_goal_pct=float(row["FG_PCT"]) if row["FG_PCT"] is not None else 0.0,
                    three_point_made=int(row["FG3M"]) if row["FG3M"] is not None else 0,
                    three_point_attempted=int(row["FG3A"]) if row["FG3A"] is not None else 0,
                    three_point_pct=float(row["FG3_PCT"]) if row["FG3_PCT"] is not None else 0.0,
                    free_throws_made=int(row["FTM"]) if row["FTM"] is not None else 0,
                    free_throws_attempted=int(row["FTA"]) if row["FTA"] is not None else 0,
                    free_throw_pct=float(row["FT_PCT"]) if row["FT_PCT"] is not None else 0.0,
                    offensive_rebounds=int(row["OREB"]) if row["OREB"] is not None else 0,
                    defensive_rebounds=int(row["DREB"]) if row["DREB"] is not None else 0,
                    total_rebounds=int(row["REB"]) if row["REB"] is not None else 0,
                    assists=int(row["AST"]) if row["AST"] is not None else 0,
                    steals=int(row["STL"]) if row["STL"] is not None else 0,
                    blocks=int(row["BLK"]) if row["BLK"] is not None else 0,
                    turnovers=int(row["TOV"]) if row["TOV"] is not None else 0,
                    personal_fouls=int(row["PF"]) if row["PF"] is not None else 0,
                    plus_minus=float(row["PLUS_MINUS"]) if row["PLUS_MINUS"] is not None else 0.0
                )
                games.append(game)
            except ValidationError as ve:
                print(f"Validation error for game {row['GAME_ID']}: {ve}")

        return ScheduleResponse(games=games)

    except ValidationError as ve:
        print(f"Validation Error: {ve.json()}")
        raise HTTPException(status_code=422, detail=f"Invalid schedule data format for season {season}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching season schedule: {e}")

def getTeamSchedule(team_id: int, season: str) -> ScheduleResponse:
    """Fetch all games for a specific team in a given NBA season."""
    try:
        # Fetch data from NBA API
        raw_schedule_data = {
            "season_nullable": season,
            "team_id_nullable": str(team_id),
            "league_id_nullable": "00"
        }
        game_finder = leaguegamefinder.LeagueGameFinder(**raw_schedule_data)
        df = game_finder.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No games found for team {team_id} in season {season}")

        # Handle NaN values by replacing them with None
        df.replace({np.nan: None}, inplace=True)

        # Convert DataFrame rows into Pydantic models
        games = []
        for _, row in df.iterrows():
            try:
                game = ScheduledGame(
                    season_id=int(row["SEASON_ID"]),
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM_ABBREVIATION"],
                    team_name=row["TEAM_NAME"],
                    game_id=row["GAME_ID"],
                    game_date=row["GAME_DATE"],
                    matchup=row["MATCHUP"],
                    win_loss=row["WL"] if row["WL"] is not None else None,  # Handle missing W/L
                    minutes=int(row["MIN"]) if row["MIN"] is not None else 0,
                    points=int(row["PTS"]) if row["PTS"] is not None else 0,
                    field_goals_made=int(row["FGM"]) if row["FGM"] is not None else 0,
                    field_goals_attempted=int(row["FGA"]) if row["FGA"] is not None else 0,
                    field_goal_pct=float(row["FG_PCT"]) if row["FG_PCT"] is not None else 0.0,
                    three_point_made=int(row["FG3M"]) if row["FG3M"] is not None else 0,
                    three_point_attempted=int(row["FG3A"]) if row["FG3A"] is not None else 0,
                    three_point_pct=float(row["FG3_PCT"]) if row["FG3_PCT"] is not None else 0.0,
                    free_throws_made=int(row["FTM"]) if row["FTM"] is not None else 0,
                    free_throws_attempted=int(row["FTA"]) if row["FTA"] is not None else 0,
                    free_throw_pct=float(row["FT_PCT"]) if row["FT_PCT"] is not None else 0.0,
                    offensive_rebounds=int(row["OREB"]) if row["OREB"] is not None else 0,
                    defensive_rebounds=int(row["DREB"]) if row["DREB"] is not None else 0,
                    total_rebounds=int(row["REB"]) if row["REB"] is not None else 0,
                    assists=int(row["AST"]) if row["AST"] is not None else 0,
                    steals=int(row["STL"]) if row["STL"] is not None else 0,
                    blocks=int(row["BLK"]) if row["BLK"] is not None else 0,
                    turnovers=int(row["TOV"]) if row["TOV"] is not None else 0,
                    personal_fouls=int(row["PF"]) if row["PF"] is not None else 0,
                    plus_minus=float(row["PLUS_MINUS"]) if row["PLUS_MINUS"] is not None else 0.0
                )
                games.append(game)
            except ValidationError as ve:
                print(f"Validation error for game {row['GAME_ID']}: {ve}")

        return ScheduleResponse(games=games)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team schedule: {e}")
    
from datetime import datetime

def getTeamGamesByDate(team_id: int, game_date: str) -> ScheduleResponse:
    """Retrieve all games played by a specific team on a given date."""
    try:
        # Convert date from "YYYY-MM-DD" to "MM/DD/YYYY"
        formatted_date = datetime.strptime(game_date, "%Y-%m-%d").strftime("%m/%d/%Y")

        # Fetch data from NBA API
        game_finder = leaguegamefinder.LeagueGameFinder(
            date_from_nullable=formatted_date,
            date_to_nullable=formatted_date,
            team_id_nullable=team_id,
            league_id_nullable="00"
        )

        df_list = game_finder.get_data_frames()
        
        if not df_list or len(df_list) == 0 or df_list[0].empty:
            raise HTTPException(status_code=404, detail=f"No games found for team ID {team_id} on date {game_date}")

        df = df_list[0]
        df.replace({np.nan: None}, inplace=True)

        games = []
        for _, row in df.iterrows():
            try:
                game = ScheduledGame(
                    season_id=int(row["SEASON_ID"]),
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM_ABBREVIATION"],
                    team_name=row["TEAM_NAME"],
                    game_id=row["GAME_ID"],
                    game_date=row["GAME_DATE"],
                    matchup=row["MATCHUP"],
                    win_loss=row["WL"],
                    minutes=int(row["MIN"]) if row["MIN"] is not None else 0,
                    points=int(row["PTS"]) if row["PTS"] is not None else 0,
                    field_goals_made=int(row["FGM"]) if row["FGM"] is not None else 0,
                    field_goals_attempted=int(row["FGA"]) if row["FGA"] is not None else 0,
                    field_goal_pct=float(row["FG_PCT"]) if row["FG_PCT"] is not None else 0.0,
                    three_point_made=int(row["FG3M"]) if row["FG3M"] is not None else 0,
                    three_point_attempted=int(row["FG3A"]) if row["FG3A"] is not None else 0,
                    three_point_pct=float(row["FG3_PCT"]) if row["FG3_PCT"] is not None else 0.0,
                    free_throws_made=int(row["FTM"]) if row["FTM"] is not None else 0,
                    free_throws_attempted=int(row["FTA"]) if row["FTA"] is not None else 0,
                    free_throw_pct=float(row["FT_PCT"]) if row["FT_PCT"] is not None else 0.0,
                    offensive_rebounds=int(row["OREB"]) if row["OREB"] is not None else 0,
                    defensive_rebounds=int(row["DREB"]) if row["DREB"] is not None else 0,
                    total_rebounds=int(row["REB"]) if row["REB"] is not None else 0,
                    assists=int(row["AST"]) if row["AST"] is not None else 0,
                    steals=int(row["STL"]) if row["STL"] is not None else 0,
                    blocks=int(row["BLK"]) if row["BLK"] is not None else 0,
                    turnovers=int(row["TOV"]) if row["TOV"] is not None else 0,
                    personal_fouls=int(row["PF"]) if row["PF"] is not None else 0,
                    plus_minus=float(row["PLUS_MINUS"]) if row["PLUS_MINUS"] is not None else 0.0
                )
                games.append(game)
            except Exception as ve:
                print(f"Validation error for game {row['GAME_ID']}: {ve}")

        return ScheduleResponse(games=games)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team games for team ID {team_id} on date {game_date}: {e}")

def getMatchupGames(team1_id: int, team2_id: int) -> ScheduleResponse:
    """Fetch past games where two teams played against each other."""
    try:
        raw_schedule_data = {
            "team_id_nullable": str(team1_id),
            "vs_team_id_nullable": str(team2_id),
            "league_id_nullable": "00"
        }

        game_finder = leaguegamefinder.LeagueGameFinder(**raw_schedule_data)
        df = game_finder.get_data_frames()[0]

        # Fix NaN values
        df.replace({np.nan: None}, inplace=True)

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No matchups found between {team1_id} and {team2_id}")

        games = []
        for _, row in df.iterrows():
            try:
                game = ScheduledGame(
                    season_id=int(row["SEASON_ID"]),
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM_ABBREVIATION"],
                    team_name=row["TEAM_NAME"],
                    game_id=row["GAME_ID"],
                    game_date=row["GAME_DATE"],
                    matchup=row["MATCHUP"],
                    win_loss=row["WL"],
                    minutes=int(row["MIN"]) if row["MIN"] is not None else 0,
                    points=int(row["PTS"]) if row["PTS"] is not None else 0,
                    field_goals_made=int(row["FGM"]) if row["FGM"] is not None else 0,
                    field_goals_attempted=int(row["FGA"]) if row["FGA"] is not None else 0,
                    field_goal_pct=float(row["FG_PCT"]) if row["FG_PCT"] is not None else 0.0,
                    three_point_made=int(row["FG3M"]) if row["FG3M"] is not None else 0,
                    three_point_attempted=int(row["FG3A"]) if row["FG3A"] is not None else 0,
                    three_point_pct=float(row["FG3_PCT"]) if row["FG3_PCT"] is not None else 0.0,
                    free_throws_made=int(row["FTM"]) if row["FTM"] is not None else 0,
                    free_throws_attempted=int(row["FTA"]) if row["FTA"] is not None else 0,
                    free_throw_pct=float(row["FT_PCT"]) if row["FT_PCT"] is not None else 0.0,
                    offensive_rebounds=int(row["OREB"]) if row["OREB"] is not None else 0,
                    defensive_rebounds=int(row["DREB"]) if row["DREB"] is not None else 0,
                    total_rebounds=int(row["REB"]) if row["REB"] is not None else 0,
                    assists=int(row["AST"]) if row["AST"] is not None else 0,
                    steals=int(row["STL"]) if row["STL"] is not None else 0,
                    blocks=int(row["BLK"]) if row["BLK"] is not None else 0,
                    turnovers=int(row["TOV"]) if row["TOV"] is not None else 0,
                    personal_fouls=int(row["PF"]) if row["PF"] is not None else 0,
                    plus_minus=float(row["PLUS_MINUS"]) if row["PLUS_MINUS"] is not None else 0.0
                )
                games.append(game)

            except ValidationError as ve:
                print(f"Validation error for game {row['GAME_ID']}: {ve}")

        return ScheduleResponse(games=games)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching matchup games: {e}")
    

def getTeamInfo(team_id: int) -> ScheduleResponse:
    """Fetch and validate team information and schedule from NBA API using LeagueGameFinder."""
    try:
        raw_schedule_data = {
            "team_id_nullable": str(team_id),
            "league_id_nullable": "00"
        }

        game_finder = leaguegamefinder.LeagueGameFinder(**raw_schedule_data)
        df = game_finder.get_data_frames()[0]

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for team ID {team_id}")

        # Fix NaN values
        df.replace({np.nan: None}, inplace=True)

        games = []
        for _, row in df.iterrows():
            try:
                game = ScheduledGame(
                    season_id=int(row["SEASON_ID"]),
                    team_id=int(row["TEAM_ID"]),
                    team_abbreviation=row["TEAM_ABBREVIATION"],
                    team_name=row["TEAM_NAME"],
                    game_id=row["GAME_ID"],
                    game_date=row["GAME_DATE"],
                    matchup=row["MATCHUP"],
                    win_loss=row["WL"],
                    minutes=int(row["MIN"]) if row["MIN"] is not None else 0,
                    points=int(row["PTS"]) if row["PTS"] is not None else 0,
                    field_goals_made=int(row["FGM"]) if row["FGM"] is not None else 0,
                    field_goals_attempted=int(row["FGA"]) if row["FGA"] is not None else 0,
                    field_goal_pct=float(row["FG_PCT"]) if row["FG_PCT"] is not None else 0.0,
                    three_point_made=int(row["FG3M"]) if row["FG3M"] is not None else 0,
                    three_point_attempted=int(row["FG3A"]) if row["FG3A"] is not None else 0,
                    three_point_pct=float(row["FG3_PCT"]) if row["FG3_PCT"] is not None else 0.0,
                    free_throws_made=int(row["FTM"]) if row["FTM"] is not None else 0,
                    free_throws_attempted=int(row["FTA"]) if row["FTA"] is not None else 0,
                    free_throw_pct=float(row["FT_PCT"]) if row["FT_PCT"] is not None else 0.0,
                    offensive_rebounds=int(row["OREB"]) if row["OREB"] is not None else 0,
                    defensive_rebounds=int(row["DREB"]) if row["DREB"] is not None else 0,
                    total_rebounds=int(row["REB"]) if row["REB"] is not None else 0,
                    assists=int(row["AST"]) if row["AST"] is not None else 0,
                    steals=int(row["STL"]) if row["STL"] is not None else 0,
                    blocks=int(row["BLK"]) if row["BLK"] is not None else 0,
                    turnovers=int(row["TOV"]) if row["TOV"] is not None else 0,
                    personal_fouls=int(row["PF"]) if row["PF"] is not None else 0,
                    plus_minus=float(row["PLUS_MINUS"])
                )
                games.append(game)

            except ValidationError as ve:
                print(f"Validation error for game {row['GAME_ID']}: {ve}")

        return ScheduleResponse(season="N/A", games=games)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team info: {e}")
    
def getTeamDetails(team_id: int) -> TeamDetails:
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
    """Fetch the full roster and extract only the Head Coach from NBA API."""
    try:
        # Fetch roster & coaching staff
        raw_roster = commonteamroster.CommonTeamRoster(team_id=team_id, season=season).get_dict()
        player_data = raw_roster["resultSets"][0]["rowSet"]
        coach_data = raw_roster["resultSets"][1]["rowSet"]

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

        # Convert coach data to schema, filter only head coach and remove assistants
        head_coach = next(
            (
                Coach(
                    coach_id=int(dict(zip(raw_roster["resultSets"][1]["headers"], coach))["COACH_ID"]),
                    name=f"{dict(zip(raw_roster['resultSets'][1]['headers'],
                    coach))['FIRST_NAME']} {dict(zip(raw_roster['resultSets'][1]['headers'],
                    coach))['LAST_NAME']}",
                    role=dict(zip(raw_roster["resultSets"][1]["headers"], coach))["COACH_TYPE"],
                    is_assistant=False
                )
                for coach in coach_data if dict(zip(raw_roster["resultSets"][1]["headers"], coach))["COACH_TYPE"] == "Head Coach"
            ),
            None
        )

        # Return schema with only the Head Coach, remove assistant coaches
        return TeamRoster(
            team_id=team_id,
            team_name=player_data[0][1],
            season=season,
            players=players,
            coaches=[head_coach]
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
