import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.pagination import PaginatedResponse, PaginationParams
from app.schemas.player import PlayerSummary
from app.utils.errors import upstream_error
from app.schemas.seasonleaders import SeasonLeadersCategory
from app.schemas.playergamelog import PlayerGameLogResponse
from app.services.players import (
    getPlayer,
    search_players,
    get_season_leaders,
    get_top_players_by_stat,
    get_player_game_log,
    get_league_roster,
)
from app.services.streak_service import get_active_streaks
from app.services.shooting_zones import get_shooting_zones
from app.services.clutch_service import get_clutch_performance
from app.services.player_profile_services import (
    get_year_over_year,
    get_passing_network,
    get_shot_defense,
    get_general_splits,
    get_shooting_splits,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/player/{player_id}",
    response_model=PlayerSummary,
    summary="Get Player Details",
    tags=["players"],
    description="Get detailed information about a specific player including stats and recent games.",
)
async def fetchPlayer(player_id: str):
    """Get player information including stats and recent games."""
    try:
        return await getPlayer(player_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player {player_id}: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/players/search/{search_term}",
    response_model=PaginatedResponse[PlayerSummary],
    summary="Search Players",
    tags=["players"],
    description="Search for players by name. Supports pagination.",
)
async def searchPlayers(
    search_term: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Search for players by first or last name."""
    try:
        full = await search_players(search_term)
        params = PaginationParams(page=page, limit=limit)
        total = len(full)
        data = full[params.offset : params.offset + params.limit]
        return PaginatedResponse(
            data=data,
            page=params.page,
            limit=params.limit,
            total=total,
            has_more=params.offset + len(data) < total,
        )
    except HTTPException:
        raise


@router.get(
    "/players/season-leaders",
    response_model=PaginatedResponse[SeasonLeadersCategory],
    summary="Get Season Leaders",
    tags=["players"],
    description="Get season leaders for various stat categories. Supports pagination over categories.",
)
async def getSeasonLeaders(
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get top 5 players for Points, Rebounds, Assists, Steals, and Blocks per game."""
    try:
        resp = await get_season_leaders(season)
        params = PaginationParams(page=page, limit=limit)
        categories = resp.categories
        total = len(categories)
        data = categories[params.offset : params.offset + params.limit]
        return PaginatedResponse(
            data=data,
            page=params.page,
            limit=params.limit,
            total=total,
            has_more=params.offset + len(data) < total,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching season leaders: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/players/top-by-stat",
    response_model=List[PlayerSummary],
    summary="Get Top Players By Stat",
    tags=["players"],
    description="Get top N players for a specific stat category for a season.",
)
async def getTopPlayersByStat(
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
    stat: str = Query("PTS", description="Stat to sort by (PTS, REB, AST, STL, BLK)"),
    top_n: int = Query(10, description="Number of top players to return", ge=1, le=50),
):
    """Get top N players sorted by a specific stat for a season."""
    try:
        return await get_top_players_by_stat(season, stat, top_n)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching top players by stat: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/game-log",
    response_model=PlayerGameLogResponse,
    summary="Get Player Game Log",
    tags=["players"],
    description="Get game log for a player for a specific season with detailed stats for charting.",
)
async def getPlayerGameLog(
    player_id: str,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Get game log with detailed stats for a player and season."""
    try:
        return await get_player_game_log(player_id, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching game log: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/shooting-zones",
    summary="Get Shooting Zones Efficiency",
    tags=["players"],
    description="Per-zone FG% vs league average (Restricted Area, Paint, Mid-Range, Corner 3, Above Break 3). Cached 30 min.",
)
async def get_player_shooting_zones(
    player_id: str,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
    team_id: Optional[int] = Query(None, description="Optional; resolved from player if omitted"),
):
    """Return shooting zones grid: zone, fg_pct, league_avg, diff_pct, freq_pct."""
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return {"zones": await get_shooting_zones(pid, season, team_id=team_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shooting zones: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/clutch",
    summary="Get Clutch Performance",
    tags=["players"],
    description="Clutch stats (last 5 min, score within 5): PPG, FG%, W-L, +/- vs regular season.",
)
async def get_player_clutch(
    player_id: str,
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Return clutch performance card data."""
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return await get_clutch_performance(pid, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching clutch data: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/year-over-year",
    summary="Get Year-Over-Year Career Stats",
    tags=["players"],
    description="Career stats by season for trend charts.",
)
async def get_player_year_over_year(player_id: str):
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return {"seasons": await get_year_over_year(pid)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching year-over-year: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/passing",
    summary="Get Passing Network",
    tags=["players"],
    description="Top pass targets (recipient, frequency, assists, FG%).",
)
async def get_player_passing(
    player_id: str,
    season: str = Query("2024-25", description="Season YYYY-YY"),
    team_id: Optional[int] = Query(None),
):
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return {"passes": await get_passing_network(pid, season, team_id=team_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching passing: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/defense",
    summary="Get Defensive Shot Defense",
    tags=["players"],
    description="FG% allowed when this player is closest defender, by shot type.",
)
async def get_player_defense(
    player_id: str,
    season: str = Query("2024-25", description="Season YYYY-YY"),
    team_id: Optional[int] = Query(None),
):
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return {"defense": await get_shot_defense(pid, season, team_id=team_id)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching defense: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/splits",
    summary="Get General Splits",
    tags=["players"],
    description="Home/away, wins/losses, month, days rest.",
)
async def get_player_splits(
    player_id: str,
    season: str = Query("2024-25", description="Season YYYY-YY"),
):
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return await get_general_splits(pid, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching splits: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/player/{player_id}/shooting-splits",
    summary="Get Shooting Splits",
    tags=["players"],
    description="Assisted vs unassisted makes, shot area.",
)
async def get_player_shooting_splits(
    player_id: str,
    season: str = Query("2024-25", description="Season YYYY-YY"),
):
    try:
        pid = int(player_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid player_id")
    try:
        return await get_shooting_splits(pid, season)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shooting splits: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/players/league-roster",
    response_model=List[PlayerSummary],
    summary="Get League Roster",
    tags=["players"],
    description="Get all active players in the league with their team, position, height, weight, college, and country.",
)
async def getLeagueRoster():
    """Get all active players in the league."""
    try:
        return await get_league_roster()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching league roster: {e}", exc_info=True)
        raise upstream_error("players", str(e))


@router.get(
    "/players/streaks",
    summary="Get Active Streaks",
    tags=["players"],
    description="Get active statistical streaks (e.g. players with 3+ consecutive games meeting a stat threshold). Cached 1 hour.",
)
async def get_players_streaks(
    min_games: int = Query(3, description="Minimum consecutive games for a streak", ge=1, le=20),
    season: str = Query("2024-25", description="Season in format YYYY-YY"),
):
    """Returns list of active streaks from PlayerGameStreakFinder."""
    try:
        return {"streaks": await get_active_streaks(min_games=min_games, season=season)}
    except Exception as e:
        logger.error(f"Error fetching active streaks: {e}", exc_info=True)
        raise upstream_error("players", str(e))
