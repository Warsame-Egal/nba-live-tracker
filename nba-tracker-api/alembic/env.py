import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.database import Base
import app.models  # Ensure all models are imported

from dotenv import load_dotenv
load_dotenv()

# Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Load sync DB URL for migrations
DATABASE_URL_SYNC = os.getenv(
    "DATABASE_URL_SYNC",
    config.get_main_option("sqlalchemy.url")
)

# Set DB URL explicitly for Alembic
config.set_main_option("sqlalchemy.url", DATABASE_URL_SYNC)

# Metadata for autogenerate
target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode using sync engine."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

# Entrypoint
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
