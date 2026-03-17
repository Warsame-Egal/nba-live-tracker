"""Normalize NBA game IDs to the 10-digit format required by the NBA API."""


def normalize_game_id(game_id: str) -> str:
    """
    Normalize game ID to exactly 10 digits with leading zeros.

    The NBA API expects game_id in the form 0022500983 (10 digits).
    Schedule/ScoreboardV2 may return GAME_ID as an integer (e.g. 22500983);
    the live scoreboard uses string gameId with leading zeros.
    """
    s = str(game_id).strip()
    if not s or not s.isdigit():
        return s
    return s.zfill(10)
