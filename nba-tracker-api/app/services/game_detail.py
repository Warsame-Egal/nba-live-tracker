"""
Game detail service: aggregated endpoint for game page.

Uses data_cache.get_scoreboard() for status; runs box score, play-by-play,
key moments, and win probability in parallel with safe error handling.
"""

import asyncio
import logging
import time
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

from app.constants import GAME_STATUS_FINAL, GAME_STATUS_LIVE, GAME_STATUS_SCHEDULED
from app.schemas.game_detail import (
    PlayerImpact,
    QuarterScores,
    ScoreSection,
    TeamScore,
)
from app.schemas.scoreboard import BoxScoreResponse, PlayByPlayResponse
from app.services.data_cache import data_cache
from app.services.key_moments import get_key_moments_for_game, parse_clock
from app.services.scoreboard import getBoxScore, get_hustle_box_score, getPlayByPlay
from app.services.win_probability import get_win_probability
from app.utils.game_id import normalize_game_id

logger = logging.getLogger(__name__)

# 24h cache for AI game summaries: game_id -> (summary_text, timestamp)
_game_summary_cache: Dict[str, Tuple[str, float]] = {}
_GAME_SUMMARY_CACHE_TTL = 24 * 3600  # 24 hours


def get_cached_summary(game_id: str) -> Optional[str]:
    """Return cached summary if present and not expired."""
    now = time.time()
    if game_id not in _game_summary_cache:
        return None
    text, ts = _game_summary_cache[game_id]
    if now - ts >= _GAME_SUMMARY_CACHE_TTL:
        _game_summary_cache.pop(game_id, None)
        return None
    return text


async def _safe_get(coro: Any, default: Any = None) -> Any:
    """Run coroutine and return default on exception."""
    try:
        return await coro
    except Exception as e:
        logger.warning(f"Game detail parallel fetch failed: {e}")
        return default


def _extract_quarter_scores(play_by_play: Optional[PlayByPlayResponse]) -> Optional[QuarterScores]:
    """Derive quarter-by-quarter scores from play-by-play. Returns None if no plays."""
    if not play_by_play or not play_by_play.plays:
        return None

    by_period: Dict[int, List[Any]] = {}
    for play in play_by_play.plays:
        p = play.period
        if p not in by_period:
            by_period[p] = []
        by_period[p].append(play)

    home_scores: List[int] = []
    away_scores: List[int] = []
    for period in sorted(by_period.keys()):
        plays_in_period = by_period[period]
        # Use last play in period for score after that quarter
        last_play = plays_in_period[-1]
        sh = last_play.score_home
        sa = last_play.score_away
        try:
            h = int(sh) if sh is not None and str(sh).strip() != "" else 0
            a = int(sa) if sa is not None and str(sa).strip() != "" else 0
        except (ValueError, TypeError):
            h, a = 0, 0
        home_scores.append(h)
        away_scores.append(a)

    if not home_scores:
        return None
    # Convert cumulative to per-quarter
    home_per_quarter = []
    away_per_quarter = []
    for i in range(len(home_scores)):
        prev_h = home_scores[i - 1] if i > 0 else 0
        prev_a = away_scores[i - 1] if i > 0 else 0
        home_per_quarter.append(home_scores[i] - prev_h)
        away_per_quarter.append(away_scores[i] - prev_a)
    return QuarterScores(home=home_per_quarter, away=away_per_quarter)


def _simplified_game_score(
    pts: int,
    reb: int,
    ast: int,
    stl: int,
    blk: int,
    tov: int,
) -> float:
    """Simplified game score from available box stats (no FGM/FGA/OREB/DREB/PF)."""
    return float(pts) + 0.4 * reb + 0.3 * ast + stl + 0.7 * blk - tov


def _full_game_score(p: Any) -> float:
    """
    Full Hollinger Game Score when FGM/FGA/OREB/DREB/PF are available.
    GmSc = PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*OREB + 0.3*DREB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV
    Falls back to simplified formula if any required stat is missing.
    """
    fgm = getattr(p, "field_goals_made", None)
    fga = getattr(p, "field_goals_attempted", None)
    ftm = getattr(p, "free_throws_made", None)
    fta = getattr(p, "free_throws_attempted", None)
    oreb = getattr(p, "rebounds_offensive", None)
    dreb = getattr(p, "rebounds_defensive", None)
    pf = getattr(p, "fouls_personal", None)
    if fgm is None or fga is None or ftm is None or fta is None:
        return _simplified_game_score(p.points, p.rebounds, p.assists, p.steals, p.blocks, p.turnovers)
    pts = p.points
    stl = p.steals
    ast = p.assists
    blk = p.blocks
    tov = p.turnovers
    oreb = oreb if oreb is not None else 0
    dreb = dreb if dreb is not None else 0
    pf = pf if pf is not None else 0
    return (
        float(pts)
        + 0.4 * fgm
        - 0.7 * fga
        - 0.4 * (fta - ftm)
        + 0.7 * oreb
        + 0.3 * dreb
        + stl
        + 0.7 * ast
        + 0.7 * blk
        - 0.4 * pf
        - tov
    )


def _impact_label(game_score: float) -> str:
    if game_score > 25:
        return "Dominant"
    if game_score > 18:
        return "Strong"
    if game_score > 12:
        return "Solid"
    return "Quiet"


def _highlight_line(pts: int, reb: int, ast: int, stl: int, blk: int) -> str:
    parts = [f"{pts} PTS"]
    if reb:
        parts.append(f"{reb} REB")
    if ast:
        parts.append(f"{ast} AST")
    if stl or blk:
        parts.append(f"{stl} STL, {blk} BLK")
    return " · ".join(parts) if len(parts) > 1 else parts[0]


def _compute_player_impacts(box_score: Optional[BoxScoreResponse]) -> List[PlayerImpact]:
    """Top 3 players per team by game score (full Hollinger when available); impact_label and highlight."""
    if not box_score:
        return []

    impacts: List[PlayerImpact] = []
    for team_slot, team_stats in [
        ("home", box_score.home_team),
        ("away", box_score.away_team),
    ]:
        team_name = team_stats.team_name
        candidates: List[tuple] = []
        for p in team_stats.players:
            gs = _full_game_score(p)
            candidates.append(
                (
                    gs,
                    PlayerImpact(
                        player_name=p.name,
                        player_id=p.player_id,
                        team=team_name,
                        team_side=team_slot,
                        game_score=round(gs, 1),
                        plus_minus=None,
                        pts=p.points,
                        reb=p.rebounds,
                        ast=p.assists,
                        stl=p.steals,
                        blk=p.blocks,
                        impact_label=_impact_label(gs),
                        highlight=_highlight_line(p.points, p.rebounds, p.assists, p.steals, p.blocks),
                    ),
                )
            )
        candidates.sort(key=lambda x: -x[0])
        for _, impact in candidates[:3]:
            impacts.append(impact)

    return impacts


def _parse_minutes(min_str: Optional[str]) -> float:
    """Parse minutes string (e.g. '32:15' or '28') to float. Returns 0 for N/A or invalid."""
    if not min_str or min_str.strip() in ("", "N/A"):
        return 0.0
    s = str(min_str).strip()
    if ":" in s:
        parts = s.split(":")
        try:
            m, sec = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            return m + sec / 60.0
        except (ValueError, TypeError):
            return 0.0
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def _enhance_box_score(box_score: Optional[BoxScoreResponse]) -> Optional[Dict[str, Any]]:
    """Add game_score, pts_per_min, ts_pct, and usage_est to each player. Returns dict."""
    if not box_score:
        return None
    data = box_score.model_dump()
    for team_key in ("home_team", "away_team"):
        if team_key not in data or "players" not in data[team_key]:
            continue
        team_total_pts = 0
        for pl in data[team_key]["players"]:
            team_total_pts += pl.get("points", 0) or 0
        for p in data[team_key]["players"]:
            pts = p.get("points", 0) or 0
            reb = p.get("rebounds", 0) or 0
            ast = p.get("assists", 0) or 0
            stl = p.get("steals", 0) or 0
            blk = p.get("blocks", 0) or 0
            tov = p.get("turnovers", 0) or 0
            fga = p.get("field_goals_attempted") or p.get("fieldGoalsAttempted")
            fta = p.get("free_throws_attempted") or p.get("freeThrowsAttempted")
            if fga is not None and fta is not None:
                denom = 2 * (fga + 0.44 * fta)
                p["ts_pct"] = round(pts / denom, 3) if denom > 0 else None
            else:
                p["ts_pct"] = None
            # Game score: use full formula if we have the dict keys (snake_case from model_dump)
            if p.get("field_goals_made") is not None and p.get("field_goals_attempted") is not None:
                fgm = p.get("field_goals_made", 0) or 0
                fga_val = p.get("field_goals_attempted", 0) or 0
                ftm = p.get("free_throws_made", 0) or 0
                fta_val = p.get("free_throws_attempted", 0) or 0
                oreb = p.get("rebounds_offensive", 0) or 0
                dreb = p.get("rebounds_defensive", 0) or 0
                pf = p.get("fouls_personal", 0) or 0
                gs = (
                    float(pts)
                    + 0.4 * fgm
                    - 0.7 * fga_val
                    - 0.4 * (fta_val - ftm)
                    + 0.7 * oreb
                    + 0.3 * dreb
                    + stl
                    + 0.7 * ast
                    + 0.7 * blk
                    - 0.4 * pf
                    - tov
                )
                p["game_score"] = round(gs, 1)
            else:
                p["game_score"] = round(_simplified_game_score(pts, reb, ast, stl, blk, tov), 1)
            min_val = _parse_minutes(p.get("minutes"))
            p["pts_per_min"] = round(pts / min_val, 2) if min_val > 0 else None
            p["usage_est"] = round((pts + ast) / team_total_pts, 3) if team_total_pts > 0 else None
    return data


async def _generate_game_summary(
    game_id: str,
    box_score: Optional[BoxScoreResponse],
    key_moments: List[Dict[str, Any]],
    player_impacts: List[PlayerImpact],
    score_section: ScoreSection,
) -> Optional[str]:
    """Generate 3-paragraph AI recap for completed games. Cached 24h. Returns None on failure."""
    # Check cache
    now = time.time()
    if game_id in _game_summary_cache:
        text, ts = _game_summary_cache[game_id]
        if now - ts < _GAME_SUMMARY_CACHE_TTL:
            return text
        _game_summary_cache.pop(game_id, None)

    try:
        from app.config import get_groq_api_key
        from app.services.groq_client import groq_is_ready, call_groq_api, get_groq_rate_limiter
    except ImportError:
        return None
    if not groq_is_ready():
        return None
    api_key = get_groq_api_key()

    home = score_section.home_team
    away = score_section.away_team
    qs = score_section.quarter_scores
    q_lines = ""
    if qs and qs.home and qs.away:
        q_lines = "Quarter scores: " + ", ".join(
            f"Q{i+1} {qhs}-{qas}" for i, (qhs, qas) in enumerate(zip(qs.home, qs.away))
        )
    top_impacts = [f"{p.player_name} ({p.team}): {p.highlight} [{p.impact_label}]" for p in player_impacts[:6]]
    moments_preview = []
    for m in key_moments[:10]:
        t = m.get("type", "moment")
        desc = (m.get("play") or {}).get("description", "")[:80]
        ctx = (m.get("context") or "")[:100]
        moments_preview.append(f"- {t}: {desc} {ctx}")
    system_message = (
        "You are a sports writer. Write a concise 3-paragraph game recap. "
        "Paragraph 1: result and headline. Paragraph 2: key performers. Paragraph 3: game flow and turning points. "
        "Use neutral tone. No bullet points."
    )
    user_prompt = (
        f"Game: {away.name} @ {home.name}. Final: {away.score} - {home.score}. {q_lines}\n\n"
        f"Top performers: {'; '.join(top_impacts)}\n\n"
        f"Key moments:\n" + "\n".join(moments_preview) + "\n\n"
        "Write exactly 3 short paragraphs."
    )
    try:
        response = await call_groq_api(
            api_key=api_key,
            system_message=system_message,
            user_prompt=user_prompt,
            rate_limiter=get_groq_rate_limiter(),
        )
        content = (response.get("content") or "").strip()
        if content:
            _game_summary_cache[game_id] = (content, now)
            return content
    except Exception as e:
        logger.warning(f"Game summary generation failed for {game_id}: {e}")
    return None


def _score_section_from_detail(score: Dict[str, Any]) -> ScoreSection:
    """Build ScoreSection from game detail score dict."""
    home = score.get("home_team") or {}
    away = score.get("away_team") or {}
    qs = score.get("quarter_scores") or {}
    return ScoreSection(
        home_team=TeamScore(
            name=home.get("name", "Home"),
            abbreviation=home.get("abbreviation"),
            score=int(home.get("score", 0)),
            record=home.get("record"),
        ),
        away_team=TeamScore(
            name=away.get("name", "Away"),
            abbreviation=away.get("abbreviation"),
            score=int(away.get("score", 0)),
            record=away.get("record"),
        ),
        quarter_scores=QuarterScores(home=qs.get("home") or [], away=qs.get("away") or []) if qs else None,
    )


async def _generate_game_summary_from_detail(detail_result: Dict[str, Any]) -> Optional[str]:
    """Build and run AI summary from a game detail dict. Used by summary endpoint."""
    game_id = detail_result.get("game_id")
    if not game_id or detail_result.get("status") != "completed":
        return None
    score = detail_result.get("score") or {}
    score_section = _score_section_from_detail(score)
    impacts_raw = detail_result.get("player_impacts") or []
    player_impacts: List[PlayerImpact] = []
    for p in impacts_raw:
        if isinstance(p, dict) and p.get("player_name") is not None:
            try:
                player_impacts.append(
                    PlayerImpact(
                        player_name=p.get("player_name", ""),
                        player_id=int(p.get("player_id", 0)),
                        team=p.get("team", ""),
                        team_side=p.get("team_side", "home"),
                        game_score=float(p.get("game_score", 0)),
                        plus_minus=p.get("plus_minus"),
                        pts=int(p.get("pts", 0)),
                        reb=int(p.get("reb", 0)),
                        ast=int(p.get("ast", 0)),
                        stl=int(p.get("stl", 0)),
                        blk=int(p.get("blk", 0)),
                        impact_label=p.get("impact_label", "Solid"),
                        highlight=p.get("highlight", ""),
                    )
                )
            except (TypeError, ValueError):
                continue
    key_moments = detail_result.get("key_moments") or []
    return await _generate_game_summary(
        game_id=game_id,
        box_score=None,
        key_moments=key_moments,
        player_impacts=player_impacts,
        score_section=score_section,
    )


async def get_or_generate_game_summary(game_id: str, wait_seconds: float = 15.0) -> Optional[str]:
    """
    Return cached summary, or generate one (with optional wait). For GET /game/{id}/summary.
    """
    cached = get_cached_summary(game_id)
    if cached:
        return cached
    result = await GameDetailService().get_game_detail(game_id)
    if result is None or result.get("status") != "completed":
        return None
    if result.get("game_summary"):
        return result["game_summary"]
    try:
        return await asyncio.wait_for(
            _generate_game_summary_from_detail(result),
            timeout=wait_seconds,
        )
    except asyncio.TimeoutError:
        logger.warning(f"Game summary generation timed out for {game_id}")
        return None


def _calculate_pace_label(total_points: int, period: Optional[int], clock_str: Optional[str]) -> str:
    """Estimate game pace from points scored vs time elapsed. NBA average ~220 pts/48 min."""
    if not period or period < 1:
        return "Average"
    minutes_per_period = 12
    minutes_elapsed = (period - 1) * minutes_per_period
    parsed = parse_clock(clock_str) if clock_str else None
    if parsed:
        mins, secs = parsed
        minutes_remaining = mins + secs / 60.0
        minutes_elapsed += minutes_per_period - minutes_remaining
    if minutes_elapsed < 5:
        return "Early"
    projected_total = (total_points / minutes_elapsed) * 48
    if projected_total > 240:
        return "Shootout"
    if projected_total > 220:
        return "Fast Break"
    if projected_total < 190:
        return "Grind"
    return "Average"


def _calculate_momentum(
    plays: List[Any],
    home_tricode: Optional[str] = None,
    home_team_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return list of {event_num, momentum, period}. Positive = home momentum, negative = away."""
    momentum = 0
    result = []
    sorted_plays = sorted(
        plays,
        key=lambda p: p.get("action_number", 0) if isinstance(p, dict) else getattr(p, "action_number", 0),
    )
    for play in sorted_plays:
        if isinstance(play, dict):
            action = (play.get("action_type") or "").lower()
            team_tricode = play.get("team_tricode") or ""
            team_id = play.get("team_id")
            period = play.get("period")
            event_num = play.get("action_number")
        else:
            action = (getattr(play, "action_type", None) or "").lower()
            team_tricode = getattr(play, "team_tricode", None) or ""
            team_id = getattr(play, "team_id", None)
            period = getattr(play, "period", None)
            event_num = getattr(play, "action_number", None)
        is_scoring = "shot" in action or "free throw" in action
        if is_scoring:
            if home_tricode and team_tricode == home_tricode:
                momentum += 1
            elif home_team_id is not None and team_id == home_team_id:
                momentum += 1
            elif team_tricode or team_id is not None:
                momentum -= 1
        result.append({"event_num": event_num, "momentum": momentum, "period": period})
    return result


def _build_score_section(
    box_score: Optional[BoxScoreResponse],
    quarter_scores: Optional[QuarterScores],
    period: Optional[int] = None,
    clock: Optional[str] = None,
    home_record: Optional[str] = None,
    away_record: Optional[str] = None,
    home_tricode: Optional[str] = None,
    away_tricode: Optional[str] = None,
) -> ScoreSection:
    """Build ScoreSection from box score and optional scoreboard metadata."""
    pace_label = None
    if box_score and period and (period > 1 or clock):
        total_pts = box_score.home_team.score + box_score.away_team.score
        pace_label = _calculate_pace_label(total_pts, period, clock)
    if not box_score:
        return ScoreSection(
            home_team=TeamScore(name="Home", abbreviation=home_tricode, score=0, record=home_record),
            away_team=TeamScore(name="Away", abbreviation=away_tricode, score=0, record=away_record),
            period=period,
            clock=clock,
            quarter_scores=quarter_scores,
            pace_label=pace_label,
        )
    home = box_score.home_team
    away = box_score.away_team
    return ScoreSection(
        home_team=TeamScore(
            name=home.team_name,
            abbreviation=home_tricode,
            score=home.score,
            record=home_record,
        ),
        away_team=TeamScore(
            name=away.team_name,
            abbreviation=away_tricode,
            score=away.score,
            record=away_record,
        ),
        period=period,
        clock=clock,
        quarter_scores=quarter_scores,
        pace_label=pace_label,
    )


class GameDetailService:
    """Aggregates game detail for the /game/{game_id}/detail endpoint."""

    async def get_game_detail(self, game_id: str) -> Dict[str, Any]:
        """
        Get full game detail: status from scoreboard cache; box score, play-by-play,
        key moments, win probability in parallel. Returns dict suitable for JSON response.
        """
        game_id = normalize_game_id(game_id)
        scoreboard_data = await data_cache.get_scoreboard()
        game = None
        if scoreboard_data and scoreboard_data.scoreboard:
            for g in scoreboard_data.scoreboard.games:
                if normalize_game_id(g.gameId) == game_id:
                    game = g
                    break
        if game is None and scoreboard_data is None:
            logger.debug("Scoreboard cache empty, trying box score fallback for game %s", game_id)

        box_score: Optional[BoxScoreResponse] = None
        play_by_play: Optional[PlayByPlayResponse] = None
        key_moments: List[dict] = []
        win_probability: Optional[dict] = None
        status: str

        if game is not None:
            # Cache path: game found on scoreboard
            status_map = {GAME_STATUS_SCHEDULED: "upcoming", GAME_STATUS_LIVE: "live", GAME_STATUS_FINAL: "completed"}
            status = status_map.get(game.gameStatus, "unknown")
            try:
                box_score, play_by_play, key_moments, win_probability, hustle = await asyncio.wait_for(
                    asyncio.gather(
                        _safe_get(getBoxScore(game_id)),
                        _safe_get(getPlayByPlay(game_id)),
                        _safe_get(get_key_moments_for_game(game_id), []),
                        _safe_get(get_win_probability(game_id)),
                        _safe_get(get_hustle_box_score(game_id)),
                    ),
                    timeout=28.0,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Game detail fetch timed out for {game_id}")
                return None
        else:
            # Fallback path: game not in cache (e.g. past date, or cache empty) — resolve by box score
            if scoreboard_data and scoreboard_data.scoreboard:
                logger.debug("Game %s not in scoreboard cache, trying box score API", game_id)
            box_score = await _safe_get(getBoxScore(game_id))
            if box_score is None:
                logger.info("Game %s not found: not in scoreboard and box score API returned no data", game_id)
                return None
            status_text = (box_score.status or "").strip().lower()
            if "final" in status_text:
                status = "completed"
                game_status_int = GAME_STATUS_FINAL
            elif any(x in status_text for x in ("scheduled", "postponed", "canceled", "cancelled")):
                status = "upcoming"
                game_status_int = GAME_STATUS_SCHEDULED
            else:
                status = "live"
                game_status_int = GAME_STATUS_LIVE
            home = box_score.home_team
            away = box_score.away_team
            game = SimpleNamespace(
                gameId=game_id,
                gameStatus=game_status_int,
                period=0,
                gameClock=None,
                homeTeam=SimpleNamespace(
                    teamId=home.team_id,
                    teamName=home.team_name,
                    teamTricode=None,
                    score=home.score,
                    wins=None,
                    losses=None,
                ),
                awayTeam=SimpleNamespace(
                    teamId=away.team_id,
                    teamName=away.team_name,
                    teamTricode=None,
                    score=away.score,
                    wins=None,
                    losses=None,
                ),
            )
            try:
                play_by_play, key_moments, win_probability, hustle = await asyncio.wait_for(
                    asyncio.gather(
                        _safe_get(getPlayByPlay(game_id)),
                        _safe_get(get_key_moments_for_game(game_id), []),
                        _safe_get(get_win_probability(game_id)),
                        _safe_get(get_hustle_box_score(game_id)),
                    ),
                    timeout=28.0,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Game detail fallback fetch timed out for {game_id}")
                return None

        if key_moments is None:
            key_moments = []

        quarter_scores = _extract_quarter_scores(play_by_play)
        player_impacts = _compute_player_impacts(box_score)

        home_record = None
        away_record = None
        if game.homeTeam.wins is not None and game.homeTeam.losses is not None:
            home_record = f"{game.homeTeam.wins}-{game.homeTeam.losses}"
        if game.awayTeam.wins is not None and game.awayTeam.losses is not None:
            away_record = f"{game.awayTeam.wins}-{game.awayTeam.losses}"

        score_section = _build_score_section(
            box_score,
            quarter_scores,
            period=game.period,
            clock=game.gameClock,
            home_record=home_record,
            away_record=away_record,
            home_tricode=getattr(game.homeTeam, "teamTricode", None),
            away_tricode=getattr(game.awayTeam, "teamTricode", None),
        )

        # Enhanced box score (game_score, pts_per_min, etc.)
        box_score_dict = _enhance_box_score(box_score)

        # AI summary: use cache if present; otherwise schedule background generation so we don't block the response
        game_summary = None
        if status == "completed":
            if game_id in _game_summary_cache:
                cached_text, _ = _game_summary_cache[game_id]
                game_summary = cached_text
            else:
                asyncio.create_task(
                    _generate_game_summary(game_id, box_score, key_moments, player_impacts, score_section)
                )

        play_by_play_list = None
        momentum_data = None
        if play_by_play and play_by_play.plays:
            play_by_play_list = [p.model_dump() for p in play_by_play.plays]
            home_tricode = getattr(game.homeTeam, "teamTricode", None)
            home_team_id = box_score.home_team.team_id if box_score else None
            momentum_data = _calculate_momentum(
                play_by_play.plays,
                home_tricode=home_tricode,
                home_team_id=home_team_id,
            )

        return {
            "game_id": game_id,
            "status": status,
            "score": score_section.model_dump(),
            "box_score": box_score_dict,
            "player_impacts": [p.model_dump() for p in player_impacts],
            "key_moments": key_moments,
            "win_probability": win_probability,
            "game_summary": game_summary,
            "play_by_play": play_by_play_list,
            "momentum_data": momentum_data,
            "hustle": hustle,
        }
