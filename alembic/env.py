from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ✅ Use SQLAlchemy model metadata for autogenerate
from app.db.database import Base
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run database migrations in offline mode using the configured SQLAlchemy URL.
    Parameters:
        - None: This function does not accept any parameters.
    Returns:
        - None: Executes the configured migrations without returning a value."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run database migrations in online mode using a configured SQLAlchemy connection.
    Parameters:
        - None: This function does not accept any parameters.
    Returns:
        - None: Executes the configured database migrations without returning a value."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
