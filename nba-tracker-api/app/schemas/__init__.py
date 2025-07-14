# makes "models" a "Python subpackage"
# makes "schemas" a Python package

from .player import Player, TeamRoster, PlayerGamePerformance, PlayerSummary
from .team import (
    TeamDetails,
    GameSummary,
    TeamSummary,
    TeamDetailsResponse,
    TeamRosterResponse,
)
from .game import GameSummary as GameSummarySchema, PlayerGameEntry, PlayerGameStats, GameDetailsResponse
from .schedule import TeamSummary as ScheduleTeamSummary, TopScorer, GameSummary as ScheduleGameSummary, GamesResponse
from .scoreboard import ScoreboardResponse
from .standings import StandingsResponse

from .player_db import PlayerDB
from .team_db import TeamDB
from .game_db import GameDB
from .gamestat_db import GameStatDB

__all__ = [
    "Player",
    "TeamRoster",
    "PlayerGamePerformance",
    "PlayerSummary",
    "TeamDetails",
    "GameSummary",
    "TeamSummary",
    "TeamDetailsResponse",
    "TeamRosterResponse",
    "PlayerGameStats",
    "PlayerGameEntry",
    "GameDetailsResponse",
    "ScheduleTeamSummary",
    "TopScorer",
    "ScheduleGameSummary",
    "GamesResponse",
    "ScoreboardResponse",
    "StandingsResponse",
    "PlayerDB",
    "TeamDB",
    "GameDB",
    "GameStatDB",
]