import os
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

from app.database import Base
from app.models import Player
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app

engine = create_async_engine(os.environ["DATABASE_URL"])

async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.get_event_loop().run_until_complete(setup_db())

async def seed_db():
    async with AsyncSession(engine) as session:
        session.add(Player(id=1641842, name="Test Player"))
        await session.commit()

asyncio.get_event_loop().run_until_complete(seed_db())

client = TestClient(app)


def test_get_player():
    response = client.get("/api/v1/player/1641842")
    assert response.status_code == 200
    # call again to ensure cached in DB
    response2 = client.get("/api/v1/player/1641842")
    assert response2.status_code == 200