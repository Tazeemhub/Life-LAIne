from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

is_sqlite = "sqlite" in settings.database_url

engine_kwargs = {
    "echo": settings.environment == "development",
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })
else:
    engine_kwargs.update({
        "connect_args": {"check_same_thread": False},
    })

engine = create_async_engine(
    settings.database_url,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and apply safe migrations."""
    from app.models.domain import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Ensure dynamic migration columns on documents table
        migration_columns = [
            ("folder", "VARCHAR(50) DEFAULT 'prescriptions'"),
            ("tags", "JSON"),
            ("is_xerox", "BOOLEAN DEFAULT 0"),
            ("uploaded_by", "VARCHAR(20) DEFAULT 'patient'"),
        ]
        for col_name, col_type in migration_columns:
            try:
                await conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}"))
            except Exception:
                # Column already exists
                pass

    logger.info("Database tables and migrations created successfully.")


async def check_db_connection():
    """Health check for DB."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return True
