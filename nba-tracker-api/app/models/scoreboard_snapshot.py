from datetime import datetime
from sqlalchemy import DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class ScoreboardSnapshot(Base):
    __tablename__ = "scoreboard_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    game_date: Mapped[str] = mapped_column(Text, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    data: Mapped[str] = mapped_column(Text)