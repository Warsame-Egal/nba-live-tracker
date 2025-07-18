from sqlalchemy import Integer, String
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
