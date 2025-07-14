import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager

# Read DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# Initialize SQLAlchemy engine
engine = create_engine(DATABASE_URL, future=True)

# Configure session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()

# Dependency that provides a SQLAlchemy session
@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
