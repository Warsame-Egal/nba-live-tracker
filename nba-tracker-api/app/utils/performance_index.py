"""
Performance index: single 0-100 composite score per player (data engineering, not ML).
Used for colored badges on player cards, sortable on league leaders, comparable on compare page.
"""

from typing import Any


def calculate_performance_index(player: Any) -> float:
    """
    Composite 0-100 score from box-score-style stats. Weights: PTS 1.0, REB 1.2,
    AST 1.5, STL/BLK 2.0, TOV -1.5, TS_PCT (vs 0.55) * 20, NET_RATING * 0.5.
    Clamped to [0, 100], normalized by raw/45 scale.
    """
    if not player:
        return 0.0
    if hasattr(player, "get"):
        get_ = player.get
    else:
        get_ = getattr

    def _get(key: str, default: float = 0) -> float:
        try:
            v = get_(key, default) if callable(get_) else getattr(player, key, default)
            return float(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    raw = (
        _get("PTS", 0) * 1.0
        + _get("REB", 0) * 1.2
        + _get("AST", 0) * 1.5
        + _get("STL", 0) * 2.0
        + _get("BLK", 0) * 2.0
        - _get("TOV", 0) * 1.5
        + _get("TS_PCT", 0.55) * 20
        + _get("NET_RATING", 0) * 0.5
    )
    # Scale so typical good game ~45 raw -> 100
    scaled = (raw / 45.0) * 100.0
    return round(max(0.0, min(100.0, scaled)), 1)
