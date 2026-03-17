"""
Data aggregation pipeline that fetches from multiple nba_api endpoints,
handles partial failures gracefully, and merges results into a unified response.

Design pattern: each data source is a separate "fetcher" that can succeed or fail
independently. The pipeline collects all results and builds the best response possible.
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class FetchStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    CACHED = "cached"
    RATE_LIMITED = "rate_limited"


@dataclass
class FetchResult:
    """Result of a single data fetch operation."""

    source: str
    status: FetchStatus
    data: Any = None
    error: str | None = None
    latency_ms: float = 0
    cache_ttl_seconds: int | None = None


@dataclass
class PipelineResult:
    """Aggregated result from all fetchers."""

    results: dict[str, FetchResult] = field(default_factory=dict)

    @property
    def has_minimum_data(self) -> bool:
        """Check if we have enough data to return a useful comparison."""
        required = ["player1_bio", "player2_bio", "player1_splits", "player2_splits"]
        return all(
            self.results.get(key, FetchResult(source=key, status=FetchStatus.FAILED)).status
            in (FetchStatus.SUCCESS, FetchStatus.CACHED)
            for key in required
        )

    @property
    def fetch_summary(self) -> dict:
        """Summary of what succeeded/failed — include in API response for transparency."""
        return {
            key: {
                "status": result.status.value,
                "latency_ms": round(result.latency_ms, 1),
                "error": result.error,
                "cache_ttl_seconds": result.cache_ttl_seconds,
            }
            for key, result in self.results.items()
        }

    def get_data(self, key: str, default: Any = None) -> Any:
        result = self.results.get(key)
        if result and result.status in (FetchStatus.SUCCESS, FetchStatus.CACHED):
            return result.data
        return default


class ComparisonPipeline:
    """
    Orchestrates data fetching for player comparison.

    Fetches data from multiple nba_api endpoints with:
    - Independent failure handling per endpoint
    - Cache-first strategy (check cache before hitting API)
    - Latency tracking per fetch
    - Partial response assembly (return what we have, not all-or-nothing)
    """

    def __init__(self, compare_service: Any, cache: Any) -> None:
        self.service = compare_service
        self.cache = cache

    async def execute(
        self,
        player1_id: int,
        player2_id: int,
        season1: str,
        season2: str,
        last_n_games: int,
    ) -> PipelineResult:
        """
        Execute the full comparison pipeline.
        season1 used for player1, season2 for player2. Head-to-head only when season1 == season2.
        """
        pipeline = PipelineResult()

        # Group 1: Required data
        await self._fetch_with_tracking(pipeline, "player1_bio", self.service.get_player_bio, player1_id)
        await self._fetch_with_tracking(pipeline, "player2_bio", self.service.get_player_bio, player2_id)
        await self._fetch_with_tracking(pipeline, "player1_splits", self.service.get_season_splits, player1_id, season1)
        await self._fetch_with_tracking(pipeline, "player2_splits", self.service.get_season_splits, player2_id, season2)

        if not pipeline.has_minimum_data:
            logger.warning(f"Pipeline missing required data for {player1_id} vs {player2_id}")
            return pipeline

        # Group 2: Trend data; fetch at least 82 games so head-to-head can match full season
        fetch_n = max(last_n_games, 82)
        await self._fetch_with_tracking(
            pipeline, "player1_games", self.service.get_trend_data, player1_id, fetch_n, season1
        )
        await self._fetch_with_tracking(
            pipeline, "player2_games", self.service.get_trend_data, player2_id, fetch_n, season2
        )

        # Group 2b: Career data (enrichment — not required)
        await self._fetch_with_tracking(pipeline, "player1_career", self.service.get_career_summary, player1_id)
        await self._fetch_with_tracking(pipeline, "player2_career", self.service.get_career_summary, player2_id)

        # Group 3: Head-to-head only when same season (game logs from different seasons don't match)
        if season1 == season2:
            await self._fetch_with_tracking(
                pipeline,
                "head_to_head",
                self.service.get_head_to_head,
                player1_id,
                player2_id,
                season1,
                pipeline.get_data("player1_games", []),
                pipeline.get_data("player2_games", []),
            )
        else:
            pipeline.results["head_to_head"] = FetchResult(
                source="head_to_head",
                status=FetchStatus.SUCCESS,
                data={
                    "games_played": 0,
                    "player1_averages": None,
                    "player2_averages": None,
                    "games": [],
                },
            )

        # Group 4: Computed analytics (sync, no API call)
        p1_games = pipeline.get_data("player1_games", [])
        p2_games = pipeline.get_data("player2_games", [])
        p1_splits = pipeline.get_data("player1_splits")
        p2_splits = pipeline.get_data("player2_splits")
        p1_splits_dict = _splits_to_dict(p1_splits) if p1_splits else {}
        p2_splits_dict = _splits_to_dict(p2_splits) if p2_splits else {}
        pipeline.results["player1_hot_streak"] = FetchResult(
            source="player1_hot_streak",
            status=FetchStatus.SUCCESS,
            data=self.service.compute_hot_streak(p1_games, p1_splits_dict),
        )
        pipeline.results["player2_hot_streak"] = FetchResult(
            source="player2_hot_streak",
            status=FetchStatus.SUCCESS,
            data=self.service.compute_hot_streak(p2_games, p2_splits_dict),
        )
        if p1_splits:
            pipeline.results["player1_efficiency"] = FetchResult(
                source="player1_efficiency",
                status=FetchStatus.SUCCESS,
                data=self.service.compute_efficiency_metrics(p1_splits),
            )
        if p2_splits:
            pipeline.results["player2_efficiency"] = FetchResult(
                source="player2_efficiency",
                status=FetchStatus.SUCCESS,
                data=self.service.compute_efficiency_metrics(p2_splits),
            )

        # Group 5: AI scouting
        await self._fetch_with_tracking(
            pipeline,
            "scouting_report",
            self.service.generate_scouting_report,
            pipeline.get_data("player1_bio"),
            pipeline.get_data("player2_bio"),
            pipeline.get_data("player1_splits"),
            pipeline.get_data("player2_splits"),
            pipeline.get_data("player1_hot_streak"),
            pipeline.get_data("player2_hot_streak"),
            pipeline.get_data("head_to_head"),
        )

        return pipeline

    async def _fetch_with_tracking(self, pipeline: PipelineResult, key: str, func: Any, *args: Any) -> None:
        """Fetch data with error handling, caching, and latency tracking."""
        cache_key = f"compare:{key}:{':'.join(str(a) for a in args)}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            ttl = self._get_ttl(key)
            pipeline.results[key] = FetchResult(
                source=key,
                status=FetchStatus.CACHED,
                data=cached,
                latency_ms=0,
                cache_ttl_seconds=ttl,
            )
            return

        start = time.monotonic()
        try:
            data = await func(*args)
            latency = (time.monotonic() - start) * 1000
            ttl = self._get_ttl(key)
            pipeline.results[key] = FetchResult(
                source=key,
                status=FetchStatus.SUCCESS,
                data=data,
                latency_ms=latency,
                cache_ttl_seconds=ttl,
            )
            self.cache.set(cache_key, data, ttl_seconds=ttl)
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            err_str = str(e).lower()
            is_rate_limit = (
                "429" in str(e) or "rate_limit" in err_str or "rate limit" in err_str or "too many requests" in err_str
            )
            if is_rate_limit:
                logger.warning(f"Pipeline rate limited for {key}: {e}")
                pipeline.results[key] = FetchResult(
                    source=key,
                    status=FetchStatus.RATE_LIMITED,
                    error=str(e),
                    latency_ms=latency,
                )
            else:
                logger.error(f"Pipeline fetch failed for {key}: {e}")
                pipeline.results[key] = FetchResult(
                    source=key, status=FetchStatus.FAILED, error=str(e), latency_ms=latency
                )

    def _get_ttl(self, key: str) -> int:
        """Different TTLs for different data types."""
        ttls = {
            "player1_bio": 86400,
            "player2_bio": 86400,
            "player1_splits": 300,
            "player2_splits": 300,
            "player1_games": 300,
            "player2_games": 300,
            "head_to_head": 600,
            "player1_career": 86400,
            "player2_career": 86400,
            "scouting_report": 3600,
        }
        return ttls.get(key, 300)


def _splits_to_dict(splits: Any) -> dict[str, float]:
    """Convert SeasonAverages (or dict) to dict for compute_hot_streak."""
    if hasattr(splits, "model_dump"):
        d = splits.model_dump()
    elif isinstance(splits, dict):
        d = splits
    else:
        d = {}
    return {k: float(v) for k, v in d.items() if isinstance(v, (int, float))}
