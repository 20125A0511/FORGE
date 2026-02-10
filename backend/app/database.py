from collections.abc import AsyncGenerator

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

# Determine if we're using SQLite (for local dev without Docker)
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Engine configuration based on database type
_engine_kwargs: dict = {
    "echo": settings.DEBUG,
}

if not _is_sqlite:
    _engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

# Async engine for normal operations
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Sync engine for migrations, seed_data, and init_db
_sync_kwargs: dict = {"echo": settings.DEBUG}
if not _is_sqlite:
    _sync_kwargs["pool_pre_ping"] = True

sync_engine = create_engine(settings.DATABASE_URL_SYNC, **_sync_kwargs)

# Enable WAL mode and foreign keys for SQLite
if _is_sqlite:
    @event.listens_for(sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Declarative base for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables defined in Base metadata."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
