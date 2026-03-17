"""
Application-wide constants for NBA Tracker API.

Game status values match the NBA API scoreboard response (gameStatus field).
"""

# Game status (NBA API scoreboard gameStatus)
GAME_STATUS_SCHEDULED = 1
GAME_STATUS_LIVE = 2  # In Progress
GAME_STATUS_FINAL = 3

# Cache / polling
CACHE_CLEANUP_INTERVAL_SECONDS = 300  # 5 minutes
CACHE_STALE_WARNING_AGE_SECONDS = 60  # Consider cache stale after 1 minute
CACHE_PLAYBYPLAY_TIMEOUT_SECONDS = 10.0

# NBA API rate limiting (used by rate_limiter and health)
NBA_API_MIN_DELAY_SECONDS = 0.6  # 600ms between calls

# Groq rate limit window (rolling window in seconds)
GROQ_RATE_LIMIT_WINDOW_SECONDS = 60
