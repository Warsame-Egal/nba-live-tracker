from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ScoreboardGame(Base):
    """Representation of a single game from the `/scoreboard` endpoint."""

    __tablename__ = "scoreboard_games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    gameDate: Mapped[str] = mapped_column(String)
    gameId: Mapped[str] = mapped_column(String)
    gameStatus: Mapped[int] = mapped_column(Integer)
    gameStatusText: Mapped[str] = mapped_column(String)
    period: Mapped[int] = mapped_column(Integer)
    gameClock: Mapped[str | None] = mapped_column(String, nullable=True)
    gameTimeUTC: Mapped[str] = mapped_column(String)

    homeTeam_teamId: Mapped[int] = mapped_column(Integer)
    homeTeam_teamName: Mapped[str] = mapped_column(String)
    homeTeam_teamCity: Mapped[str] = mapped_column(String)
    homeTeam_teamTricode: Mapped[str] = mapped_column(String)
    homeTeam_wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeTeam_losses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeTeam_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeTeam_timeoutsRemaining: Mapped[int | None] = mapped_column(Integer, nullable=True)

    awayTeam_teamId: Mapped[int] = mapped_column(Integer)
    awayTeam_teamName: Mapped[str] = mapped_column(String)
    awayTeam_teamCity: Mapped[str] = mapped_column(String)
    awayTeam_teamTricode: Mapped[str] = mapped_column(String)
    awayTeam_wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayTeam_losses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayTeam_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayTeam_timeoutsRemaining: Mapped[int | None] = mapped_column(Integer, nullable=True)

    homeLeader_personId: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeLeader_name: Mapped[str | None] = mapped_column(String, nullable=True)
    homeLeader_jerseyNum: Mapped[str | None] = mapped_column(String, nullable=True)
    homeLeader_position: Mapped[str | None] = mapped_column(String, nullable=True)
    homeLeader_teamTricode: Mapped[str | None] = mapped_column(String, nullable=True)
    homeLeader_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeLeader_rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    homeLeader_assists: Mapped[int | None] = mapped_column(Integer, nullable=True)

    awayLeader_personId: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayLeader_name: Mapped[str | None] = mapped_column(String, nullable=True)
    awayLeader_jerseyNum: Mapped[str | None] = mapped_column(String, nullable=True)
    awayLeader_position: Mapped[str | None] = mapped_column(String, nullable=True)
    awayLeader_teamTricode: Mapped[str | None] = mapped_column(String, nullable=True)
    awayLeader_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayLeader_rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awayLeader_assists: Mapped[int | None] = mapped_column(Integer, nullable=True)

    pbOdds_team: Mapped[str | None] = mapped_column(String, nullable=True)
    pbOdds_odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    pbOdds_suspended: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TeamRecord(Base):
    """Model for `/scoreboard/team/{team_id}/record` endpoint."""

    __tablename__ = "team_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
    conference: Mapped[str] = mapped_column(String)
    division: Mapped[str] = mapped_column(String)
    wins: Mapped[int] = mapped_column(Integer)
    losses: Mapped[int] = mapped_column(Integer)
    win_pct: Mapped[float] = mapped_column(Float)
    home_record: Mapped[str] = mapped_column(String)
    road_record: Mapped[str] = mapped_column(String)
    last_10: Mapped[str] = mapped_column(String)
    current_streak: Mapped[str] = mapped_column(String)


class TeamRosterEntry(Base):
    """Single player row from the team roster endpoint."""

    __tablename__ = "team_roster_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
    season: Mapped[str] = mapped_column(String)
    player_id: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)
    jersey_number: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[str | None] = mapped_column(String, nullable=True)
    height: Mapped[str | None] = mapped_column(String, nullable=True)
    weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_date: Mapped[str | None] = mapped_column(String, nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience: Mapped[str | None] = mapped_column(String, nullable=True)
    school: Mapped[str | None] = mapped_column(String, nullable=True)


class BoxScoreTeamStats(Base):
    """Team-level statistics from the box score endpoint."""

    __tablename__ = "box_score_team_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    is_home_team: Mapped[bool] = mapped_column(Boolean)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
    score: Mapped[int] = mapped_column(Integer)
    field_goal_pct: Mapped[float] = mapped_column(Float)
    three_point_pct: Mapped[float] = mapped_column(Float)
    free_throw_pct: Mapped[float] = mapped_column(Float)
    rebounds_total: Mapped[int] = mapped_column(Integer)
    assists: Mapped[int] = mapped_column(Integer)
    steals: Mapped[int] = mapped_column(Integer)
    blocks: Mapped[int] = mapped_column(Integer)
    turnovers: Mapped[int] = mapped_column(Integer)


class BoxScorePlayerStats(Base):
    """Player statistics from the box score endpoint."""

    __tablename__ = "box_score_player_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    is_home_team: Mapped[bool] = mapped_column(Boolean)
    player_id: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)
    position: Mapped[str | None] = mapped_column(String, nullable=True)
    minutes: Mapped[str | None] = mapped_column(String, nullable=True)
    points: Mapped[int] = mapped_column(Integer)
    rebounds: Mapped[int] = mapped_column(Integer)
    assists: Mapped[int] = mapped_column(Integer)
    steals: Mapped[int] = mapped_column(Integer)
    blocks: Mapped[int] = mapped_column(Integer)
    turnovers: Mapped[int] = mapped_column(Integer)


class TeamGameStats(Base):
    """Model for `/scoreboard/game/{game_id}/team/{team_id}/stats` endpoint."""

    __tablename__ = "team_game_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
    score: Mapped[int] = mapped_column(Integer)
    field_goal_pct: Mapped[float] = mapped_column(Float)
    three_point_pct: Mapped[float] = mapped_column(Float)
    free_throw_pct: Mapped[float] = mapped_column(Float)
    rebounds_total: Mapped[int] = mapped_column(Integer)
    assists: Mapped[int] = mapped_column(Integer)
    steals: Mapped[int] = mapped_column(Integer)
    blocks: Mapped[int] = mapped_column(Integer)
    turnovers: Mapped[int] = mapped_column(Integer)


class TeamGamePlayerStats(Base):
    """Player stats for a team in a specific game."""

    __tablename__ = "team_game_player_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    player_id: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)
    position: Mapped[str | None] = mapped_column(String, nullable=True)
    minutes: Mapped[str | None] = mapped_column(String, nullable=True)
    points: Mapped[int] = mapped_column(Integer)
    rebounds: Mapped[int] = mapped_column(Integer)
    assists: Mapped[int] = mapped_column(Integer)
    steals: Mapped[int] = mapped_column(Integer)
    blocks: Mapped[int] = mapped_column(Integer)
    turnovers: Mapped[int] = mapped_column(Integer)


class GameLeader(Base):
    """Top players from the `/scoreboard/game/{game_id}/leaders` endpoint."""

    __tablename__ = "game_leaders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)

    home_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_player_name: Mapped[str | None] = mapped_column(String, nullable=True)
    home_player_jerseyNum: Mapped[str | None] = mapped_column(String, nullable=True)
    home_player_position: Mapped[str | None] = mapped_column(String, nullable=True)
    home_player_teamTricode: Mapped[str | None] = mapped_column(String, nullable=True)
    home_player_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_player_rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_player_assists: Mapped[int | None] = mapped_column(Integer, nullable=True)

    away_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_player_name: Mapped[str | None] = mapped_column(String, nullable=True)
    away_player_jerseyNum: Mapped[str | None] = mapped_column(String, nullable=True)
    away_player_position: Mapped[str | None] = mapped_column(String, nullable=True)
    away_player_teamTricode: Mapped[str | None] = mapped_column(String, nullable=True)
    away_player_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_player_rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_player_assists: Mapped[int | None] = mapped_column(Integer, nullable=True)


class PlayByPlayEvent(Base):
    """Single play from the play-by-play endpoint."""

    __tablename__ = "play_by_play_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    action_number: Mapped[int] = mapped_column(Integer)
    clock: Mapped[str] = mapped_column(String)
    period: Mapped[int] = mapped_column(Integer)
    team_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_tricode: Mapped[str | None] = mapped_column(String, nullable=True)
    action_type: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    player_name: Mapped[str | None] = mapped_column(String, nullable=True)
    score_home: Mapped[str | None] = mapped_column(String, nullable=True)
    score_away: Mapped[str | None] = mapped_column(String, nullable=True)


class GameSummary(Base):
    """Row from `/schedule/date/{date}` endpoint."""

    __tablename__ = "games_for_date"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_date: Mapped[str] = mapped_column(String)
    game_id: Mapped[str] = mapped_column(String)
    matchup: Mapped[str] = mapped_column(String)
    game_status: Mapped[str] = mapped_column(String)
    arena: Mapped[str | None] = mapped_column(String, nullable=True)
    home_team_id: Mapped[int] = mapped_column(Integer)
    home_team_abbreviation: Mapped[str] = mapped_column(String)
    home_team_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_team_id: Mapped[int] = mapped_column(Integer)
    away_team_abbreviation: Mapped[str] = mapped_column(String)
    away_team_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_scorer_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_scorer_player_name: Mapped[str | None] = mapped_column(String, nullable=True)
    top_scorer_team_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_scorer_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_scorer_rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_scorer_assists: Mapped[int | None] = mapped_column(Integer, nullable=True)


class StandingRecord(Base):
    """Row from `/standings/season/{season}` endpoint."""

    __tablename__ = "season_standings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    season_id: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    team_city: Mapped[str] = mapped_column(String)
    team_name: Mapped[str] = mapped_column(String)
    conference: Mapped[str] = mapped_column(String)
    division: Mapped[str] = mapped_column(String)
    wins: Mapped[int] = mapped_column(Integer)
    losses: Mapped[int] = mapped_column(Integer)
    win_pct: Mapped[float] = mapped_column(Float)
    playoff_rank: Mapped[int] = mapped_column(Integer)
    home_record: Mapped[str] = mapped_column(String)
    road_record: Mapped[str] = mapped_column(String)
    conference_record: Mapped[str] = mapped_column(String)
    division_record: Mapped[str] = mapped_column(String)
    l10_record: Mapped[str] = mapped_column(String)
    current_streak: Mapped[int] = mapped_column(Integer)
    current_streak_str: Mapped[str] = mapped_column(String)
    games_back: Mapped[str] = mapped_column(String)


class TeamStanding(Base):
    """Row from `/standings/team/{team_id}/season/{season}` endpoint."""

    __tablename__ = "team_standings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    season: Mapped[str] = mapped_column(String)
    team_city: Mapped[str] = mapped_column(String)
    team_name: Mapped[str] = mapped_column(String)
    conference: Mapped[str] = mapped_column(String)
    division: Mapped[str] = mapped_column(String)
    wins: Mapped[int] = mapped_column(Integer)
    losses: Mapped[int] = mapped_column(Integer)
    win_pct: Mapped[float] = mapped_column(Float)
    playoff_rank: Mapped[int] = mapped_column(Integer)
    home_record: Mapped[str] = mapped_column(String)
    road_record: Mapped[str] = mapped_column(String)
    conference_record: Mapped[str] = mapped_column(String)
    division_record: Mapped[str] = mapped_column(String)
    l10_record: Mapped[str] = mapped_column(String)
    current_streak: Mapped[int] = mapped_column(Integer)
    current_streak_str: Mapped[str] = mapped_column(String)
    games_back: Mapped[str] = mapped_column(String)


class PlayerGamePerformance(Base):
    """Recent game performance for a player."""

    __tablename__ = "player_recent_games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    PERSON_ID: Mapped[int] = mapped_column(Integer)
    game_id: Mapped[str] = mapped_column(String)
    date: Mapped[str] = mapped_column(String)
    opponent_team_abbreviation: Mapped[str] = mapped_column(String)
    points: Mapped[int] = mapped_column(Integer)
    rebounds: Mapped[int] = mapped_column(Integer)
    assists: Mapped[int] = mapped_column(Integer)
    steals: Mapped[int] = mapped_column(Integer)
    blocks: Mapped[int] = mapped_column(Integer)


class PlayerSummaryEntry(Base):
    """Row from `/player/{player_id}` endpoint."""

    __tablename__ = "player_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    PERSON_ID: Mapped[int] = mapped_column(Integer)
    PLAYER_LAST_NAME: Mapped[str] = mapped_column(String)
    PLAYER_FIRST_NAME: Mapped[str] = mapped_column(String)
    PLAYER_SLUG: Mapped[str | None] = mapped_column(String, nullable=True)
    TEAM_ID: Mapped[int | None] = mapped_column(Integer, nullable=True)
    TEAM_SLUG: Mapped[str | None] = mapped_column(String, nullable=True)
    IS_DEFUNCT: Mapped[int | None] = mapped_column(Integer, nullable=True)
    TEAM_CITY: Mapped[str | None] = mapped_column(String, nullable=True)
    TEAM_NAME: Mapped[str | None] = mapped_column(String, nullable=True)
    TEAM_ABBREVIATION: Mapped[str | None] = mapped_column(String, nullable=True)
    JERSEY_NUMBER: Mapped[str | None] = mapped_column(String, nullable=True)
    POSITION: Mapped[str | None] = mapped_column(String, nullable=True)
    HEIGHT: Mapped[str | None] = mapped_column(String, nullable=True)
    WEIGHT: Mapped[int | None] = mapped_column(Integer, nullable=True)
    COLLEGE: Mapped[str | None] = mapped_column(String, nullable=True)
    COUNTRY: Mapped[str | None] = mapped_column(String, nullable=True)
    ROSTER_STATUS: Mapped[str | None] = mapped_column(String, nullable=True)
    PTS: Mapped[float | None] = mapped_column(Float, nullable=True)
    REB: Mapped[float | None] = mapped_column(Float, nullable=True)
    AST: Mapped[float | None] = mapped_column(Float, nullable=True)
    STATS_TIMEFRAME: Mapped[str | None] = mapped_column(String, nullable=True)
    FROM_YEAR: Mapped[int | None] = mapped_column(Integer, nullable=True)
    TO_YEAR: Mapped[int | None] = mapped_column(Integer, nullable=True)


class PlayerSearchResult(Base):
    """Row from `/players/search/{search_term}` results."""

    __tablename__ = "player_search_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    search_term: Mapped[str] = mapped_column(String)
    player_id: Mapped[int] = mapped_column(Integer)
    player_name: Mapped[str] = mapped_column(String)


class GameDetailPlayer(Base):
    """Player entry from `/games/{game_id}` endpoint."""

    __tablename__ = "game_detail_players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    player_id: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    team_abbreviation: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    jersey_num: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[str | None] = mapped_column(String, nullable=True)


class GameDetailSummary(Base):
    """Summary row for `/games/{game_id}` endpoint."""

    __tablename__ = "game_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    game_date_est: Mapped[str] = mapped_column(String)
    game_status_text: Mapped[str] = mapped_column(String)
    home_team_id: Mapped[int] = mapped_column(Integer)
    visitor_team_id: Mapped[int] = mapped_column(Integer)
    season: Mapped[str] = mapped_column(String)


class GamePlayer(Base):
    """Row from `/games/{game_id}/players` endpoint."""

    __tablename__ = "game_players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    player_id: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    team_abbreviation: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    jersey_num: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[str | None] = mapped_column(String, nullable=True)


class GamePlayerStat(Base):
    """Row from `/games/{game_id}/stats` endpoint."""

    __tablename__ = "game_player_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    game_id: Mapped[str] = mapped_column(String)
    player_id: Mapped[int] = mapped_column(Integer)
    team_id: Mapped[int] = mapped_column(Integer)
    team_abbreviation: Mapped[str] = mapped_column(String)
    points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rebounds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    assists: Mapped[int | None] = mapped_column(Integer, nullable=True)
    minutes: Mapped[str | None] = mapped_column(String, nullable=True)
    steals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blocks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    turnovers: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TeamDetailsResponseModel(Base):
    """Row from `/teams/{team_id}` endpoint."""

    __tablename__ = "team_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
    team_city: Mapped[str] = mapped_column(String)
    abbreviation: Mapped[str | None] = mapped_column(String, nullable=True)
    year_founded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    arena: Mapped[str | None] = mapped_column(String, nullable=True)
    arena_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    general_manager: Mapped[str | None] = mapped_column(String, nullable=True)
    head_coach: Mapped[str | None] = mapped_column(String, nullable=True)
    conference: Mapped[str | None] = mapped_column(String, nullable=True)
    division: Mapped[str | None] = mapped_column(String, nullable=True)


class TeamHistoryEntry(Base):
    """Historical note for a team."""

    __tablename__ = "team_history_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String)


class TeamAwardChampionship(Base):
    """Championship award entry."""

    __tablename__ = "team_awards_championships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    result: Mapped[str] = mapped_column(String)


class TeamAwardConference(Base):
    """Conference award entry."""

    __tablename__ = "team_awards_conf"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    result: Mapped[str] = mapped_column(String)


class TeamAwardDivision(Base):
    """Division award entry."""

    __tablename__ = "team_awards_div"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    result: Mapped[str] = mapped_column(String)


class TeamSearchResult(Base):
    """Row from `/teams/search/{search_term}` results."""

    __tablename__ = "team_search_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    search_term: Mapped[str] = mapped_column(String)
    team_id: Mapped[int] = mapped_column(Integer)
    team_name: Mapped[str] = mapped_column(String)
