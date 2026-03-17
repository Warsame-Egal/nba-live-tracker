import asyncio
import logging
from typing import Any, Dict, List

import pandas as pd
from fastapi import HTTPException
from nba_api.stats.endpoints import (
    commonplayerinfo,
    playercareerstats,
    playerdashboardbygeneralsplits,
    playergamelog,
)
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar
from nba_api.stats.static import players as static_players

from app.config import get_api_kwargs, get_groq_api_key
from app.services.groq_client import groq_is_ready
from app.schemas.compare_schemas import (
    GameLogEntry,
    PlayerBio,
    PlayerSearchResult,
    RadarData,
    SeasonAverages,
)
from app.services.groq_client import call_groq_api, get_groq_rate_limiter
from app.utils.rate_limiter import safe_api_call

SCOUTING_SYSTEM = (
    "You are an NBA analyst. Write a comparison scouting report in 4 paragraphs. "
    "Be specific with numbers. Be opinionated — pick a winner. "
    "Use a conversational but knowledgeable tone, like an ESPN analyst. "
    "Do not invent statistics; use only the data provided."
)

logger = logging.getLogger(__name__)


class PlayerCompareService:
    """Service for player comparison data fetching and processing."""

    def __init__(self) -> None:
        self._all_players_cache: List[Dict[str, Any]] | None = None

    async def _load_players(self) -> List[Dict[str, Any]]:
        if self._all_players_cache is None:
            logger.info("Loading static players list from nba_api")
            all_players = static_players.get_players()
            # Normalize keys we care about
            self._all_players_cache = [
                {
                    "id": p.get("id"),
                    "full_name": p.get("full_name", ""),
                    "is_active": bool(p.get("is_active", False)),
                }
                for p in all_players
                if p.get("id") is not None
            ]
        return self._all_players_cache

    async def search_players(self, query: str) -> List[PlayerSearchResult]:
        players_list = await self._load_players()
        q = query.lower()
        results: List[PlayerSearchResult] = []
        for p in players_list:
            name = p["full_name"]
            if q in name.lower():
                results.append(
                    PlayerSearchResult(
                        id=p["id"],
                        full_name=name,
                        is_active=p["is_active"],
                    )
                )
            if len(results) >= 20:
                break
        return results

    async def _fetch_player_bio(self, player_id: int, season: str) -> PlayerBio:
        api_kwargs = get_api_kwargs()

        async def _call():
            return await asyncio.to_thread(
                lambda: commonplayerinfo.CommonPlayerInfo(player_id=player_id, **api_kwargs).get_data_frames()
            )

        data_frames = await safe_api_call(_call(), timeout=15.0)
        if not data_frames:
            raise HTTPException(status_code=404, detail=f"No player info for id {player_id}")
        df = data_frames[0]
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No player info for id {player_id}")
        row = df.iloc[0]

        full_name = str(row.get("DISPLAY_FIRST_LAST", "")).strip()
        team_name = str(row.get("TEAM_NAME", "")).strip()
        team_abbr = str(row.get("TEAM_ABBREVIATION", "")).strip()
        position = str(row.get("POSITION", "")).strip()
        height = str(row.get("HEIGHT", "")).strip()
        weight = str(row.get("WEIGHT", "")).strip()
        jersey = str(row.get("JERSEY", "")).strip()

        headshot_url = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"

        return PlayerBio(
            id=player_id,
            full_name=full_name,
            team=team_name,
            team_abbreviation=team_abbr,
            position=position,
            height=height,
            weight=weight,
            jersey=jersey,
            headshot_url=headshot_url,
        )

    async def get_player_bio(self, player_id: int, season: str = "2025-26") -> PlayerBio:
        """Public wrapper for pipeline: fetch player bio by id (and optional season)."""
        return await self._fetch_player_bio(player_id, season)

    async def get_season_splits(self, player_id: int, season: str) -> SeasonAverages:
        """Public wrapper for pipeline: fetch season averages (splits)."""
        return await self._fetch_season_averages(player_id, season)

    async def _fetch_season_averages(self, player_id: int, season: str) -> SeasonAverages:
        api_kwargs = get_api_kwargs()

        async def _call():
            return await asyncio.to_thread(
                lambda: playerdashboardbygeneralsplits.PlayerDashboardByGeneralSplits(
                    player_id=player_id,
                    season=season,
                    per_mode_detailed=PerModeDetailed.per_game,
                    **api_kwargs,
                ).get_data_frames()
            )

        data_frames = await safe_api_call(_call(), timeout=20.0)
        if not data_frames:
            raise HTTPException(status_code=404, detail=f"No season averages for player {player_id}")
        df = data_frames[0]
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No season averages for player {player_id}")
        row = df.iloc[0]

        def f(name: str, default: float = 0.0) -> float:
            val = row.get(name, default)
            try:
                return float(val)
            except (TypeError, ValueError):
                return default

        gp = int(row.get("GP", 0) or 0)

        return SeasonAverages(
            gp=gp,
            min=f("MIN"),
            pts=f("PTS"),
            reb=f("REB"),
            ast=f("AST"),
            stl=f("STL"),
            blk=f("BLK"),
            tov=f("TOV"),
            fg_pct=f("FG_PCT"),
            fg3_pct=f("FG3_PCT"),
            ft_pct=f("FT_PCT"),
            plus_minus=f("PLUS_MINUS"),
        )

    async def get_trend_data(
        self, player_id: int, last_n_games: int = 30, season: str = "2025-26"
    ) -> List[GameLogEntry]:
        api_kwargs = get_api_kwargs()

        async def _call():
            return await asyncio.to_thread(
                lambda: playergamelog.PlayerGameLog(
                    player_id=player_id,
                    season=season,
                    season_type_all_star=SeasonTypeAllStar.regular,
                    **api_kwargs,
                ).get_data_frames()
            )

        data_frames = await safe_api_call(_call(), timeout=20.0)
        if not data_frames:
            return []
        df = data_frames[0]
        if df.empty:
            return []

        # Ensure correct types and sort by date ascending
        df = df.copy()
        if "GAME_DATE" in df.columns:
            df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"])
            df = df.sort_values("GAME_DATE", ascending=True)
        df = df.head(last_n_games)

        games: List[GameLogEntry] = []
        for _, row in df.iterrows():
            try:
                date_str = row["GAME_DATE"].strftime("%Y-%m-%d") if not pd.isna(row.get("GAME_DATE")) else ""
                opponent = ""
                matchup = str(row.get("MATCHUP", "")).strip()
                if matchup and len(matchup) >= 3:
                    opponent = matchup[-3:]
                result = str(row.get("WL", "")).strip()
                game_id_val = row.get("GAME_ID")
                try:
                    game_id = (
                        int(game_id_val)
                        if game_id_val is not None and not (isinstance(game_id_val, float) and pd.isna(game_id_val))
                        else None
                    )
                except (ValueError, TypeError):
                    game_id = None
                games.append(
                    GameLogEntry(
                        date=date_str,
                        opponent=opponent,
                        pts=int(row.get("PTS", 0) or 0),
                        reb=int(row.get("REB", 0) or 0),
                        ast=int(row.get("AST", 0) or 0),
                        stl=int(row.get("STL", 0) or 0),
                        blk=int(row.get("BLK", 0) or 0),
                        tov=int(row.get("TOV", 0) or 0),
                        fg_pct=float(row.get("FG_PCT", 0.0) or 0.0),
                        fg3_pct=float(row.get("FG3_PCT", 0.0) or 0.0),
                        ft_pct=float(row.get("FT_PCT", 0.0) or 0.0),
                        plus_minus=float(row.get("PLUS_MINUS", 0.0) or 0.0),
                        min=float(row.get("MIN", 0.0) or 0.0),
                        result=result,
                        game_id=game_id,
                    )
                )
            except Exception as exc:
                logger.warning(f"Error parsing game log row for player {player_id}: {exc}")
                continue

        return games

    async def get_head_to_head(
        self,
        player1_id: int,
        player2_id: int,
        season: str,
        player1_games: List[GameLogEntry] | None = None,
        player2_games: List[GameLogEntry] | None = None,
    ) -> dict:
        """
        Find games where both players' teams played each other (matching GAME_ID),
        return both players' stat lines and averages over those games.
        Reuses pipeline-provided game logs when given to avoid re-fetch.
        """
        p1_logs = list(player1_games) if player1_games else []
        p2_logs = list(player2_games) if player2_games else []

        if not p1_logs or not p2_logs:
            return {
                "games_played": 0,
                "player1_averages": None,
                "player2_averages": None,
                "games": [],
            }

        # Build map game_id -> GameLogEntry for each player (only entries with game_id)
        p1_by_game: Dict[int, GameLogEntry] = {}
        for g in p1_logs:
            if getattr(g, "game_id", None) is not None:
                p1_by_game[g.game_id] = g
        p2_by_game: Dict[int, GameLogEntry] = {}
        for g in p2_logs:
            if getattr(g, "game_id", None) is not None:
                p2_by_game[g.game_id] = g

        common_ids = sorted(set(p1_by_game.keys()) & set(p2_by_game.keys()))
        games: List[dict] = []
        p1_h2h_entries: List[GameLogEntry] = []
        p2_h2h_entries: List[GameLogEntry] = []

        for gid in common_ids:
            e1 = p1_by_game[gid]
            e2 = p2_by_game[gid]
            p1_h2h_entries.append(e1)
            p2_h2h_entries.append(e2)
            games.append(
                {
                    "date": e1.date,
                    "player1_stats": e1,
                    "player2_stats": e2,
                }
            )

        if not games:
            return {
                "games_played": 0,
                "player1_averages": None,
                "player2_averages": None,
                "games": [],
            }

        def _avg_entries(entries: List[GameLogEntry]) -> SeasonAverages | None:
            if not entries:
                return None
            n = len(entries)
            return SeasonAverages(
                gp=n,
                min=sum(e.min for e in entries) / n,
                pts=sum(e.pts for e in entries) / n,
                reb=sum(e.reb for e in entries) / n,
                ast=sum(e.ast for e in entries) / n,
                stl=sum(getattr(e, "stl", 0) for e in entries) / n,
                blk=sum(getattr(e, "blk", 0) for e in entries) / n,
                tov=sum(getattr(e, "tov", 0) for e in entries) / n,
                fg_pct=sum(e.fg_pct for e in entries) / n,
                fg3_pct=sum(e.fg3_pct for e in entries) / n,
                ft_pct=sum(getattr(e, "ft_pct", 0.0) for e in entries) / n,
                plus_minus=sum(getattr(e, "plus_minus", 0.0) for e in entries) / n,
            )

        return {
            "games_played": len(games),
            "player1_averages": _avg_entries(p1_h2h_entries),
            "player2_averages": _avg_entries(p2_h2h_entries),
            "games": games,
        }

    async def get_career_summary(self, player_id: int) -> dict:
        """
        Fetch career stats via playercareerstats and compute highlights.
        Returns dict with seasons_played, career_averages, career_totals,
        peak_season, best_seasons (top 3 by PPG), consistency_score, seasons.
        """
        api_kwargs = get_api_kwargs()

        async def _call():
            return await asyncio.to_thread(
                lambda: playercareerstats.PlayerCareerStats(
                    player_id=player_id,
                    **api_kwargs,
                ).get_data_frames()
            )

        data_frames = await safe_api_call(_call(), timeout=20.0)
        if not data_frames:
            raise HTTPException(status_code=404, detail=f"No career data for player {player_id}")
        df = data_frames[0]
        if df.empty or "SEASON_ID" not in df.columns:
            return {
                "seasons_played": 0,
                "career_averages": {},
                "career_totals": {},
                "peak_season": None,
                "best_seasons": [],
                "consistency_score": 0.0,
                "seasons": [],
            }

        total_gp = int(df["GP"].sum())
        if total_gp == 0:
            return {
                "seasons_played": len(df),
                "career_averages": {},
                "career_totals": {},
                "peak_season": None,
                "best_seasons": [],
                "consistency_score": 0.0,
                "seasons": [],
            }

        def safe_float(series, default: float = 0.0) -> float:
            try:
                return float(series.sum())
            except (TypeError, ValueError):
                return default

        career_totals = {
            "pts": int(safe_float(df["PTS"])),
            "reb": int(safe_float(df["REB"])),
            "ast": int(safe_float(df["AST"])),
            "stl": int(safe_float(df["STL"]) if "STL" in df.columns else 0),
            "blk": int(safe_float(df["BLK"]) if "BLK" in df.columns else 0),
        }
        career_averages = {
            "pts": safe_float(df["PTS"]) / total_gp,
            "reb": safe_float(df["REB"]) / total_gp,
            "ast": safe_float(df["AST"]) / total_gp,
            "stl": safe_float(df["STL"]) / total_gp if "STL" in df.columns else 0.0,
            "blk": safe_float(df["BLK"]) / total_gp if "BLK" in df.columns else 0.0,
            "fg_pct": float(df["FG_PCT"].mean()) if "FG_PCT" in df.columns else 0.0,
            "fg3_pct": float(df["FG3_PCT"].mean()) if "FG3_PCT" in df.columns else 0.0,
        }

        seasons_list: List[dict] = []
        for _, row in df.iterrows():
            gp = int(row.get("GP", 0) or 0)
            if gp == 0:
                continue
            season_id = str(row.get("SEASON_ID", "")).strip()
            team = str(row.get("TEAM_ABBREVIATION", "")).strip()
            pts = float(row.get("PTS", 0) or 0) / gp
            reb = float(row.get("REB", 0) or 0) / gp
            ast = float(row.get("AST", 0) or 0) / gp
            stl = float(row.get("STL", 0) or 0) / gp if "STL" in row.index else 0.0
            blk = float(row.get("BLK", 0) or 0) / gp if "BLK" in row.index else 0.0
            fg_pct = float(row.get("FG_PCT", 0) or 0)
            fg3_pct = float(row.get("FG3_PCT", 0) or 0)
            seasons_list.append(
                {
                    "season": season_id,
                    "team": team,
                    "gp": gp,
                    "pts": round(pts, 1),
                    "reb": round(reb, 1),
                    "ast": round(ast, 1),
                    "stl": round(stl, 1),
                    "blk": round(blk, 1),
                    "fg_pct": fg_pct,
                    "fg3_pct": fg3_pct,
                }
            )

        seasons_list.sort(key=lambda x: x["season"])
        seasons_played = len(seasons_list)

        if not seasons_list:
            return {
                "seasons_played": 0,
                "career_averages": career_averages,
                "career_totals": career_totals,
                "peak_season": None,
                "best_seasons": [],
                "consistency_score": 0.0,
                "seasons": [],
            }

        best_by_ppg = sorted(seasons_list, key=lambda x: x["pts"], reverse=True)
        peak = best_by_ppg[0] if best_by_ppg else None
        best_three = best_by_ppg[:3]

        above_20_ppg = sum(1 for s in seasons_list if s["pts"] >= 20.0)
        consistency_score = round((above_20_ppg / seasons_played * 100.0), 1) if seasons_played else 0.0

        return {
            "seasons_played": seasons_played,
            "career_averages": career_averages,
            "career_totals": career_totals,
            "peak_season": peak,
            "best_seasons": best_three,
            "consistency_score": consistency_score,
            "seasons": seasons_list,
        }

    async def get_player_seasons(self, player_id: int) -> List[str]:
        """Return ordered list of season IDs (e.g. ['2003-04', ..., '2025-26']) for a player."""
        api_kwargs = get_api_kwargs()

        async def _call():
            return await asyncio.to_thread(
                lambda: playercareerstats.PlayerCareerStats(
                    player_id=player_id,
                    **api_kwargs,
                ).get_data_frames()
            )

        data_frames = await safe_api_call(_call(), timeout=15.0)
        if not data_frames:
            return []
        df = data_frames[0]
        if df.empty or "SEASON_ID" not in df.columns:
            return []
        seasons = df["SEASON_ID"].astype(str).str.strip().unique().tolist()
        return sorted(seasons)

    def compute_efficiency_metrics(self, averages: SeasonAverages) -> dict:
        """
        Compute advanced efficiency metrics from season averages.
        No additional API call — pure math on existing data.
        """
        if averages.min and averages.min > 0:
            pts_per_minute = round(averages.pts / averages.min, 2)
        else:
            pts_per_minute = 0.0
        if averages.tov and averages.tov > 0:
            ast_to_tov = round(averages.ast / averages.tov, 2)
        else:
            ast_to_tov = round(averages.ast, 2) if averages.ast else 0.0
        if averages.min and averages.min > 0:
            stl_blk = (getattr(averages, "stl", 0) or 0) + (getattr(averages, "blk", 0) or 0)
            defensive_impact = round(stl_blk / averages.min, 2)
        else:
            defensive_impact = 0.0
        fg = getattr(averages, "fg_pct", 0) or 0
        fg3 = getattr(averages, "fg3_pct", 0) or 0
        ft = getattr(averages, "ft_pct", 0) or 0
        scoring_efficiency = round((fg + fg3 + ft) / 3.0, 3) if (fg or fg3 or ft) else 0.0
        denom = (averages.pts or 0) + (averages.ast or 0) * 2
        usage_estimate = round((averages.pts or 0) / denom, 2) if denom > 0 else 0.0
        return {
            "pts_per_minute": pts_per_minute,
            "ast_to_tov": ast_to_tov,
            "defensive_impact": defensive_impact,
            "scoring_efficiency": scoring_efficiency,
            "usage_estimate": usage_estimate,
        }

    def compute_hot_streak(self, recent_games: List[Any], season_averages: Dict[str, float]) -> Dict[str, Any]:
        """
        Compare last 5 games to season averages.
        For each stat (PTS, REB, AST, FG_PCT, FG3_PCT): last 5 avg vs season avg,
        delta and pct change, trend: hot (>10% above), cold (<10% below), steady.
        """
        stat_keys = ["pts", "reb", "ast", "fg_pct", "fg3_pct"]
        season = dict(season_averages) if season_averages else {}
        last_5 = list(recent_games)[-5:] if recent_games else []

        if not last_5:
            return {
                "last_5_averages": {},
                "season_averages": season,
                "deltas": {},
                "overall_trend": "steady",
                "summary": "No recent games to compare",
            }

        def _get_float(g: Any, k: str) -> float:
            if hasattr(g, k):
                return float(getattr(g, k, 0) or 0)
            return float((g.get(k, 0) or 0))

        last_5_avgs: Dict[str, float] = {}
        for k in stat_keys:
            vals = [_get_float(g, k) for g in last_5]
            last_5_avgs[k] = sum(vals) / len(vals) if vals else 0.0

        deltas: Dict[str, Dict[str, Any]] = {}
        hot_cold_steady = []
        for k in stat_keys:
            s_avg = season.get(k, 0.0) or 0.0
            l5 = last_5_avgs.get(k, 0.0)
            if s_avg == 0:
                delta_val = 0.0
                pct = 0.0
                trend = "steady"
            else:
                delta_val = l5 - s_avg
                pct = (delta_val / s_avg) * 100.0
                if pct > 10:
                    trend = "hot"
                elif pct < -10:
                    trend = "cold"
                else:
                    trend = "steady"
            deltas[k] = {"value": round(delta_val, 2), "pct": round(pct, 1), "trend": trend}
            hot_cold_steady.append(trend)

        hot_count = sum(1 for t in hot_cold_steady if t == "hot")
        cold_count = sum(1 for t in hot_cold_steady if t == "cold")
        if hot_count > cold_count and hot_count >= 2:
            overall_trend = "hot"
        elif cold_count > hot_count and cold_count >= 2:
            overall_trend = "cold"
        else:
            overall_trend = "steady"

        # Summary: pick a notable stat or generic
        parts = []
        for k, d in deltas.items():
            if d["trend"] == "hot" and d["pct"] > 10:
                label = {
                    "pts": "Scoring",
                    "reb": "Rebounding",
                    "ast": "Assists",
                    "fg_pct": "FG%",
                    "fg3_pct": "3P%",
                }.get(k, k)
                parts.append(f"{label} {d['pct']:.1f}% above season average")
            elif d["trend"] == "cold" and d["pct"] < -10:
                label = {
                    "pts": "Scoring",
                    "reb": "Rebounding",
                    "ast": "Assists",
                    "fg_pct": "FG%",
                    "fg3_pct": "3P%",
                }.get(k, k)
                parts.append(f"{label} {abs(d['pct']):.1f}% below season average")
        summary = (
            " ".join(parts[:2])
            if parts
            else (
                "Performing near season average over last 5 games"
                if overall_trend == "steady"
                else ("Trending up over last 5 games" if overall_trend == "hot" else "Trending down over last 5 games")
            )
        )

        return {
            "last_5_averages": last_5_avgs,
            "season_averages": season,
            "deltas": deltas,
            "overall_trend": overall_trend,
            "summary": summary,
        }

    def calculate_radar_stats(self, averages: SeasonAverages) -> RadarData:
        def clamp(val: float, min_val: float, max_val: float) -> float:
            return max(min_val, min(max_val, val))

        scoring = clamp(averages.pts / 35.0 * 100.0, 0.0, 100.0)

        # TS% approximation using FG%, 3P%, FT% is complex; here we use FG% as proxy
        fg_pct = clamp(averages.fg_pct, 0.0, 1.0)
        ts_norm = (fg_pct - 0.45) / (0.70 - 0.45) * 100.0
        efficiency = clamp(ts_norm, 0.0, 100.0)

        playmaking = clamp(averages.ast / 12.0 * 100.0, 0.0, 100.0)
        rebounding = clamp(averages.reb / 15.0 * 100.0, 0.0, 100.0)
        defense_raw = (averages.stl + averages.blk) if averages.stl is not None and averages.blk is not None else 0.0
        defense = clamp(defense_raw / 5.0 * 100.0, 0.0, 100.0)

        three_pct = clamp(averages.fg3_pct, 0.0, 1.0)
        three_norm = (three_pct - 0.25) / (0.45 - 0.25) * 100.0
        three_point = clamp(three_norm, 0.0, 100.0)

        return RadarData(
            scoring=scoring,
            efficiency=efficiency,
            playmaking=playmaking,
            rebounding=rebounding,
            defense=defense,
            three_point=three_point,
        )

    async def generate_scouting_report(
        self,
        player1_bio: PlayerBio | None,
        player2_bio: PlayerBio | None,
        player1_averages: SeasonAverages | None,
        player2_averages: SeasonAverages | None,
        player1_streak: Dict[str, Any] | None = None,
        player2_streak: Dict[str, Any] | None = None,
        head_to_head: Dict[str, Any] | None = None,
    ) -> str | None:
        if not groq_is_ready():
            logger.warning("Groq not configured; skipping scouting report generation.")
            return None
        if not player1_bio or not player2_bio or not player1_averages or not player2_averages:
            return None

        groq_key = get_groq_api_key()
        system_message = SCOUTING_SYSTEM

        p1_form = (player1_streak or {}).get("summary", "No recent form data")
        p2_form = (player2_streak or {}).get("summary", "No recent form data")
        p1_last5 = (player1_streak or {}).get("last_5_averages") or {}
        p2_last5 = (player2_streak or {}).get("last_5_averages") or {}
        p1_last5_str = ", ".join(
            f"{k.upper()}: {v:.1f}" for k, v in sorted(p1_last5.items()) if isinstance(v, (int, float))
        )
        p2_last5_str = ", ".join(
            f"{k.upper()}: {v:.1f}" for k, v in sorted(p2_last5.items()) if isinstance(v, (int, float))
        )
        if not p1_last5_str:
            p1_last5_str = "—"
        if not p2_last5_str:
            p2_last5_str = "—"

        h2h_block = "Haven't played each other yet."
        if head_to_head and head_to_head.get("games_played", 0) > 0:
            gp = head_to_head["games_played"]
            p1_avg = head_to_head.get("player1_averages")
            p2_avg = head_to_head.get("player2_averages")
            parts = [f"They've met {gp} time(s) this season."]
            if p1_avg and hasattr(p1_avg, "pts"):
                parts.append(
                    f"Player 1 head-to-head: {p1_avg.pts:.1f} PTS, {p1_avg.reb:.1f} REB, {p1_avg.ast:.1f} AST."
                )
            if p2_avg and hasattr(p2_avg, "pts"):
                parts.append(
                    f"Player 2 head-to-head: {p2_avg.pts:.1f} PTS, {p2_avg.reb:.1f} REB, {p2_avg.ast:.1f} AST."
                )
            h2h_block = " ".join(parts)

        user_prompt = (
            "=== PLAYER 1: "
            f"{player1_bio.full_name} ({player1_bio.team_abbreviation}, {player1_bio.position}) ===\n"
            f"Season Averages: {player1_averages.pts:.1f} PTS, {player1_averages.reb:.1f} REB, "
            f"{player1_averages.ast:.1f} AST on {player1_averages.fg_pct:.3f} FG% / "
            f"{player1_averages.fg3_pct:.3f} 3PT%\n"
            f"Current Form: {p1_form}\n"
            f"Last 5 Games: {p1_last5_str}\n\n"
            "=== PLAYER 2: "
            f"{player2_bio.full_name} ({player2_bio.team_abbreviation}, {player2_bio.position}) ===\n"
            f"Season Averages: {player2_averages.pts:.1f} PTS, {player2_averages.reb:.1f} REB, "
            f"{player2_averages.ast:.1f} AST on {player2_averages.fg_pct:.3f} FG% / "
            f"{player2_averages.fg3_pct:.3f} 3PT%\n"
            f"Current Form: {p2_form}\n"
            f"Last 5 Games: {p2_last5_str}\n\n"
            "=== HEAD-TO-HEAD THIS SEASON ===\n"
            f"{h2h_block}\n\n"
            "Write a 4-paragraph scouting report:\n"
            "1. Overall comparison — who's having the better season and why.\n"
            "2. Strengths and weaknesses — what each player does better.\n"
            "3. Current form — who's hotter right now and what's driving it.\n"
            "4. Verdict — if you're building a team for a playoff run, who do you take and why."
        )

        try:
            limiter = get_groq_rate_limiter()
            response = await call_groq_api(
                api_key=groq_key,
                system_message=system_message,
                user_prompt=user_prompt,
                rate_limiter=limiter,
            )
            content = response.get("content") or ""
            return content
        except Exception as exc:
            logger.warning(f"Error generating scouting report: {exc}")
            return None
