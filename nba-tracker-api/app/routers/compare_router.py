import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query, Request

from app.middleware.rate_limit import limiter
from app.utils.errors import upstream_error
from app.schemas.compare_schemas import (
    CareerSeasonEntry,
    CareerSummary,
    ComparisonResponse,
    EfficiencyMetrics,
    GameLogEntry,
    HeadToHeadGame,
    HeadToHeadSummary,
    HotStreakData,
    PlayerSearchResult,
    SeasonAverages,
    StatDelta,
)
from app.services.comparison_pipeline import ComparisonPipeline, PipelineResult
from app.services.player_compare_service import PlayerCompareService
from app.utils.compare_cache import CompareCache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compare", tags=["compare"])

service = PlayerCompareService()
_compare_cache = CompareCache()
pipeline = ComparisonPipeline(service, _compare_cache)


def _dict_to_head_to_head(raw: dict | None) -> HeadToHeadSummary | None:
    """Convert pipeline head_to_head dict to HeadToHeadSummary."""
    if not raw or not isinstance(raw, dict):
        return None
    games_raw = raw.get("games") or []
    games: list[HeadToHeadGame] = []
    for g in games_raw:
        if not isinstance(g, dict):
            continue
        p1 = g.get("player1_stats")
        p2 = g.get("player2_stats")
        if p1 is None or p2 is None:
            continue
        e1 = p1 if isinstance(p1, GameLogEntry) else GameLogEntry(**p1)
        e2 = p2 if isinstance(p2, GameLogEntry) else GameLogEntry(**p2)
        games.append(HeadToHeadGame(date=g.get("date", ""), player1_stats=e1, player2_stats=e2))
    p1_avg = raw.get("player1_averages")
    p2_avg = raw.get("player2_averages")
    try:
        p1_h2h = (
            p1_avg
            if isinstance(p1_avg, SeasonAverages)
            else (SeasonAverages(**p1_avg) if isinstance(p1_avg, dict) else None)
        )
        p2_h2h = (
            p2_avg
            if isinstance(p2_avg, SeasonAverages)
            else (SeasonAverages(**p2_avg) if isinstance(p2_avg, dict) else None)
        )
    except Exception:
        p1_h2h = p2_h2h = None
    return HeadToHeadSummary(
        games_played=raw.get("games_played", 0),
        player1_h2h_averages=p1_h2h,
        player2_h2h_averages=p2_h2h,
        games=games,
    )


def _dict_to_hot_streak(raw: dict | None):
    """Convert pipeline hot-streak dict to HotStreakData."""
    if not raw or not isinstance(raw, dict):
        return None
    deltas = raw.get("deltas") or {}
    try:
        return HotStreakData(
            last_5_averages=raw.get("last_5_averages") or {},
            season_averages=raw.get("season_averages") or {},
            deltas={k: StatDelta(**v) for k, v in deltas.items() if isinstance(v, dict)},
            overall_trend=raw.get("overall_trend") or "steady",
            summary=raw.get("summary") or "",
        )
    except Exception:
        return None


def _dict_to_career_summary(raw: dict | None) -> CareerSummary | None:
    """Convert pipeline career dict to CareerSummary."""
    if not raw or not isinstance(raw, dict) or raw.get("seasons_played", 0) == 0:
        return None
    try:
        peak = raw.get("peak_season")
        peak_entry = CareerSeasonEntry(**peak) if isinstance(peak, dict) else None
        best = raw.get("best_seasons") or []
        best_entries = [CareerSeasonEntry(**b) for b in best if isinstance(b, dict)]
        seasons = raw.get("seasons") or []
        season_entries = [CareerSeasonEntry(**s) for s in seasons if isinstance(s, dict)]
        return CareerSummary(
            seasons_played=raw.get("seasons_played", 0),
            career_averages=raw.get("career_averages") or {},
            career_totals=raw.get("career_totals") or {},
            peak_season=peak_entry,
            best_seasons=best_entries,
            consistency_score=float(raw.get("consistency_score", 0) or 0),
            seasons=season_entries,
        )
    except Exception:
        return None


def _build_comparison_response(result: PipelineResult, last_n_games: int) -> ComparisonResponse:
    """Build ComparisonResponse from pipeline results. Slices games to last_n_games for trends."""
    player1_bio = result.get_data("player1_bio")
    player2_bio = result.get_data("player2_bio")
    player1_splits = result.get_data("player1_splits")
    player2_splits = result.get_data("player2_splits")
    all_p1_games = result.get_data("player1_games") or []
    all_p2_games = result.get_data("player2_games") or []
    player1_games = all_p1_games[-last_n_games:] if all_p1_games else []
    player2_games = all_p2_games[-last_n_games:] if all_p2_games else []
    scouting_report = result.get_data("scouting_report")
    player1_hot_streak = _dict_to_hot_streak(result.get_data("player1_hot_streak"))
    player2_hot_streak = _dict_to_hot_streak(result.get_data("player2_hot_streak"))
    head_to_head = _dict_to_head_to_head(result.get_data("head_to_head"))
    player1_career = _dict_to_career_summary(result.get_data("player1_career"))
    player2_career = _dict_to_career_summary(result.get_data("player2_career"))
    p1_eff = result.get_data("player1_efficiency")
    p2_eff = result.get_data("player2_efficiency")
    player1_efficiency = EfficiencyMetrics(**p1_eff) if isinstance(p1_eff, dict) else None
    player2_efficiency = EfficiencyMetrics(**p2_eff) if isinstance(p2_eff, dict) else None

    player1_radar = service.calculate_radar_stats(player1_splits)
    player2_radar = service.calculate_radar_stats(player2_splits)

    return ComparisonResponse(
        player1=player1_bio,
        player2=player2_bio,
        player1_averages=player1_splits,
        player2_averages=player2_splits,
        player1_radar=player1_radar,
        player2_radar=player2_radar,
        player1_games=player1_games,
        player2_games=player2_games,
        scouting_report=scouting_report,
        player1_hot_streak=player1_hot_streak,
        player2_hot_streak=player2_hot_streak,
        head_to_head=head_to_head,
        player1_career=player1_career,
        player2_career=player2_career,
        player1_efficiency=player1_efficiency,
        player2_efficiency=player2_efficiency,
        fetch_summary=result.fetch_summary,
    )


@router.get(
    "/search",
    response_model=List[PlayerSearchResult],
    summary="Search players for comparison",
    description="Autocomplete player search for the comparison page.",
)
async def search_players(q: str = Query(..., min_length=2, description="Player name search query")):
    try:
        return await service.search_players(q)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error searching players for comparison: {exc}", exc_info=True)
        raise upstream_error("compare", "Error searching players")


@router.get(
    "/seasons/{player_id}",
    response_model=List[str],
    summary="List seasons for a player",
    description="Return season IDs (e.g. 2003-04, 2025-26) for populating season selector.",
)
async def list_player_seasons(player_id: int):
    try:
        return await service.get_player_seasons(player_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching seasons for player {player_id}: {exc}", exc_info=True)
        raise upstream_error("compare", "Error fetching player seasons")


@router.get(
    "/{player1_id}/{player2_id}",
    response_model=ComparisonResponse,
    summary="Compare two players",
    description="Fetch head-to-head comparison data for two players.",
)
@limiter.limit("20/minute")
async def compare_players(
    request: Request,
    player1_id: int,
    player2_id: int,
    season: str = Query("2025-26", description="Season in format YYYY-YY (used when season1/season2 not set)"),
    season1: str | None = Query(None, description="Season for player 1 (e.g. 2012-13)"),
    season2: str | None = Query(None, description="Season for player 2 (e.g. 2015-16)"),
    last_n_games: int = Query(20, ge=5, le=50, description="Number of recent games for trend data"),
):
    s1 = season1 if season1 is not None else season
    s2 = season2 if season2 is not None else season
    try:
        result = await pipeline.execute(player1_id, player2_id, s1, s2, last_n_games)
        if not result.has_minimum_data:
            raise HTTPException(status_code=503, detail=result.missing_data_detail())
        return _build_comparison_response(result, last_n_games)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error comparing players {player1_id} vs {player2_id}: {exc}", exc_info=True)
        raise upstream_error("compare", "Error fetching comparison data")
