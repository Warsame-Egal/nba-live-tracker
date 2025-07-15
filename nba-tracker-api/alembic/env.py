import asyncio
import os
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool
from alembic import context

from app.database import Base
import app.models  # Ensure all models are imported

from dotenv import load_dotenv
load_dotenv()  # Load variables from .env

# Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata

# Load database URL (from .env or alembic.ini fallback)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    config.get_main_option("sqlalchemy.url")
)

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode using async engine."""
    connectable = create_async_engine(DATABASE_URL, poolclass=pool.NullPool)

    async def do_run_migrations():
        async with connectable.connect() as connection:
            def sync_configure(conn):
                context.configure(
                    connection=conn,
                    target_metadata=target_metadata
                )
                context.run_migrations()

            await connection.run_sync(sync_configure)

    asyncio.run(do_run_migrations())

# Entrypoint
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
