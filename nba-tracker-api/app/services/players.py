import asyncio
import logging
import pandas as pd
from typing import List

from fastapi import HTTPException
from nba_api.stats.endpoints import PlayerGameLog, playerindex, leaguedashplayerstats
from nba_api.stats.library.parameters import HistoricalNullable, PerModeDetailed, SeasonTypeAllStar, PerModeSimple, SeasonType

from app.schemas.player import PlayerGamePerformance, PlayerSummary
from app.schemas.seasonleaders import SeasonLeadersResponse, SeasonLeadersCategory, SeasonLeader
from app.schemas.playergamelog import PlayerGameLogResponse, PlayerGameLogEntry
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

# Set up logger for this file
logger = logging.getLogger(__name__)



async def getPlayer(player_id: str) -> PlayerSummary:
    """Get player information including stats and recent games."""
    try:
        api_kwargs = get_api_kwargs()
        await rate_limit()
        player_index_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
            ),
            timeout=15.0
        )
        player_index_df = player_index_data.get_data_frames()[0]

        player_id_int = int(player_id)
        player_row = player_index_df[player_index_df["PERSON_ID"] == player_id_int]

        if player_row.empty:
            del player_index_df
            del player_row
            raise HTTPException(status_code=404, detail=f"Player not found with ID: {player_id}")

        player_data = player_row.iloc[0].to_dict()
        
        # Delete DataFrames after extracting data
        del player_row
        del player_index_df

        roster_status = player_data.get("ROSTER_STATUS")
        if isinstance(roster_status, float):
            roster_status = str(roster_status)
        elif roster_status is None:
            roster_status = ""

        recent_games = []
        try:
            api_kwargs = get_api_kwargs()
            await rate_limit()
            game_log_data = await asyncio.wait_for(
                asyncio.to_thread(lambda: PlayerGameLog(player_id=player_id, **api_kwargs).get_dict()),
                timeout=10.0
            )

            if not game_log_data.get("resultSets") or len(game_log_data["resultSets"]) == 0:
                logger.warning(f"No game log data available for player {player_id}")
            else:
                game_log = game_log_data["resultSets"][0].get("rowSet", [])
                game_headers = game_log_data["resultSets"][0].get("headers", [])

                for row in game_log[:5]:
                    try:
                        game_id_idx = game_headers.index("Game_ID") if "Game_ID" in game_headers else None
                        game_date_idx = game_headers.index("GAME_DATE") if "GAME_DATE" in game_headers else None
                        matchup_idx = game_headers.index("MATCHUP") if "MATCHUP" in game_headers else None
                        pts_idx = game_headers.index("PTS") if "PTS" in game_headers else None
                        reb_idx = game_headers.index("REB") if "REB" in game_headers else None
                        ast_idx = game_headers.index("AST") if "AST" in game_headers else None
                        stl_idx = game_headers.index("STL") if "STL" in game_headers else None
                        blk_idx = game_headers.index("BLK") if "BLK" in game_headers else None

                        if None in [game_id_idx, game_date_idx, matchup_idx, pts_idx, reb_idx, ast_idx, stl_idx, blk_idx]:
                            logger.warning(f"Missing required headers in game log for player {player_id}")
                            continue

                        recent_games.append(
                            PlayerGamePerformance(
                                game_id=row[game_id_idx],
                                date=pd.to_datetime(row[game_date_idx]).strftime("%Y-%m-%d"),
                                opponent_team_abbreviation=row[matchup_idx][-3:] if len(row[matchup_idx]) >= 3 else "",
                                points=row[pts_idx] if pts_idx < len(row) else 0,
                                rebounds=row[reb_idx] if reb_idx < len(row) else 0,
                                assists=row[ast_idx] if ast_idx < len(row) else 0,
                                steals=row[stl_idx] if stl_idx < len(row) else 0,
                                blocks=row[blk_idx] if blk_idx < len(row) else 0,
                            )
                        )
                    except (IndexError, ValueError, KeyError) as e:
                        logger.warning(f"Error parsing game log row for player {player_id}: {e}")
                        continue
        except Exception as e:
            # If game log fails, continue without recent games rather than failing the whole request
            logger.warning(f"Error fetching game log for player {player_id}: {e}. Continuing without recent games.")

        # Build the player summary with all their info
        # Use .get() with defaults to handle missing fields gracefully
        player_summary = PlayerSummary(
            PERSON_ID=player_data.get("PERSON_ID", player_id_int),
            PLAYER_LAST_NAME=player_data.get("PLAYER_LAST_NAME", ""),
            PLAYER_FIRST_NAME=player_data.get("PLAYER_FIRST_NAME", ""),
            PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
            TEAM_ID=player_data.get("TEAM_ID"),
            TEAM_SLUG=player_data.get("TEAM_SLUG"),
            IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
            TEAM_CITY=player_data.get("TEAM_CITY"),
            TEAM_NAME=player_data.get("TEAM_NAME"),
            TEAM_ABBREVIATION=player_data.get("TEAM_ABBREVIATION"),
            JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
            POSITION=player_data.get("POSITION"),
            HEIGHT=player_data.get("HEIGHT"),
            WEIGHT=player_data.get("WEIGHT"),
            COLLEGE=player_data.get("COLLEGE"),
            COUNTRY=player_data.get("COUNTRY"),
            ROSTER_STATUS=roster_status or "",
            PTS=player_data.get("PTS"),
            REB=player_data.get("REB"),
            AST=player_data.get("AST"),
            STATS_TIMEFRAME=player_data.get("STATS_TIMEFRAME"),
            FROM_YEAR=player_data.get("FROM_YEAR"),
            TO_YEAR=player_data.get("TO_YEAR"),
            recent_games=recent_games,
        )

        return player_summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player {player_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def search_players(search_term: str) -> List[PlayerSummary]:
    """
    Search for players by name.
    Looks for players whose first or last name matches the search term.
    
    Args:
        search_term: The name to search for
        
    Returns:
        List[PlayerSummary]: List of matching players (up to 20)
        
    Raises:
        HTTPException: If no players found or API error
    """

    try:
        # Get all players from NBA API
        api_kwargs = get_api_kwargs()
        await rate_limit()
        player_index_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
            ),
            timeout=15.0
        )
        player_index_df = player_index_data.get_data_frames()[0]

        # Search for players whose name matches (case-insensitive)
        search_lower = search_term.lower()
        filtered_players = player_index_df[
            player_index_df["PLAYER_FIRST_NAME"].str.lower().str.contains(search_lower, na=False)
            | player_index_df["PLAYER_LAST_NAME"].str.lower().str.contains(search_lower, na=False)
        ]

        # If no players found, return 404 error
        if filtered_players.empty:
            del player_index_df
            del filtered_players
            raise HTTPException(status_code=404, detail="No players found matching the search term")

        # Limit to 20 results so we don't return too much data
        filtered_players = filtered_players.head(20)

        # Convert to native Python types immediately
        players_data = filtered_players.to_dict(orient="records")
        del filtered_players  # Delete filtered DataFrame
        del player_index_df  # Delete original DataFrame

        # Convert each player to our PlayerSummary format
        player_summaries: List[PlayerSummary] = []
        for player_data in players_data:
            roster_status = player_data.get("ROSTER_STATUS")
            if isinstance(roster_status, float):
                roster_status = str(roster_status)

            player_summaries.append(
                PlayerSummary(
                    PERSON_ID=player_data["PERSON_ID"],
                    PLAYER_LAST_NAME=player_data["PLAYER_LAST_NAME"],
                    PLAYER_FIRST_NAME=player_data["PLAYER_FIRST_NAME"],
                    PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
                    TEAM_ID=player_data.get("TEAM_ID"),
                    TEAM_SLUG=player_data.get("TEAM_SLUG"),
                    IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
                    TEAM_CITY=player_data.get("TEAM_CITY"),
                    TEAM_NAME=player_data.get("TEAM_NAME"),
                    TEAM_ABBREVIATION=player_data.get("TEAM_ABBREVIATION"),
                    JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
                    POSITION=player_data.get("POSITION"),
                    HEIGHT=player_data.get("HEIGHT"),
                    WEIGHT=player_data.get("WEIGHT"),
                    COLLEGE=player_data.get("COLLEGE"),
                    COUNTRY=player_data.get("COUNTRY"),
                    ROSTER_STATUS=roster_status,
                    PTS=player_data.get("PTS"),
                    REB=player_data.get("REB"),
                    AST=player_data.get("AST"),
                    STATS_TIMEFRAME=player_data.get("STATS_TIMEFRAME"),
                    FROM_YEAR=player_data.get("FROM_YEAR"),
                    TO_YEAR=player_data.get("TO_YEAR"),
                    recent_games=[],
                )
            )

        return player_summaries

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching players with term '{search_term}': {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


async def get_top_players_by_stat(season: str, stat: str, top_n: int = 10) -> List[PlayerSummary]:
    """
    Get top N players for a specific stat category for a season.
    
    Args:
        season: The season year like "2024-25"
        stat: The stat to sort by (PTS, REB, AST, STL, BLK)
        top_n: Number of top players to return
        
    Returns:
        List[PlayerSummary]: List of top players sorted by the specified stat
        
    Raises:
        HTTPException: If API error
    """
    try:
        api_kwargs = get_api_kwargs()
        
        stat_map = {
            "PTS": "PTS",
            "REB": "REB",
            "AST": "AST",
            "STL": "STL",
            "BLK": "BLK",
        }
        
        stat_col = stat_map.get(stat.upper(), "PTS")
        
        await rate_limit()
        stats_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: leaguedashplayerstats.LeagueDashPlayerStats(
                    season=season,
                    per_mode_detailed=PerModeDetailed.per_game,
                    season_type_all_star=SeasonTypeAllStar.regular,
                    **api_kwargs
                ).get_data_frames()[0]
            ),
            timeout=15.0
        )
        
        if stats_data.empty:
            return []
        
        stats_data = stats_data[stats_data.get("GP", 0) > 0].copy()
        
        if stat_col not in stats_data.columns:
            del stats_data
            return []
        
        stats_data[stat_col] = pd.to_numeric(stats_data[stat_col], errors='coerce').fillna(0)
        sorted_df = stats_data.nlargest(top_n, stat_col)
        
        # Convert to native Python types immediately
        players_stats_data = sorted_df.to_dict(orient="records")
        del sorted_df  # Delete sorted DataFrame
        del stats_data  # Delete original DataFrame
        
        await rate_limit()
        player_index_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
            ),
            timeout=15.0
        )
        player_index_df = player_index_data.get_data_frames()[0]
        
        # Convert player index to dict for faster lookup
        player_index_dict = {}
        for _, idx_row in player_index_df.iterrows():
            player_id = int(idx_row.get("PERSON_ID", 0))
            if player_id:
                player_index_dict[player_id] = idx_row.to_dict()
        
        del player_index_df  # Delete player index DataFrame
        
        player_summaries: List[PlayerSummary] = []
        for row in players_stats_data:
            player_id = int(row.get("PLAYER_ID", 0))
            player_name = str(row.get("PLAYER_NAME", "")).strip()
            
            if not player_id or not player_name:
                continue
            
            # Try to get additional info from player index
            player_data = player_index_dict.get(player_id)
            
            if player_data:
                roster_status = player_data.get("ROSTER_STATUS")
                if isinstance(roster_status, float):
                    roster_status = str(roster_status)
                
                # Get all stat values from the stats data (use row data which has current season stats)
                player_summary = PlayerSummary(
                    PERSON_ID=player_id,
                    PLAYER_LAST_NAME=player_data.get("PLAYER_LAST_NAME", ""),
                    PLAYER_FIRST_NAME=player_data.get("PLAYER_FIRST_NAME", ""),
                    PLAYER_SLUG=player_data.get("PLAYER_SLUG"),
                    TEAM_ID=player_data.get("TEAM_ID"),
                    TEAM_SLUG=player_data.get("TEAM_SLUG"),
                    IS_DEFUNCT=player_data.get("IS_DEFUNCT"),
                    TEAM_CITY=player_data.get("TEAM_CITY"),
                    TEAM_NAME=player_data.get("TEAM_NAME"),
                    TEAM_ABBREVIATION=row.get("TEAM_ABBREVIATION") or player_data.get("TEAM_ABBREVIATION"),
                    JERSEY_NUMBER=player_data.get("JERSEY_NUMBER"),
                    POSITION=player_data.get("POSITION"),
                    HEIGHT=player_data.get("HEIGHT"),
                    WEIGHT=player_data.get("WEIGHT"),
                    COLLEGE=player_data.get("COLLEGE"),
                    COUNTRY=player_data.get("COUNTRY"),
                    ROSTER_STATUS=roster_status or "",
                    PTS=float(row.get("PTS", 0)) if pd.notna(row.get("PTS")) else None,
                    REB=float(row.get("REB", 0)) if pd.notna(row.get("REB")) else None,
                    AST=float(row.get("AST", 0)) if pd.notna(row.get("AST")) else None,
                    STL=float(row.get("STL", 0)) if pd.notna(row.get("STL")) else None,
                    BLK=float(row.get("BLK", 0)) if pd.notna(row.get("BLK")) else None,
                    STATS_TIMEFRAME=season,
                    FROM_YEAR=player_data.get("FROM_YEAR"),
                    TO_YEAR=player_data.get("TO_YEAR"),
                    recent_games=[],
                )
            else:
                # Fallback if player not found in index
                stat_value = float(row.get(stat_col, 0)) if pd.notna(row.get(stat_col)) else 0.0
                name_parts = player_name.split(" ", 1)
                player_summary = PlayerSummary(
                    PERSON_ID=player_id,
                    PLAYER_LAST_NAME=name_parts[-1] if len(name_parts) > 1 else "",
                    PLAYER_FIRST_NAME=name_parts[0] if len(name_parts) > 0 else "",
                    TEAM_ABBREVIATION=row.get("TEAM_ABBREVIATION"),
                    PTS=float(row.get("PTS", 0)) if pd.notna(row.get("PTS")) else None,
                    REB=float(row.get("REB", 0)) if pd.notna(row.get("REB")) else None,
                    AST=float(row.get("AST", 0)) if pd.notna(row.get("AST")) else None,
                    STL=float(row.get("STL", 0)) if pd.notna(row.get("STL")) else None,
                    BLK=float(row.get("BLK", 0)) if pd.notna(row.get("BLK")) else None,
                    recent_games=[],
                )
            
            player_summaries.append(player_summary)
        
        return player_summaries
        
    except Exception as e:
        logger.error(f"Error fetching top players by stat {stat} for season {season}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching top players: {str(e)}")


async def get_season_leaders(season: str = "2024-25") -> SeasonLeadersResponse:
    """
    Get season leaders for various stat categories.
    Returns top 5 players for Points, Rebounds, Assists, Steals, and Blocks per game.
    
    Args:
        season: The season year like "2024-25"
        
    Returns:
        SeasonLeadersResponse: Season leaders for multiple stat categories
        
    Raises:
        HTTPException: If API error
    """
    try:
        api_kwargs = get_api_kwargs()
        
        # Use LeagueDashPlayerStats to get season-specific player stats
        await rate_limit()
        stats_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: leaguedashplayerstats.LeagueDashPlayerStats(
                    season=season,
                    per_mode_detailed=PerModeDetailed.per_game,
                season_type_all_star=SeasonTypeAllStar.regular,
                **api_kwargs
            ).get_data_frames()[0]
            ),
            timeout=15.0
        )
        
        if stats_data.empty:
            logger.warning(f"No player stats found for season {season}")
            return SeasonLeadersResponse(
                season=season,
                categories=[
                    SeasonLeadersCategory(category="Points Per Game", leaders=[]),
                    SeasonLeadersCategory(category="Rebounds Per Game", leaders=[]),
                    SeasonLeadersCategory(category="Assists Per Game", leaders=[]),
                    SeasonLeadersCategory(category="Steals Per Game", leaders=[]),
                    SeasonLeadersCategory(category="Blocks Per Game", leaders=[]),
                ]
            )
        
        # Replace NaN values with 0 for numeric columns
        numeric_cols = ["PTS", "REB", "AST", "STL", "BLK", "FG_PCT", "FG3M", "FG3_PCT"]
        for col in numeric_cols:
            if col in stats_data.columns:
                stats_data[col] = pd.to_numeric(stats_data[col], errors='coerce').fillna(0)
        
        # Helper function to create leaders for a stat
        def create_leaders(df: pd.DataFrame, stat_col: str, category_name: str, top_n: int = 5, is_percentage: bool = False, is_whole_number: bool = False) -> SeasonLeadersCategory:
            if stat_col not in df.columns:
                return SeasonLeadersCategory(category=category_name, leaders=[])
            
            df_filtered = df[df.get("GP", 0) > 0].copy()
            
            if df_filtered.empty:
                return SeasonLeadersCategory(category=category_name, leaders=[])
            
            sorted_df = df_filtered.nlargest(top_n, stat_col)
            
            # Convert to native Python types immediately
            leaders_data = sorted_df.to_dict(orient="records")
            del sorted_df  # Delete sorted DataFrame
            del df_filtered  # Delete filtered DataFrame
            
            leaders = []
            for row in leaders_data:
                player_name = str(row.get("PLAYER_NAME", "")).strip()
                value = float(row.get(stat_col, 0)) if pd.notna(row.get(stat_col)) else 0.0
                
                if value >= 0 and player_name:
                    # Format value based on type
                    if is_percentage:
                        formatted_value = round(value * 100, 1) if value <= 1 else round(value, 1)
                    elif is_whole_number:
                        formatted_value = int(round(value))
                    else:
                        formatted_value = round(value, 1)
                    
                    leaders.append(SeasonLeader(
                        player_id=int(row.get("PLAYER_ID", 0)),
                        player_name=player_name,
                        team_abbreviation=row.get("TEAM_ABBREVIATION"),
                        position=None,  # Not available in this endpoint
                        value=formatted_value
                    ))
            
            return SeasonLeadersCategory(category=category_name, leaders=leaders)
        
        categories = []
        categories.append(create_leaders(stats_data, "PTS", "Points Per Game"))
        categories.append(create_leaders(stats_data, "REB", "Rebounds Per Game"))
        categories.append(create_leaders(stats_data, "AST", "Assists Per Game"))
        categories.append(create_leaders(stats_data, "STL", "Steals Per Game"))
        categories.append(create_leaders(stats_data, "BLK", "Blocks Per Game"))
        categories.append(create_leaders(stats_data, "FG_PCT", "Field Goal Percentage", is_percentage=True))
        categories.append(create_leaders(stats_data, "FG3M", "Three Pointers Made", is_whole_number=True))
        categories.append(create_leaders(stats_data, "FG3_PCT", "Three Point Percentage", is_percentage=True))
        
        # Delete original DataFrame after processing
        del stats_data
        
        return SeasonLeadersResponse(season=season, categories=categories)
        
    except Exception as e:
        logger.error(f"Error fetching season leaders for season {season}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching season leaders: {str(e)}")


async def get_league_roster() -> List[PlayerSummary]:
    """
    Get all active players in the league (roster).
    Returns players with their team, position, height, weight, college, and country.
    
    Returns:
        List[PlayerSummary]: List of all active players
    """
    try:
        api_kwargs = get_api_kwargs()
        await rate_limit()
        player_index_data = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: playerindex.PlayerIndex(historical_nullable=HistoricalNullable.all_time, **api_kwargs)
            ),
            timeout=30.0
        )
        player_index_df = player_index_data.get_data_frames()[0]
        
        logger.info(f"Total players in index: {len(player_index_df)}")
        
        # Check what ROSTER_STATUS values exist
        if "ROSTER_STATUS" in player_index_df.columns:
            unique_statuses = player_index_df["ROSTER_STATUS"].unique()
            logger.info(f"Unique ROSTER_STATUS values: {unique_statuses}")
        
        # Filter for active players - ROSTER_STATUS can be numeric (1.0 = active) or string ("Active")
        if "ROSTER_STATUS" in player_index_df.columns:
            try:
                # Check if column is numeric by trying to convert
                # ROSTER_STATUS values are typically [nan, 1.0] where 1.0 = active
                # Filter for non-null values that equal 1.0 or 1
                mask = player_index_df["ROSTER_STATUS"].notna()
                numeric_mask = pd.to_numeric(player_index_df["ROSTER_STATUS"], errors='coerce').notna()
                
                if numeric_mask.any():
                    # It's numeric - filter for 1.0 or 1
                    active_players = player_index_df[
                        mask & 
                        ((pd.to_numeric(player_index_df["ROSTER_STATUS"], errors='coerce') == 1.0) |
                         (pd.to_numeric(player_index_df["ROSTER_STATUS"], errors='coerce') == 1))
                    ]
                else:
                    # Try string matching (case-insensitive)
                    player_index_df["ROSTER_STATUS"] = player_index_df["ROSTER_STATUS"].fillna("")
                    active_players = player_index_df[
                        player_index_df["ROSTER_STATUS"].astype(str).str.upper().str.strip() == "ACTIVE"
                    ]
                
                logger.info(f"Active players found: {len(active_players)}")
                
                # If no active players found, return all players
                if active_players.empty:
                    logger.warning("No players with ROSTER_STATUS='Active' found. Returning all players.")
                    active_players = player_index_df
            except Exception as e:
                logger.warning(f"Error filtering by ROSTER_STATUS: {e}. Returning all players.")
                active_players = player_index_df
        else:
            logger.warning("ROSTER_STATUS column not found. Returning all players.")
            active_players = player_index_df
        
        # Helper function to safely parse integer fields
        def safe_int(value, default=None):
            if value is None or pd.isna(value):
                return default
            if isinstance(value, (int, float)):
                return int(value) if not pd.isna(value) else default
            value_str = str(value).strip()
            if not value_str or value_str == '':
                return default
            try:
                return int(float(value_str))
            except (ValueError, TypeError):
                return default
        
        # Helper function to safely parse string fields
        def safe_str(value, default=None):
            if value is None or pd.isna(value):
                return default
            value_str = str(value).strip()
            return value_str if value_str else default
        
        # Helper function to safely parse float fields
        def safe_float(value, default=None):
            if value is None or pd.isna(value):
                return default
            if isinstance(value, (int, float)):
                return float(value) if not pd.isna(value) else default
            value_str = str(value).strip()
            if not value_str or value_str == '':
                return default
            try:
                return float(value_str)
            except (ValueError, TypeError):
                return default
        
        # Convert to native Python types immediately
        players_data = active_players.to_dict(orient="records")
        del active_players  # Delete filtered DataFrame
        del player_index_df  # Delete original DataFrame
        
        # Convert to PlayerSummary list
        player_summaries: List[PlayerSummary] = []
        for player_data in players_data:
            try:
                roster_status = player_data.get("ROSTER_STATUS")
                if isinstance(roster_status, float):
                    roster_status = str(roster_status)
                elif roster_status is None:
                    roster_status = ""
                
                player_summaries.append(
                    PlayerSummary(
                        PERSON_ID=int(player_data.get("PERSON_ID", 0)) if pd.notna(player_data.get("PERSON_ID")) else 0,
                        PLAYER_LAST_NAME=safe_str(player_data.get("PLAYER_LAST_NAME"), ""),
                        PLAYER_FIRST_NAME=safe_str(player_data.get("PLAYER_FIRST_NAME"), ""),
                        PLAYER_SLUG=safe_str(player_data.get("PLAYER_SLUG")),
                        TEAM_ID=safe_int(player_data.get("TEAM_ID")),
                        TEAM_SLUG=safe_str(player_data.get("TEAM_SLUG")),
                        IS_DEFUNCT=safe_int(player_data.get("IS_DEFUNCT")),
                        TEAM_CITY=safe_str(player_data.get("TEAM_CITY")),
                        TEAM_NAME=safe_str(player_data.get("TEAM_NAME")),
                        TEAM_ABBREVIATION=safe_str(player_data.get("TEAM_ABBREVIATION")),
                        JERSEY_NUMBER=safe_str(player_data.get("JERSEY_NUMBER")),
                        POSITION=safe_str(player_data.get("POSITION")),
                        HEIGHT=safe_str(player_data.get("HEIGHT")),
                        WEIGHT=safe_int(player_data.get("WEIGHT")),  # This was causing the error - space string
                        COLLEGE=safe_str(player_data.get("COLLEGE")),
                        COUNTRY=safe_str(player_data.get("COUNTRY")),
                        ROSTER_STATUS=roster_status or "",
                        PTS=safe_float(player_data.get("PTS")),
                        REB=safe_float(player_data.get("REB")),
                        AST=safe_float(player_data.get("AST")),
                        STL=safe_float(player_data.get("STL")),
                        BLK=safe_float(player_data.get("BLK")),
                        STATS_TIMEFRAME=safe_str(player_data.get("STATS_TIMEFRAME")),
                        FROM_YEAR=safe_int(player_data.get("FROM_YEAR")),
                        TO_YEAR=safe_int(player_data.get("TO_YEAR")),
                        recent_games=[],
                    )
                )
            except Exception as e:
                logger.warning(f"Error parsing player row (ID: {player_data.get('PERSON_ID', 'unknown')}): {e}. Skipping player.")
                continue
        
        return player_summaries
        
    except Exception as e:
        logger.error(f"Error fetching league roster: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching league roster: {str(e)}")


async def get_player_game_log(player_id: str, season: str = "2024-25") -> PlayerGameLogResponse:
    """
    Get game log for a player for a specific season.
    Returns all games with detailed stats for charting.
    
    Args:
        player_id: The NBA player ID
        season: The season year like "2024-25"
        
    Returns:
        PlayerGameLogResponse: Game log entries for the player
        
    Raises:
        HTTPException: If player not found or API error
    """
    try:
        api_kwargs = get_api_kwargs()
        player_id_int = int(player_id)
        
        # Get game log data from NBA API
        game_log_data = await asyncio.to_thread(
            lambda: PlayerGameLog(player_id=player_id, season=season, **api_kwargs).get_dict()
        )
        
        if not game_log_data.get("resultSets") or len(game_log_data["resultSets"]) == 0:
            return PlayerGameLogResponse(player_id=player_id_int, season=season, games=[])
        
        game_log = game_log_data["resultSets"][0].get("rowSet", [])
        game_headers = game_log_data["resultSets"][0].get("headers", [])
        
        games = []
        # Map headers to indices
        header_map = {header: idx for idx, header in enumerate(game_headers)}
        
        for row in game_log:
            try:
                def get_value(key: str, default=None, type_func=None):
                    idx = header_map.get(key)
                    if idx is None or idx >= len(row):
                        return default
                    value = row[idx]
                    if pd.isna(value):
                        return default
                    if type_func:
                        try:
                            return type_func(value)
                        except (ValueError, TypeError):
                            return default
                    return value
                
                # Helper to get int value (defaults to 0)
                def get_int(key: str) -> int:
                    val = get_value(key, 0, float)
                    return int(val) if val is not None else 0
                
                # Helper to get optional int value
                def get_optional_int(key: str):
                    val = get_value(key, None, float)
                    return int(val) if val is not None else None
                
                # Helper to get optional float value
                def get_optional_float(key: str):
                    return get_value(key, None, float)
                
                game_entry = PlayerGameLogEntry(
                    game_id=str(get_value("Game_ID", "")),
                    game_date=pd.to_datetime(get_value("GAME_DATE", "")).strftime("%Y-%m-%d"),
                    matchup=str(get_value("MATCHUP", "")),
                    win_loss=str(val) if (val := get_value("WL", None)) is not None else None,
                    minutes=str(val) if (val := get_value("MIN", None)) is not None else None,
                    points=get_int("PTS"),
                    rebounds=get_int("REB"),
                    assists=get_int("AST"),
                    steals=get_int("STL"),
                    blocks=get_int("BLK"),
                    turnovers=get_int("TOV"),
                    field_goals_made=get_optional_int("FGM"),
                    field_goals_attempted=get_optional_int("FGA"),
                    field_goal_pct=get_optional_float("FG_PCT"),
                    three_pointers_made=get_optional_int("FG3M"),
                    three_pointers_attempted=get_optional_int("FG3A"),
                    three_point_pct=get_optional_float("FG3_PCT"),
                    free_throws_made=get_optional_int("FTM"),
                    free_throws_attempted=get_optional_int("FTA"),
                    free_throw_pct=get_optional_float("FT_PCT"),
                    plus_minus=get_optional_int("PLUS_MINUS"),
                )
                games.append(game_entry)
            except (IndexError, ValueError, KeyError, TypeError) as e:
                logger.warning(f"Error parsing game log row for player {player_id}: {e}")
                continue
        
        # Sort by date (most recent first)
        games.sort(key=lambda x: x.game_date, reverse=True)
        
        return PlayerGameLogResponse(player_id=player_id_int, season=season, games=games)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching game log for player {player_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching game log: {str(e)}")


