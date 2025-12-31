import asyncio
import logging

from fastapi import HTTPException
from nba_api.stats.endpoints import scoreboardv2, playerindex, commonteamroster
from nba_api.stats.static import teams
from nba_api.stats.library.parameters import HistoricalNullable

from app.schemas.schedule import GamesResponse, GameSummary, TeamSummary, TopScorer, GameLeaders, GameLeader
from app.config import get_api_kwargs

# Set up logger for this file
logger = logging.getLogger(__name__)

# Create a map of team IDs to abbreviations for quick lookup
# This helps us convert team IDs to abbreviations like "LAL" or "BOS"
NBA_TEAMS = {team["id"]: team["abbreviation"] for team in teams.get_teams()}

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


async def extract_game_leaders(team_leaders_list, team_leaders_headers, game_id, home_team_id, away_team_id):
    """
    Extract game leaders for both teams and fetch their season averages.
    """
    if not team_leaders_list or not team_leaders_headers:
        return None
    
    home_leader = None
    away_leader = None
    
    # Find leaders for this game
    # Convert game_id to string for consistent comparison
    game_id_str = str(game_id)
    for leader_row in team_leaders_list:
        if len(team_leaders_headers) != len(leader_row):
            continue
        leader_dict = dict(zip(team_leaders_headers, leader_row))
        if str(leader_dict.get("GAME_ID", "")) != game_id_str:
            continue
        
        team_id = leader_dict.get("TEAM_ID")
        player_id = leader_dict.get("PTS_PLAYER_ID", 0)
        player_name = leader_dict.get("PTS_PLAYER_NAME", "Unknown")
        
        if not player_id or player_id == 0:
            continue
        
        # Get season averages for this player
        season_stats = await get_player_season_averages(player_id)
        
        leader_data = {
            "personId": player_id,
            "name": player_name,
            "jerseyNum": str(season_stats.get("JERSEY_NUMBER", "")) if season_stats.get("JERSEY_NUMBER") else None,
            "position": season_stats.get("POSITION"),
            "teamTricode": NBA_TEAMS.get(team_id, ""),
            "points": float(season_stats.get("PTS", 0.0)),
            "rebounds": float(season_stats.get("REB", 0.0)),
            "assists": float(season_stats.get("AST", 0.0)),
        }
        
        if team_id == home_team_id:
            home_leader = GameLeader(**leader_data)
        elif team_id == away_team_id:
            away_leader = GameLeader(**leader_data)
    
    if home_leader or away_leader:
        return GameLeaders(homeLeaders=home_leader, awayLeaders=away_leader)
    
    return None


async def get_top_players_for_upcoming_game(home_team_id: int, away_team_id: int):
    """
    For upcoming games, get the top players from each team based on season averages.
    This is used when TeamLeaders data is not available (game hasn't started).
    """
    try:
        # Get current season (e.g., "2024-25")
        from datetime import datetime
        now = datetime.now()
        if now.month >= 10:  # October-December
            season = f"{now.year}-{str(now.year + 1)[2:]}"
        else:  # January-September
            season = f"{now.year - 1}-{str(now.year)[2:]}"
        
        # Get team rosters to find top players
        from app.schemas.player import TeamRoster, Player
        from app.schemas.coach import Coach
        
        # Fetch home team roster
        api_kwargs = get_api_kwargs()
        home_roster_data = await asyncio.to_thread(
            lambda: commonteamroster.CommonTeamRoster(team_id=home_team_id, season=season, **api_kwargs).get_dict()
        )
        home_players_data = home_roster_data["resultSets"][0]["rowSet"] if home_roster_data.get("resultSets") else []
        home_players = []
        if home_players_data:
            column_names = home_roster_data["resultSets"][0]["headers"]
            for row in home_players_data:
                player_dict = dict(zip(column_names, row))
                home_players.append(Player(
                    player_id=int(player_dict["PLAYER_ID"]),
                    name=player_dict["PLAYER"],
                    jersey_number=player_dict.get("NUM"),
                    position=player_dict.get("POSITION"),
                    height=player_dict.get("HEIGHT"),
                    weight=int(player_dict["WEIGHT"]) if player_dict.get("WEIGHT") else None,
                    birth_date=player_dict.get("BIRTH_DATE"),
                    age=int(player_dict["AGE"]) if player_dict.get("AGE") else None,
                    experience="Rookie" if str(player_dict.get("EXP", "")).upper() == "R" else str(player_dict.get("EXP", "")),
                    school=player_dict.get("SCHOOL"),
                ))
        
        # Fetch away team roster
        api_kwargs = get_api_kwargs()
        away_roster_data = await asyncio.to_thread(
            lambda: commonteamroster.CommonTeamRoster(team_id=away_team_id, season=season, **api_kwargs).get_dict()
        )
        away_players_data = away_roster_data["resultSets"][0]["rowSet"] if away_roster_data.get("resultSets") else []
        away_players = []
        if away_players_data:
            column_names = away_roster_data["resultSets"][0]["headers"]
            for row in away_players_data:
                player_dict = dict(zip(column_names, row))
                away_players.append(Player(
                    player_id=int(player_dict["PLAYER_ID"]),
                    name=player_dict["PLAYER"],
                    jersey_number=player_dict.get("NUM"),
                    position=player_dict.get("POSITION"),
                    height=player_dict.get("HEIGHT"),
                    weight=int(player_dict["WEIGHT"]) if player_dict.get("WEIGHT") else None,
                    birth_date=player_dict.get("BIRTH_DATE"),
                    age=int(player_dict["AGE"]) if player_dict.get("AGE") else None,
                    experience="Rookie" if str(player_dict.get("EXP", "")).upper() == "R" else str(player_dict.get("EXP", "")),
                    school=player_dict.get("SCHOOL"),
                ))
        
        # Get top scorer from each roster based on season averages
        home_leader = None
        away_leader = None
        
        # Find top scorer for home team
        if home_players:
            top_home_player = None
            top_home_ppg = 0.0
            for player in home_players:
                stats = await get_player_season_averages(player.player_id)
                ppg = float(stats.get("PTS", 0.0))
                if ppg > top_home_ppg:
                    top_home_ppg = ppg
                    top_home_player = {
                        "personId": player.player_id,
                        "name": player.name,
                        "jerseyNum": str(player.jersey_number) if player.jersey_number else None,
                        "position": player.position,
                        "teamTricode": NBA_TEAMS.get(home_team_id, ""),
                        "points": float(stats.get("PTS", 0.0)),
                        "rebounds": float(stats.get("REB", 0.0)),
                        "assists": float(stats.get("AST", 0.0)),
                    }
            if top_home_player:
                home_leader = GameLeader(**top_home_player)
        
        # Find top scorer for away team
        if away_players:
            top_away_player = None
            top_away_ppg = 0.0
            for player in away_players:
                stats = await get_player_season_averages(player.player_id)
                ppg = float(stats.get("PTS", 0.0))
                if ppg > top_away_ppg:
                    top_away_ppg = ppg
                    top_away_player = {
                        "personId": player.player_id,
                        "name": player.name,
                        "jerseyNum": str(player.jersey_number) if player.jersey_number else None,
                        "position": player.position,
                        "teamTricode": NBA_TEAMS.get(away_team_id, ""),
                        "points": float(stats.get("PTS", 0.0)),
                        "rebounds": float(stats.get("REB", 0.0)),
                        "assists": float(stats.get("AST", 0.0)),
                    }
            if top_away_player:
                away_leader = GameLeader(**top_away_player)
        
        if home_leader or away_leader:
            logger.info(f"Found top players: home={home_leader is not None}, away={away_leader is not None}")
            return GameLeaders(homeLeaders=home_leader, awayLeaders=away_leader)
        else:
            logger.warning(f"No top players found for teams {home_team_id} and {away_team_id}")
    except Exception as e:
        logger.warning(f"Error getting top players for upcoming game: {e}", exc_info=True)
    
    return None


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
        api_kwargs = get_api_kwargs()
        games_data = await asyncio.to_thread(lambda: scoreboardv2.ScoreboardV2(game_date=date, **api_kwargs).get_dict())

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
        
        # Log available headers for debugging (only log once, not for every request)
        if games_list:
            logger.info(f"GameHeader fields available ({len(game_headers)}): {', '.join(game_headers[:15])}{'...' if len(game_headers) > 15 else ''}")
            # Log first game's structure to see actual data
            if len(games_list) > 0 and len(game_headers) == len(games_list[0]):
                first_game_dict = dict(zip(game_headers, games_list[0]))
                logger.info(f"Sample game keys: {list(first_game_dict.keys())[:20]}")

        # Get headers and data for team leaders and scores (if available)
        team_leaders_headers = team_leaders_data["headers"] if team_leaders_data else []
        team_leaders_list = team_leaders_data["rowSet"] if team_leaders_data else []

        line_score_headers = line_score_data["headers"] if line_score_data else []
        line_score_list = line_score_data["rowSet"] if line_score_data else []

        games = []
        processed_game_ids = set()  # Track processed game IDs to avoid duplicates

        # Process each game
        for game in games_list:
            try:
                # Validate that headers and game row have the same length
                if len(game_headers) != len(game):
                    logger.warning(f"Game row length ({len(game)}) doesn't match headers length ({len(game_headers)}), skipping")
                    continue
                
                # Convert the game data to a dictionary
                # Only include fields that exist in the data
                game_dict = {}
                for i, header in enumerate(game_headers):
                    if i < len(game):
                        game_dict[header] = game[i]
                    # If header doesn't have corresponding data, skip it (don't add None)
                    # This prevents KeyError when accessing optional fields

                # Skip if game ID is missing
                if "GAME_ID" not in game_dict or game_dict.get("GAME_ID") is None:
                    continue
                
                # Log available keys for first game to help debug
                if len(games) == 0:
                    logger.debug(f"First game available keys: {list(game_dict.keys())}")

                game_id = game_dict.get("GAME_ID")
                
                # Skip if we've already processed this game (avoid duplicates)
                if game_id in processed_game_ids:
                    continue
                
                processed_game_ids.add(game_id)
                
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
                # Convert game_id to string for consistent comparison
                game_id_str = str(game_id)
                home_score = next(
                    (
                        dict(zip(line_score_headers, s)).get("PTS", 0)
                        for s in line_score_list
                        if len(line_score_headers) == len(s)
                        and str(dict(zip(line_score_headers, s)).get("GAME_ID", "")) == game_id_str
                        and dict(zip(line_score_headers, s)).get("TEAM_ID") == home_team_id
                    ),
                    0,
                )
                # Find the away team's score
                away_score = next(
                    (
                        dict(zip(line_score_headers, s)).get("PTS", 0)
                        for s in line_score_list
                        if len(line_score_headers) == len(s)
                        and str(dict(zip(line_score_headers, s)).get("GAME_ID", "")) == game_id_str
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
                top_scorer = None
                try:
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
                            for leader_row in team_leaders_list
                            if len(team_leaders_headers) == len(leader_row)
                            for d in [dict(zip(team_leaders_headers, leader_row))]
                            if str(d.get("GAME_ID", "")) == str(game_id)
                        ),
                        None,
                    )
                except (KeyError, ValueError, TypeError) as e:
                    logger.warning(f"Error extracting top scorer for game {game_id}: {e}")
                    top_scorer = None

                # Extract game leaders with season averages
                game_leaders = None
                game_status_text = game_dict.get("GAME_STATUS_TEXT", "Unknown")
                is_upcoming = "final" not in game_status_text.lower() and "live" not in game_status_text.lower() and home_score == 0 and away_score == 0
                
                # For upcoming games, always try to get leaders from rosters first (faster and more reliable)
                # For completed games, try to get from TeamLeaders data first
                if is_upcoming:
                    # For upcoming games, go straight to roster-based approach
                    try:
                        logger.info(f"Getting top players from rosters for upcoming game {game_id} (home: {home_team_id}, away: {away_team_id})")
                        game_leaders = await get_top_players_for_upcoming_game(home_team_id, away_team_id)
                        if game_leaders:
                            logger.info(f"Successfully got game leaders from rosters for upcoming game {game_id}")
                        else:
                            logger.warning(f"No game leaders returned from rosters for upcoming game {game_id}")
                    except Exception as e:
                        logger.warning(f"Error getting top players from rosters for upcoming game {game_id}: {e}", exc_info=True)
                        game_leaders = None
                else:
                    # For completed/live games, try TeamLeaders data first
                    try:
                        game_leaders = await extract_game_leaders(
                            team_leaders_list, team_leaders_headers, game_id, home_team_id, away_team_id
                        )
                    except Exception as e:
                        logger.warning(f"Error extracting game leaders for game {game_id}: {e}")
                        game_leaders = None
                    
                    # If TeamLeaders didn't work, fallback to rosters
                    if not game_leaders or (not game_leaders.homeLeaders and not game_leaders.awayLeaders):
                        try:
                            logger.info(f"Falling back to rosters for game {game_id} (home: {home_team_id}, away: {away_team_id})")
                            roster_leaders = await get_top_players_for_upcoming_game(home_team_id, away_team_id)
                            if roster_leaders:
                                logger.info(f"Successfully got game leaders from rosters fallback for game {game_id}")
                                game_leaders = roster_leaders
                            else:
                                logger.warning(f"No game leaders returned from rosters fallback for game {game_id}")
                        except Exception as e:
                            logger.warning(f"Error getting top players from rosters fallback for game {game_id}: {e}", exc_info=True)
                            # Keep game_leaders as None if fallback also fails

                # Extract game time - check all possible field names that NBA API might use
                game_time_utc = (
                    game_dict.get("GAME_TIME_UTC") or 
                    game_dict.get("START_TIME_UTC") or 
                    game_dict.get("GAME_DATE_TIME_UTC") or
                    game_dict.get("GAME_ET") or
                    None
                )

                # Create a GameSummary with all the game information
                # Use the requested date, not the API's game_date (which might be different)
                games.append(
                    GameSummary(
                        game_id=str(game_id),  # Ensure it's a string
                        game_date=date,  # Use the requested date
                        game_time_utc=game_time_utc,
                        matchup=f"{home_team.team_abbreviation} vs {away_team.team_abbreviation}",
                        game_status=game_dict.get("GAME_STATUS_TEXT", "Unknown"),
                        arena=game_dict.get("ARENA_NAME"),
                        home_team=home_team,
                        away_team=away_team,
                        top_scorer=top_scorer,
                        gameLeaders=game_leaders,
                    )
                )
            except KeyError as e:
                # If a key is missing, log and skip this game
                logger.warning(f"Missing key in game data: {e}, skipping game. Available keys: {list(game_dict.keys())[:10]}")
                continue
            except Exception as e:
                # Catch any other errors and skip this game
                logger.warning(f"Error processing game: {e}, skipping. Game ID: {game_dict.get('GAME_ID', 'unknown')}")
                continue

        return GamesResponse(games=games)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving games for date {date}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving games: {str(e)}")
