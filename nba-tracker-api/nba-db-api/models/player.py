from sqlalchemy import Column, Integer, String

from ..session import Base


class Player(Base):
    """SQLAlchemy model for NBA players."""

    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    team = Column(String, nullable=False)
    position = Column(String, nullable=True)
    jersey_number = Column(String, nullable=True)
    height = Column(Integer, nullable=True)
    weight = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)