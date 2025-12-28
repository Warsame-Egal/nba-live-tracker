import asyncio
import logging
from typing import List

from fastapi import HTTPException
from nba_api.live.nba.endpoints import boxscore, playbyplay, scoreboard
from nba_api.stats.endpoints import commonteamroster

from app.schemas.player import Player, TeamRoster
from app.schemas.coach import Coach
from app.schemas.scoreboard import (
    BoxScoreResponse,
    GameLeaders,
    PlayerStats,
    LiveGame,
    PlayByPlayEvent,
    PlayByPlayResponse,
    PlayerBoxScoreStats,
    Scoreboard,
    ScoreboardResponse,
    Team,
    TeamBoxScoreStats,
)

# Set up logger for this file
logger = logging.getLogger(__name__)


async def fetch_nba_scoreboard():
    """
    Get the raw scoreboard data from the NBA API.
    
    Returns:
        dict: Raw scoreboard data with all game information
    """
    try:
        # Call the NBA API to get current scores
        board = await asyncio.to_thread(lambda: scoreboard.ScoreBoard().get_dict())
        return board.get("scoreboard", {})
    except Exception as e:
        logger.error(f"Error fetching scoreboard from NBA API: {e}")
        return {}


def extract_team_data(team_data):
    """
    Take raw team data from the API and convert it to our Team format.
    
    Args:
        team_data: Raw team data from NBA API
        
    Returns:
        Team: Clean team data in our format
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
    Get the top player stats for both teams (who scored the most points, etc.).
    
    Args:
        game_leaders_data: Raw game leaders data from NBA API
        
    Returns:
        GameLeaders: Top players for home and away teams
    """
    if not game_leaders_data:
        return None

    def extract_player(leader_data):
        """
        Helper function to safely get player stats.
        Returns None if there's no data.
        """
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

    # Get top players for both teams
    home_leader = extract_player(game_leaders_data.get("homeLeaders"))
    away_leader = extract_player(game_leaders_data.get("awayLeaders"))

    return GameLeaders(homeLeaders=home_leader, awayLeaders=away_leader)


async def getScoreboard() -> ScoreboardResponse:
    """
    Get the latest NBA scores and return them in a clean format.
    
    Returns:
        ScoreboardResponse: All current games with scores and team info
        
    Raises:
        HTTPException: If we can't get the data from NBA API
    """
    try:
        # Get raw data from NBA API
        raw_scoreboard_data = await fetch_nba_scoreboard()
        if not raw_scoreboard_data:
            raise ValueError("Received empty scoreboard data from NBA API")

        # Get the date and list of games
        game_date = raw_scoreboard_data.get("gameDate", "Unknown Date")
        raw_games = raw_scoreboard_data.get("games", [])

        games = []
        # Process each game
        for game in raw_games:
            try:
                # Extract team data for home and away teams
                home_team = extract_team_data(game["homeTeam"])
                away_team = extract_team_data(game["awayTeam"])
                # Get the top players for this game
                game_leaders = extract_game_leaders(game.get("gameLeaders", {}))

                # Create a LiveGame object with all the game info
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
                )

                games.append(live_game)
            except KeyError as e:
                # If a game is missing required data, skip it and log a warning
                logger.warning(f"Missing required data in game, skipping: {e}")

        return ScoreboardResponse(scoreboard=Scoreboard(gameDate=game_date, games=games))
    except Exception as e:
        logger.error(f"Error fetching live scoreboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching live scores: {e}")


async def fetchTeamRoster(team_id: int, season: str) -> TeamRoster:
    """
    Get the full team roster (all players and coaches) for a team.
    
    Args:
        team_id: The NBA team ID (like 1610612737 for Lakers)
        season: The season year like "2024-25"
        
    Returns:
        TeamRoster: All players and coaches on the team
        
    Raises:
        HTTPException: If team not found or API error
    """
    try:
        # Get roster data from NBA API
        raw_roster = await asyncio.to_thread(
            lambda: commonteamroster.CommonTeamRoster(team_id=team_id, season=season).get_dict()
        )
        player_data = raw_roster["resultSets"][0]["rowSet"]

        # Try to get coach information if available
        coaches: List[Coach] = []
        try:
            coaches_set = [r for r in raw_roster["resultSets"] if r["name"] == "Coaches"][0]
            coach_headers = coaches_set["headers"]
            for row in coaches_set["rowSet"]:
                coach_dict = dict(zip(coach_headers, row))
                coaches.append(
                    Coach(
                        coach_id=int(coach_dict["COACH_ID"]),
                        name=coach_dict["COACH_NAME"],
                        role=coach_dict["COACH_TYPE"],
                        is_assistant=bool(coach_dict["IS_ASSISTANT"]),
                    )
                )
        except (KeyError, IndexError):
            # If no coach data, that's okay - just use empty list
            coaches = []

        if not player_data:
            raise HTTPException(
                status_code=404,
                detail=f"No roster found for team ID {team_id} in {season}",
            )

        # Get the column names so we can map the data correctly
        column_names = raw_roster["resultSets"][0]["headers"]

        # Convert raw player data into Player objects
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
                    ),
                    school=player_dict["SCHOOL"] or None,
                )
            )

        # Return the complete roster
        return TeamRoster(
            team_id=team_id,
            team_name=player_data[0][1],  # Team name is in the second column
            season=season,
            players=players,
            coaches=coaches,
        )

    except Exception as e:
        logger.error(f"Error fetching team roster for team {team_id}, season {season}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching team roster: {e}")


async def getBoxScore(game_id: str) -> BoxScoreResponse:
    """
    Get the full box score (detailed stats) for a specific game.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        BoxScoreResponse: Complete stats for both teams and all players
        
    Raises:
        HTTPException: If game not found or API error
    """
    try:
        # Get box score data from NBA API
        game_data = await asyncio.to_thread(lambda: boxscore.BoxScore(game_id).get_dict())

        if "game" not in game_data:
            raise HTTPException(status_code=404, detail=f"No box score available for game ID {game_id}")

        # Extract game information
        game_info = game_data["game"]
        home_team = game_info["homeTeam"]
        away_team = game_info["awayTeam"]

        # Build the response with all the stats
        return BoxScoreResponse(
            game_id=game_info["gameId"],
            status=game_info["gameStatusText"],
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
                        position=player.get("position", "N/A"),
                        minutes=player["statistics"].get("minutesCalculated", "N/A"),
                        points=player["statistics"].get("points", 0),
                        rebounds=player["statistics"].get("reboundsTotal", 0),
                        assists=player["statistics"].get("assists", 0),
                        steals=player["statistics"].get("steals", 0),
                        blocks=player["statistics"].get("blocks", 0),
                        turnovers=player["statistics"].get("turnovers", 0),
                    )
                    for player in home_team.get("players", [])
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving box score for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving box score: {str(e)}")


async def getPlayByPlay(game_id: str) -> PlayByPlayResponse:
    """
    Get the play-by-play (all game events) for a specific game.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        PlayByPlayResponse: List of all plays/events that happened in the game
        
    Raises:
        HTTPException: If game not found or API error
    """
    try:
        # Get play-by-play data from NBA API
        play_by_play_data = await asyncio.to_thread(lambda: playbyplay.PlayByPlay(game_id).get_dict())

        if "game" not in play_by_play_data or "actions" not in play_by_play_data["game"]:
            raise HTTPException(
                status_code=404,
                detail=f"No play-by-play data available for game ID {game_id}",
            )

        # Get all the game actions (shots, fouls, timeouts, etc.)
        actions = play_by_play_data["game"]["actions"]

        # Convert each action into our PlayByPlayEvent format
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

        # Return all the plays
        return PlayByPlayResponse(game_id=game_id, plays=plays)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving play-by-play for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving play-by-play: {str(e)}")
