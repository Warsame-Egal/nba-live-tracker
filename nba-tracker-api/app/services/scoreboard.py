from typing import List

import asyncio
from fastapi import HTTPException
from nba_api.live.nba.endpoints import boxscore, playbyplay, scoreboard
from nba_api.stats.endpoints import commonteamroster, leaguestandingsv3, playerindex
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta

from app.schemas.player import Player, PlayerSummary, TeamRoster
from app.schemas.scoreboard import (
    BoxScoreResponse,
    GameLeaders,
    GameLeadersResponse,
    LiveGame,
    PlayByPlayEvent,
    PlayByPlayResponse,
    PlayerBoxScoreStats,
    PlayerStats,
    Scoreboard,
    ScoreboardResponse,
    Team,
    TeamBoxScoreStats,
    TeamGameStatsResponse,
)
from app.schemas.team import TeamDetails
from datetime import date
from app.models import ScoreboardSnapshot, ScoreboardGame, BoxScoreCache
from app.schemas.scoreboard_game_db import ScoreboardGameDB


def get_current_season(today: date | None = None) -> str:
    """Return the NBA season string for ``today``.

    The NBA season spans from October of one year through June of the next. This
    helper gets the correct season identifier (e.g. ``"2024-25"``) for any
    given date.
    """

    today = today or date.today()
    # Season rolls over on October 1st
    if today.month >= 10:
        start_year = today.year
    else:
        start_year = today.year - 1

    end_year = (start_year + 1) % 100
    return f"{start_year}-{end_year:02d}"


async def fetch_nba_scoreboard():
    """
    Fetches raw NBA scoreboard data from the NBA API.

    Returns:
        dict: Raw scoreboard data containing game details.
    """
    try:
        board = await asyncio.to_thread(lambda: scoreboard.ScoreBoard().get_dict())
        return board.get("scoreboard", {})  # Extract only the scoreboard section
    except Exception as e:
        print(f"Error fetching NBA scoreboard: {e}")
        return {}  # Return an empty dict to avoid crashes


def extract_team_data(team_data):
    """
    Extracts relevant team details from the API response.

    Args:
        team_data (dict): Raw team data from the API.

    Returns:
        Team: Processed team information.
    """
    return Team(
        teamId=team_data["teamId"],
        teamName=team_data["teamName"],
        teamCity=team_data["teamCity"],
        teamTricode=team_data["teamTricode"],
        wins=team_data.get("wins", 0),
        losses=team_data.get("losses", 0),
        score=team_data.get("score", 0),
        timeoutsRemaining=team_data.get("timeoutsRemaining", 0),
    )


def extract_game_leaders(game_leaders_data):
    """
    Extracts the top players' statistics for both home and away teams.

    Args:
        game_leaders_data (dict): Raw game leaders data from the API.

    Returns:
        GameLeaders: Structured player stats for home and away teams.
    """
    if not game_leaders_data:
        return None

    def extract_player(leader_data):
        """Helper function to safely extract player stats."""
        if not leader_data:
            return None
        return PlayerStats(
            personId=leader_data.get("personId"),
            name=leader_data.get("name", "Unknown"),
            jerseyNum=leader_data.get("jerseyNum", "N/A"),
            position=leader_data.get("position", "N/A"),
            teamTricode=leader_data.get("teamTricode", ""),
            points=leader_data.get("points", 0),
            rebounds=leader_data.get("rebounds", 0),
            assists=leader_data.get("assists", 0),
        )

    home_leader = extract_player(game_leaders_data.get("homeLeaders"))
    away_leader = extract_player(game_leaders_data.get("awayLeaders"))

    return GameLeaders(homeLeaders=home_leader, awayLeaders=away_leader)


async def getScoreboard(db: AsyncSession) -> ScoreboardResponse:
    """
    Fetches the latest NBA scoreboard, processes it, and returns structured data.

    Returns:
        ScoreboardResponse: Structured scoreboard data with team and game details.

    Raises:
        HTTPException: If there is an error fetching or processing the data.
    """
    try:
        # Check if we recently fetched a scoreboard snapshot (within 60 seconds)
        stmt = select(ScoreboardSnapshot).order_by(ScoreboardSnapshot.id.desc()).limit(1)
        result = await db.execute(stmt)
        latest: ScoreboardSnapshot | None = result.scalar_one_or_none()

        if latest and (datetime.utcnow() - latest.fetched_at) < timedelta(seconds=60):
            return ScoreboardResponse.model_validate_json(latest.data)

        raw_scoreboard_data = await fetch_nba_scoreboard()
        if not raw_scoreboard_data:
            raise ValueError("Received empty scoreboard data.")

        game_date = raw_scoreboard_data.get("gameDate", "Unknown Date")
        raw_games = raw_scoreboard_data.get("games", [])

        games = []
        for game in raw_games:
            try:
                home_team = extract_team_data(game["homeTeam"])
                away_team = extract_team_data(game["awayTeam"])
                game_leaders = extract_game_leaders(game.get("gameLeaders", {}))

                live_game = LiveGame(
                    gameId=game["gameId"],
                    gameStatus=game["gameStatus"],
                    gameStatusText=game["gameStatusText"].strip(),
                    period=game["period"],
                    gameClock=game.get("gameClock", ""),
                    gameTimeUTC=game["gameTimeUTC"],
                    homeTeam=home_team,
                    awayTeam=away_team,
                    gameLeaders=game_leaders,
                    pbOdds=None,  # Set this to None as a placeholder for future updates
                )

                games.append(live_game)
             
                # Persist or update scoreboard game entry
                stmt = select(ScoreboardGame).where(
                    ScoreboardGame.gameId == game["gameId"],
                    ScoreboardGame.gameDate == game_date,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                values = {
                    "gameDate": game_date,
                    "gameId": game["gameId"],
                    "gameStatus": game["gameStatus"],
                    "gameStatusText": game["gameStatusText"],
                    "period": game["period"],
                    "gameClock": game.get("gameClock"),
                    "gameTimeUTC": game["gameTimeUTC"],
                    "homeTeam_teamId": home_team.teamId,
                    "homeTeam_teamName": home_team.teamName,
                    "homeTeam_teamCity": home_team.teamCity,
                    "homeTeam_teamTricode": home_team.teamTricode,
                    "homeTeam_wins": home_team.wins,
                    "homeTeam_losses": home_team.losses,
                    "homeTeam_score": home_team.score,
                    "homeTeam_timeoutsRemaining": home_team.timeoutsRemaining,
                    "awayTeam_teamId": away_team.teamId,
                    "awayTeam_teamName": away_team.teamName,
                    "awayTeam_teamCity": away_team.teamCity,
                    "awayTeam_teamTricode": away_team.teamTricode,
                    "awayTeam_wins": away_team.wins,
                    "awayTeam_losses": away_team.losses,
                    "awayTeam_score": away_team.score,
                    "awayTeam_timeoutsRemaining": away_team.timeoutsRemaining,
                    "homeLeader_personId": (
                        game_leaders.homeLeaders.personId if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_name": (
                        game_leaders.homeLeaders.name if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_jerseyNum": (
                        game_leaders.homeLeaders.jerseyNum if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_position": (
                        game_leaders.homeLeaders.position if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_teamTricode": (
                        game_leaders.homeLeaders.teamTricode if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_points": (
                        game_leaders.homeLeaders.points if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_rebounds": (
                        game_leaders.homeLeaders.rebounds if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "homeLeader_assists": (
                        game_leaders.homeLeaders.assists if game_leaders and game_leaders.homeLeaders else None
                    ),
                    "awayLeader_personId": (
                        game_leaders.awayLeaders.personId if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_name": (
                        game_leaders.awayLeaders.name if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_jerseyNum": (
                        game_leaders.awayLeaders.jerseyNum if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_position": (
                        game_leaders.awayLeaders.position if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_teamTricode": (
                        game_leaders.awayLeaders.teamTricode if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_points": (
                        game_leaders.awayLeaders.points if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_rebounds": (
                        game_leaders.awayLeaders.rebounds if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "awayLeader_assists": (
                        game_leaders.awayLeaders.assists if game_leaders and game_leaders.awayLeaders else None
                    ),
                    "pbOdds_team": None,
                    "pbOdds_odds": None,
                    "pbOdds_suspended": None,
                }

                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                else:
                    db.add(ScoreboardGame(**values))
            except KeyError as e:
                print(f"Missing key in game data: {e}, skipping game.")

        response = ScoreboardResponse(scoreboard=Scoreboard(gameDate=game_date, games=games))

        # Persist new snapshot if data changed
        data_json = response.model_dump_json()
        if not latest or latest.data != data_json:
            db.add(
                ScoreboardSnapshot(
                    game_date=game_date,
                    fetched_at=datetime.utcnow(),
                    data=data_json,
                )
            )
            await db.commit()

        return response
    except Exception as e:
        print(f"Error fetching live scoreboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching live scores: {e}")

async def get_scoreboard_games(db: AsyncSession) -> List[ScoreboardGameDB]:
    """Return all stored scoreboard games."""
    result = await db.execute(select(ScoreboardGame))
    games = result.scalars().all()
    return [ScoreboardGameDB.model_validate(g) for g in games]


async def getCurrentTeamRecord(team_id: int) -> TeamDetails:
    """
    Fetches a team record in the current season.
    Args:
        team_id (int): Unique identifier for the NBA team.
    Returns:
        TeamDetails: Team ranking, win-loss record, and other performance stats.
    """
    try:
        raw_standings = await asyncio.to_thread(
            lambda: leaguestandingsv3.LeagueStandingsV3(
                league_id="00",
                season="2023-24",  # Always fetches the current season
                season_type="Regular Season",
            ).get_dict()
        )

        standings_data = raw_standings["resultSets"][0]["rowSet"]
        column_names = raw_standings["resultSets"][0]["headers"]

        # Find the specific team's data
        team_data = next((team for team in standings_data if team[2] == team_id), None)

        if not team_data:
            raise HTTPException(status_code=404, detail=f"No team details found for team ID {team_id}")

        # Convert data to dictionary for easy mapping
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
            current_streak=str(team_dict["CurrentStreak"]),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team standings: {e}")


async def fetchTeamRoster(team_id: int, season: str) -> TeamRoster:
    """
    Fetches the full team roster (players & coaching staff) from the NBA API.

    Args:
        team_id (int): The NBA team ID.
        season (str): The season year in "YYYY-YY" format.

    Returns:
        TeamRoster: A structured response containing team roster details.

    Raises:
        HTTPException:
            - 404 if no roster is found for the given team/season.
            - 500 for any other errors.
    """
    try:
        # Fetch roster data from NBA API
        raw_roster = await asyncio.to_thread(
            lambda: commonteamroster.CommonTeamRoster(team_id=team_id, season=season).get_dict()
        )
        player_data = raw_roster["resultSets"][0]["rowSet"]

        if not player_data:
            raise HTTPException(
                status_code=404,
                detail=f"No roster found for team ID {team_id} in {season}",
            )

        # Extract column headers for mapping
        column_names = raw_roster["resultSets"][0]["headers"]

        # Convert player data into structured Player objects
        players: List[Player] = []
        for row in player_data:
            player_dict = dict(zip(column_names, row))

            players.append(
                Player(
                    player_id=int(player_dict["PLAYER_ID"]),
                    name=player_dict["PLAYER"],
                    jersey_number=player_dict["NUM"] or None,
                    position=player_dict["POSITION"] or None,
                    height=player_dict["HEIGHT"] or None,
                    weight=(int(player_dict["WEIGHT"]) if player_dict["WEIGHT"] else None),
                    birth_date=player_dict["BIRTH_DATE"] or None,
                    age=int(player_dict["AGE"]) if player_dict["AGE"] else None,
                    experience=(
                        "Rookie" if str(player_dict["EXP"]).upper() == "R" else str(player_dict["EXP"])
                    ),  # Update 'R' to 'Rookie
                    school=player_dict["SCHOOL"] or None,
                )
            )

        # Return formatted response
        return TeamRoster(
            team_id=team_id,
            team_name=player_data[0][1],  # Extract team name
            season=season,
            players=players,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team roster: {e}")


async def fetchPlayersByName(name: str) -> List[PlayerSummary]:
    """
    Retrieves players matching the search query.

    Args:
        name (str): The player's full name, first name, or last name.

    Returns:
        List[PlayerSummary]: List of matching players.
    """
    try:
        # Fetch player data from NBA API
        raw_data = await asyncio.to_thread(lambda: playerindex.PlayerIndex().get_dict())
        column_names = raw_data["resultSets"][0]["headers"]
        player_list = raw_data["resultSets"][0]["rowSet"]

        # Convert player list to dictionary format
        players = [dict(zip(column_names, row)) for row in player_list]

        # Convert search query to lowercase for case-insensitive comparison
        name = name.lower()

        # Filter players by checking if query matches full name, first name, or
        # last name
        matching_players = [
            player
            for player in players
            if name in f"{player['PLAYER_FIRST_NAME']} {player['PLAYER_LAST_NAME']}".lower()
        ]

        if not matching_players:
            raise HTTPException(status_code=404, detail=f"No players found matching '{name}'")

        # Process matching players into structured response
        return [
            PlayerSummary(
                player_id=player["PERSON_ID"],
                full_name=f"{player['PLAYER_FIRST_NAME']} {player['PLAYER_LAST_NAME']}",
                team_id=player.get("TEAM_ID"),
                team_name=player.get("TEAM_NAME"),
                team_abbreviation=player.get("TEAM_ABBREVIATION"),
                jersey_number=player.get("JERSEY_NUMBER"),
                position=player.get("POSITION"),
                height=player.get("HEIGHT"),
                weight=int(player["WEIGHT"]) if player.get("WEIGHT") else None,
                college=player.get("COLLEGE"),
                country=player.get("COUNTRY"),
                from_year=int(player["FROM_YEAR"]) if player.get("FROM_YEAR") else None,
                to_year=int(player["TO_YEAR"]) if player.get("TO_YEAR") else None,
                points_per_game=float(player["PTS"]) if player.get("PTS") else None,
                rebounds_per_game=float(player["REB"]) if player.get("REB") else None,
                assists_per_game=float(player["AST"]) if player.get("AST") else None,
            )
            for player in matching_players
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching for players: {e}")


async def getBoxScore(game_id: str, db: AsyncSession | None = None) -> BoxScoreResponse:
    """
    Fetch the full box score for a given NBA game.

    Args:
        game_id (str): Unique NBA game identifier.

    Returns:
        BoxScoreResponse: A structured response containing team and player stats.
    """
    try:
        if db:
            stmt = select(BoxScoreCache).where(BoxScoreCache.game_id == game_id)
            result = await db.execute(stmt)
            cached = result.scalar_one_or_none()
            if cached and (datetime.utcnow() - cached.fetched_at) < timedelta(seconds=60):
                return BoxScoreResponse.model_validate_json(cached.data)

        # Fetch box score data
        game_data = await asyncio.to_thread(lambda: boxscore.BoxScore(game_id).get_dict())

        if "game" not in game_data:
            raise HTTPException(status_code=404, detail=f"No box score available for game ID {game_id}")

        # Extract game details
        game_info = game_data["game"]
        home_team = game_info["homeTeam"]
        away_team = game_info["awayTeam"]

        # Construct response
        response = BoxScoreResponse(
            game_id=game_info["gameId"],
            status=game_info["gameStatusText"],  # Accept values like "Q3 2:50"
            home_team=TeamBoxScoreStats(
                team_id=home_team["teamId"],
                team_name=home_team["teamName"],
                score=home_team["score"],
                field_goal_pct=home_team["statistics"].get("fieldGoalsPercentage", 0.0),
                three_point_pct=home_team["statistics"].get("threePointersPercentage", 0.0),
                free_throw_pct=home_team["statistics"].get("freeThrowsPercentage", 0.0),
                rebounds_total=home_team["statistics"].get("reboundsTotal", 0),
                assists=home_team["statistics"].get("assists", 0),
                steals=home_team["statistics"].get("steals", 0),
                blocks=home_team["statistics"].get("blocks", 0),
                turnovers=home_team["statistics"].get("turnovers", 0),
                players=[
                    PlayerBoxScoreStats(
                        player_id=player["personId"],
                        name=player["name"],
                        position=player.get("position", "N/A"),  # Default to "N/A"
                        minutes=player["statistics"].get("minutesCalculated", "N/A"),
                        points=player["statistics"].get("points", 0),
                        rebounds=player["statistics"].get("reboundsTotal", 0),
                        assists=player["statistics"].get("assists", 0),
                        steals=player["statistics"].get("steals", 0),
                        blocks=player["statistics"].get("blocks", 0),
                        turnovers=player["statistics"].get("turnovers", 0),
                    )
                    for player in home_team.get("players", [])  # Handle missing "players"
                ],
            ),
            away_team=TeamBoxScoreStats(
                team_id=away_team["teamId"],
                team_name=away_team["teamName"],
                score=away_team["score"],
                field_goal_pct=away_team["statistics"].get("fieldGoalsPercentage", 0.0),
                three_point_pct=away_team["statistics"].get("threePointersPercentage", 0.0),
                free_throw_pct=away_team["statistics"].get("freeThrowsPercentage", 0.0),
                rebounds_total=away_team["statistics"].get("reboundsTotal", 0),
                assists=away_team["statistics"].get("assists", 0),
                steals=away_team["statistics"].get("steals", 0),
                blocks=away_team["statistics"].get("blocks", 0),
                turnovers=away_team["statistics"].get("turnovers", 0),
                players=[
                    PlayerBoxScoreStats(
                        player_id=player["personId"],
                        name=player["name"],
                        position=player.get("position", "N/A"),
                        minutes=player["statistics"].get("minutesCalculated", "N/A"),
                        points=player["statistics"].get("points", 0),
                        rebounds=player["statistics"].get("reboundsTotal", 0),
                        assists=player["statistics"].get("assists", 0),
                        steals=player["statistics"].get("steals", 0),
                        blocks=player["statistics"].get("blocks", 0),
                        turnovers=player["statistics"].get("turnovers", 0),
                    )
                    for player in away_team.get("players", [])
                ],
            ),
        )
        if db:
            data_json = response.model_dump_json()
            if cached:
                cached.data = data_json
                cached.fetched_at = datetime.utcnow()
            else:
                db.add(
                    BoxScoreCache(
                        game_id=game_id,
                        fetched_at=datetime.utcnow(),
                        data=data_json,
                    )
                )
            await db.commit()

        return response 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving box score: {str(e)}")


async def getTeamStats(game_id: str, team_id: int) -> TeamGameStatsResponse:
    """
    Fetch team statistics for a given NBA game.

    Args:
        game_id (str): Unique NBA game identifier.
        team_id (int): Unique team identifier.

    Returns:
        TeamGameStatsResponse: A structured response containing the team's stats.
    """
    try:
        # Fetch box score data
        game_data = await asyncio.to_thread(lambda: boxscore.BoxScore(game_id).get_dict())

        if "game" not in game_data:
            raise HTTPException(status_code=404, detail=f"No box score available for game ID {game_id}")

        # Extract game details
        game_info = game_data["game"]
        home_team = game_info["homeTeam"]
        away_team = game_info["awayTeam"]

        # Determine if the requested team is home or away
        if home_team["teamId"] == team_id:
            selected_team = home_team
        elif away_team["teamId"] == team_id:
            selected_team = away_team
        else:
            raise HTTPException(status_code=404, detail=f"Team ID {team_id} not found in game {game_id}")

        # Construct response
        return TeamGameStatsResponse(
            game_id=game_info["gameId"],
            team_id=selected_team["teamId"],
            team_name=selected_team["teamName"],
            score=selected_team["score"],
            field_goal_pct=selected_team["statistics"].get("fieldGoalsPercentage", 0.0),
            three_point_pct=selected_team["statistics"].get("threePointersPercentage", 0.0),
            free_throw_pct=selected_team["statistics"].get("freeThrowsPercentage", 0.0),
            rebounds_total=selected_team["statistics"].get("reboundsTotal", 0),
            assists=selected_team["statistics"].get("assists", 0),
            steals=selected_team["statistics"].get("steals", 0),
            blocks=selected_team["statistics"].get("blocks", 0),
            turnovers=selected_team["statistics"].get("turnovers", 0),
            players=[
                PlayerBoxScoreStats(
                    player_id=player["personId"],
                    name=player["name"],
                    position=player.get("position", "N/A"),
                    minutes=player["statistics"].get("minutesCalculated", "N/A"),
                    points=player["statistics"].get("points", 0),
                    rebounds=player["statistics"].get("reboundsTotal", 0),
                    assists=player["statistics"].get("assists", 0),
                    steals=player["statistics"].get("steals", 0),
                    blocks=player["statistics"].get("blocks", 0),
                    turnovers=player["statistics"].get("turnovers", 0),
                )
                for player in selected_team.get("players", [])
            ],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving team stats: {str(e)}")


async def getGameLeaders(game_id: str) -> GameLeadersResponse:
    """
    Fetch top-performing players (leaders) for a given NBA game.

    Args:
        game_id (str): Unique NBA game identifier.

    Returns:
        GameLeadersResponse: A structured response containing the top players in points, assists, and rebounds.
    """
    try:
        # Fetch box score data
        game_data = await asyncio.to_thread(lambda: boxscore.BoxScore(game_id).get_dict())

        if "game" not in game_data:
            raise HTTPException(status_code=404, detail=f"No box score available for game ID {game_id}")

        # Extract game details
        game_info = game_data["game"]
        home_team = game_info["homeTeam"]
        away_team = game_info["awayTeam"]

        # Combine both teams' players into one list
        all_players = home_team["players"] + away_team["players"]

        # Find the leaders in points, assists, and rebounds
        points_leader = max(all_players, key=lambda p: p["statistics"].get("points", 0))
        assists_leader = max(all_players, key=lambda p: p["statistics"].get("assists", 0))
        rebounds_leader = max(all_players, key=lambda p: p["statistics"].get("reboundsTotal", 0))

        # Construct response
        return GameLeadersResponse(
            game_id=game_info["gameId"],
            points_leader=PlayerBoxScoreStats(
                player_id=points_leader["personId"],
                name=points_leader["name"],
                position=points_leader.get("position", "N/A"),
                minutes=points_leader["statistics"].get("minutesCalculated", "N/A"),
                points=points_leader["statistics"].get("points", 0),
                rebounds=points_leader["statistics"].get("reboundsTotal", 0),
                assists=points_leader["statistics"].get("assists", 0),
                steals=points_leader["statistics"].get("steals", 0),
                blocks=points_leader["statistics"].get("blocks", 0),
                turnovers=points_leader["statistics"].get("turnovers", 0),
            ),
            assists_leader=PlayerBoxScoreStats(
                player_id=assists_leader["personId"],
                name=assists_leader["name"],
                position=assists_leader.get("position", "N/A"),
                minutes=assists_leader["statistics"].get("minutesCalculated", "N/A"),
                points=assists_leader["statistics"].get("points", 0),
                rebounds=assists_leader["statistics"].get("reboundsTotal", 0),
                assists=assists_leader["statistics"].get("assists", 0),
                steals=assists_leader["statistics"].get("steals", 0),
                blocks=assists_leader["statistics"].get("blocks", 0),
                turnovers=assists_leader["statistics"].get("turnovers", 0),
            ),
            rebounds_leader=PlayerBoxScoreStats(
                player_id=rebounds_leader["personId"],
                name=rebounds_leader["name"],
                position=rebounds_leader.get("position", "N/A"),
                minutes=rebounds_leader["statistics"].get("minutesCalculated", "N/A"),
                points=rebounds_leader["statistics"].get("points", 0),
                rebounds=rebounds_leader["statistics"].get("reboundsTotal", 0),
                assists=rebounds_leader["statistics"].get("assists", 0),
                steals=rebounds_leader["statistics"].get("steals", 0),
                blocks=rebounds_leader["statistics"].get("blocks", 0),
                turnovers=rebounds_leader["statistics"].get("turnovers", 0),
            ),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving game leaders: {str(e)}",
        )


async def getPlayByPlay(game_id: str) -> PlayByPlayResponse:
    """
    Fetch real-time play-by-play breakdown for a given NBA game.

    Args:
        game_id (str): Unique NBA game identifier.

    Returns:
        PlayByPlayResponse: A structured response containing a list of plays.
    """
    try:
        # Fetch play-by-play data
        play_by_play_data = await asyncio.to_thread(lambda: playbyplay.PlayByPlay(game_id).get_dict())

        if "game" not in play_by_play_data or "actions" not in play_by_play_data["game"]:
            raise HTTPException(
                status_code=404,
                detail=f"No play-by-play data available for game ID {game_id}",
            )

        # Extract game details
        actions = play_by_play_data["game"]["actions"]

        # Process play-by-play events
        plays = [
            PlayByPlayEvent(
                action_number=action["actionNumber"],
                clock=action["clock"],
                period=action["period"],
                team_id=action.get("teamId"),
                team_tricode=action.get("teamTricode"),
                action_type=action["actionType"],
                description=action["description"],
                player_id=action.get("personId"),
                player_name=action.get("playerName"),
                score_home=action.get("scoreHome"),
                score_away=action.get("scoreAway"),
            )
            for action in actions
        ]

        # Construct response
        return PlayByPlayResponse(game_id=game_id, plays=plays)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving play-by-play: {str(e)}")
