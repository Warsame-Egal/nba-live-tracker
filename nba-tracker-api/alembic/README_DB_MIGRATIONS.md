# Alembic Migration Setup for Async FastAPI Projects

This README provides a reliable setup for running Alembic migrations using a **sync engine** (`psycopg2`)

---

## 1. .env File

Create or update your `.env` file with:

```
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@postgres:5432/nba
```

---

## 2. Docker Compose Setup

Update your `docker-compose.yml` under the `backend` service:

```yaml
services:
  backend:
    environment:
      - DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@postgres:5432/nba
```

---

## 3. env.py for Alembic

Replace `alembic/env.py` with this version:

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.database import Base
import app.models  # Ensure all models are imported

from dotenv import load_dotenv
load_dotenv()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

DATABASE_URL_SYNC = os.getenv(
    "DATABASE_URL_SYNC",
    config.get_main_option("sqlalchemy.url")
)

config.set_main_option("sqlalchemy.url", DATABASE_URL_SYNC)
target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(
        url=DATABASE_URL_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## 4. Install psycopg2

Install the sync PostgreSQL driver:

```
pip install psycopg2-binary
```

---

## 5. Run Migrations

Generate migration file:

```
docker-compose run --rm backend alembic revision --autogenerate -m "message"
```

Apply migrations:

```
docker-compose run --rm backend alembic upgrade head
```

---

## 6. Full Alembic Workflow (From Scratch)

If starting fresh:

### Initialize Alembic in your project:

```bash
alembic init alembic
```

This creates the `alembic/` folder and `alembic.ini`.

---

### Set up your `alembic/env.py` (see section 3 above).

Make sure `alembic/env.py` uses the sync version that loads `DATABASE_URL_SYNC`.

---

### Generate your first migration:

```bash
docker-compose run --rm backend alembic revision --autogenerate -m "Initial migration"
```

---

### Apply the migration to your database:

```bash
docker-compose run --rm backend alembic upgrade head
```

---

### (Optional) To create more migrations later:

```bash
docker-compose run --rm backend alembic revision --autogenerate -m "Add new table"
docker-compose run --rm backend alembic upgrade head
```

---

### (Optional) To downgrade (revert one migration):

```bash
docker-compose run --rm backend alembic downgrade -1
```

---

### (Optional) Check current migration version:

```bash
docker-compose run --rm backend alembic current
```

---

## Summary

- **Alembic** uses `psycopg2` and `DATABASE_URL_SYNC`

This avoids async errors during migration.
