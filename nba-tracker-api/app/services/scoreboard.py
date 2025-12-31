import asyncio
import logging
import re
from typing import List

from fastapi import HTTPException
from nba_api.live.nba.endpoints import boxscore, playbyplay, scoreboard
from nba_api.stats.endpoints import commonteamroster, playerindex
from nba_api.stats.library.parameters import HistoricalNullable

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
from app.config import get_api_kwargs

# Set up logger for this file
logger = logging.getLogger(__name__)

# Cache for player season averages to avoid repeated API calls
_player_stats_cache = {}


async def get_player_season_averages(player_id: int) -> dict:
    """
    Get season averages for a player from the player index.
    Returns a dict with PTS, REB, AST averages.
    """
    if player_id in _player_stats_cache:
        return _player_stats_cache[player_id]
    
    try:
        # Get player index data
        api_kwargs = get_api_kwargs()
        player_index_data = await asyncio.to_thread(
            lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
        )
        player_index_df = player_index_data.get_data_frames()[0]
        
        # Find the player
        player_row = player_index_df[player_index_df["PERSON_ID"] == player_id]
        
        if not player_row.empty:
            player_data = player_row.iloc[0].to_dict()
            stats = {
                "PTS": player_data.get("PTS", 0.0) or 0.0,
                "REB": player_data.get("REB", 0.0) or 0.0,
                "AST": player_data.get("AST", 0.0) or 0.0,
                "JERSEY_NUMBER": player_data.get("JERSEY_NUMBER"),
                "POSITION": player_data.get("POSITION"),
            }
            _player_stats_cache[player_id] = stats
            return stats
    except Exception as e:
        logger.warning(f"Error fetching season averages for player {player_id}: {e}")
    
    return {"PTS": 0.0, "REB": 0.0, "AST": 0.0, "JERSEY_NUMBER": None, "POSITION": None}


async def fetch_nba_scoreboard():
    """
    Get the raw scoreboard data from the NBA API.
    
    Returns:
        dict: Raw scoreboard data with all game information
    """
    try:
        # Call the NBA API to get current scores
        api_kwargs = get_api_kwargs()
        board = await asyncio.to_thread(lambda: scoreboard.ScoreBoard(**api_kwargs).get_dict())
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


async def extract_game_leaders(game_leaders_data, home_team_id=None, away_team_id=None, game_status_text=None):
    """
    Get the top player stats for both teams.
    For live games: uses current game stats (points, rebounds, assists in this game).
    For upcoming games: uses season averages (PPG, RPG, APG).
    
    Args:
        game_leaders_data: Raw game leaders data from NBA API
        home_team_id: Home team ID (optional, for fallback if no leaders)
        away_team_id: Away team ID (optional, for fallback if no leaders)
        game_status_text: Game status text to determine if game is live
        
    Returns:
        GameLeaders: Top players for home and away teams
    """
    if not game_leaders_data:
        return None

    # Check if game is live (has started and is in progress)
    is_live = game_status_text and (
        'live' in game_status_text.lower() or 
        bool(re.search(r'\b[1-4]q\b', game_status_text, re.IGNORECASE)) or
        ('ot' in game_status_text.lower() and 'final' not in game_status_text.lower())
    )

    async def extract_player(leader_data, use_game_stats=False):
        """
        Helper function to safely get player stats.
        Returns None if there's no data.
        
        Args:
            leader_data: Raw leader data from NBA API
            use_game_stats: If True, use current game stats; if False, use season averages
        """
        if not leader_data:
            return None
        
        person_id = leader_data.get("personId")
        if not person_id or person_id == 0:
            return None
        
        if use_game_stats:
            # For live games, use current game stats from the API
            points = float(leader_data.get("points", 0))
            rebounds = float(leader_data.get("rebounds", 0))
            assists = float(leader_data.get("assists", 0))
            
            # Skip if no game stats (game just started)
            if points == 0 and rebounds == 0 and assists == 0:
                return None
        else:
            # For upcoming games, use season averages
            season_stats = await get_player_season_averages(person_id)
            points = float(season_stats.get("PTS", 0.0))
            rebounds = float(season_stats.get("REB", 0.0))
            assists = float(season_stats.get("AST", 0.0))
            
            # Skip if no season stats available
            if points == 0.0 and rebounds == 0.0 and assists == 0.0:
                return None
        
        # Get jersey number and position
        if use_game_stats:
            # Use from game data for live games
            jersey_num = leader_data.get("jerseyNum", "N/A")
            position = leader_data.get("position", "N/A")
        else:
            # Get from season stats for upcoming games
            season_stats = await get_player_season_averages(person_id)
            jersey_num = season_stats.get("JERSEY_NUMBER") or leader_data.get("jerseyNum", "N/A")
            position = season_stats.get("POSITION") or leader_data.get("position", "N/A")
        
        return PlayerStats(
            personId=person_id,
            name=leader_data.get("name", "Unknown"),
            jerseyNum=str(jersey_num) if jersey_num else "N/A",
            position=position if position else "N/A",
            teamTricode=leader_data.get("teamTricode", ""),
            points=points,
            rebounds=rebounds,
            assists=assists,
        )

    # Get top players for both teams
    # For live games, use current game stats; for upcoming, use season averages
    home_leader = await extract_player(game_leaders_data.get("homeLeaders"), use_game_stats=is_live)
    away_leader = await extract_player(game_leaders_data.get("awayLeaders"), use_game_stats=is_live)

    # Only return if at least one leader exists
    if home_leader or away_leader:
        return GameLeaders(homeLeaders=home_leader, awayLeaders=away_leader)
    
    return None


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
                # For live games: uses current game stats; for upcoming: uses season averages
                game_leaders = await extract_game_leaders(
                    game.get("gameLeaders", {}),
                    home_team_id=home_team.teamId,
                    away_team_id=away_team.teamId,
                    game_status_text=game.get("gameStatusText", "")
                )

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
        api_kwargs = get_api_kwargs()
        raw_roster = await asyncio.to_thread(
            lambda: commonteamroster.CommonTeamRoster(team_id=team_id, season=season, **api_kwargs).get_dict()
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


async def _get_game_info_from_scoreboard(game_id: str):
    """
    Helper function to get basic game info from scoreboard when boxscore is not available.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        dict: Basic game info with team names and status, or None if not found
    """
    try:
        raw_scoreboard_data = await fetch_nba_scoreboard()
        if not raw_scoreboard_data:
            return None
            
        raw_games = raw_scoreboard_data.get("games", [])
        for game in raw_games:
            if game.get("gameId") == game_id:
                return {
                    "gameId": game_id,
                    "status": game.get("gameStatusText", "Scheduled"),
                    "homeTeam": {
                        "teamId": game["homeTeam"].get("teamId"),
                        "teamName": game["homeTeam"].get("teamName", "Home Team"),
                    },
                    "awayTeam": {
                        "teamId": game["awayTeam"].get("teamId"),
                        "teamName": game["awayTeam"].get("teamName", "Away Team"),
                    },
                }
        return None
    except Exception as e:
        logger.warning(f"Error fetching game info from scoreboard for game {game_id}: {e}")
        return None


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
        api_kwargs = get_api_kwargs()
        game_data = await asyncio.to_thread(lambda: boxscore.BoxScore(game_id, **api_kwargs).get_dict())

        if "game" not in game_data:
            # Game hasn't started yet - get basic info from scoreboard and return empty boxscore
            logger.warning(f"Box score data not available for game {game_id} (game may not have started)")
            game_info = await _get_game_info_from_scoreboard(game_id)
            if game_info:
                return BoxScoreResponse(
                    game_id=game_info["gameId"],
                    status=game_info["status"],
                    home_team=TeamBoxScoreStats(
                        team_id=game_info["homeTeam"]["teamId"],
                        team_name=game_info["homeTeam"]["teamName"],
                        score=0,
                        field_goal_pct=0.0,
                        three_point_pct=0.0,
                        free_throw_pct=0.0,
                        rebounds_total=0,
                        assists=0,
                        steals=0,
                        blocks=0,
                        turnovers=0,
                        players=[],
                    ),
                    away_team=TeamBoxScoreStats(
                        team_id=game_info["awayTeam"]["teamId"],
                        team_name=game_info["awayTeam"]["teamName"],
                        score=0,
                        field_goal_pct=0.0,
                        three_point_pct=0.0,
                        free_throw_pct=0.0,
                        rebounds_total=0,
                        assists=0,
                        steals=0,
                        blocks=0,
                        turnovers=0,
                        players=[],
                    ),
                )
            else:
                raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

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
        # If boxscore API fails (e.g., game hasn't started), try to get basic info from scoreboard
        error_str = str(e)
        if "Expecting value" in error_str or "JSONDecodeError" in error_str or "game" not in error_str.lower():
            logger.warning(f"Box score data not available for game {game_id} (game may not have started): {type(e).__name__} - {error_str}")
            game_info = await _get_game_info_from_scoreboard(game_id)
            if game_info:
                return BoxScoreResponse(
                    game_id=game_info["gameId"],
                    status=game_info["status"],
                    home_team=TeamBoxScoreStats(
                        team_id=game_info["homeTeam"]["teamId"],
                        team_name=game_info["homeTeam"]["teamName"],
                        score=0,
                        field_goal_pct=0.0,
                        three_point_pct=0.0,
                        free_throw_pct=0.0,
                        rebounds_total=0,
                        assists=0,
                        steals=0,
                        blocks=0,
                        turnovers=0,
                        players=[],
                    ),
                    away_team=TeamBoxScoreStats(
                        team_id=game_info["awayTeam"]["teamId"],
                        team_name=game_info["awayTeam"]["teamName"],
                        score=0,
                        field_goal_pct=0.0,
                        three_point_pct=0.0,
                        free_throw_pct=0.0,
                        rebounds_total=0,
                        assists=0,
                        steals=0,
                        blocks=0,
                        turnovers=0,
                        players=[],
                    ),
                )
        
        logger.error(f"Error retrieving box score for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving box score: {str(e)}")


async def getPlayByPlay(game_id: str) -> PlayByPlayResponse:
    """
    Get the play-by-play (all game events) for a specific game.
    
    Args:
        game_id: The unique game ID from NBA
        
    Returns:
        PlayByPlayResponse: List of all plays/events that happened in the game
        Returns empty list if game hasn't started yet.
        
    Raises:
        HTTPException: If game not found or API error
    """
    try:
        # Get play-by-play data from NBA API
        api_kwargs = get_api_kwargs()
        play_by_play_data = await asyncio.to_thread(lambda: playbyplay.PlayByPlay(game_id, **api_kwargs).get_dict())

        if "game" not in play_by_play_data or "actions" not in play_by_play_data["game"]:
            # Game hasn't started yet - return empty play-by-play
            logger.warning(f"Play-by-play data not available for game {game_id} (game may not have started)")
            return PlayByPlayResponse(game_id=game_id, plays=[])

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
        # If play-by-play API fails (e.g., game hasn't started), return empty response
        error_str = str(e)
        if "Expecting value" in error_str or "JSONDecodeError" in error_str:
            logger.warning(f"Play-by-play data not available for game {game_id} (game may not have started): {type(e).__name__} - {error_str}")
            return PlayByPlayResponse(game_id=game_id, plays=[])
        
        logger.error(f"Error retrieving play-by-play for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving play-by-play: {str(e)}")
