from datetime import datetime
from sqlalchemy import DateTime, Integer, Text, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TeamDetailsCache(Base):
    __tablename__ = "team_details_cache"
    team_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)


class PlayerSummaryCache(Base):
    __tablename__ = "player_summary_cache"
    player_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)


class PlayerSearchCache(Base):
    __tablename__ = "player_search_cache"
    search_term: Mapped[str] = mapped_column(String, primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)


class ScheduleCache(Base):
    __tablename__ = "schedule_cache"
    game_date: Mapped[str] = mapped_column(String, primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)


class BoxScoreCache(Base):
    __tablename__ = "box_score_cache"
    game_id: Mapped[str] = mapped_column(String, primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)
