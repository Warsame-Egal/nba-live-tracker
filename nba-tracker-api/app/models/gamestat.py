from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class GameStat(Base):
    __tablename__ = "game_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"))
    points: Mapped[int] = mapped_column(Integer, default=0)
    rebounds: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)

    player = relationship("Player", back_populates="stats")
    game = relationship("Game", back_populates="stats")
    