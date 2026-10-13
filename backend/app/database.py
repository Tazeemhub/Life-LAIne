import os
import shutil
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

def get_effective_db_url() -> str:
    db_url = settings.database_url
    if "sqlite" in db_url:
        is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
        is_readonly = not os.access(".", os.W_OK)
        if is_serverless or is_readonly:
            tmp_db = Path("/tmp/healthcopilot.db")
            if not tmp_db.exists():
                # Attempt to copy seed database so existing patients/data are preserved
                candidates = [
                    Path("healthcopilot.db"),
                    Path("backend/healthcopilot.db"),
                    Path(__file__).resolve().parent.parent.parent / "healthcopilot.db",
                ]
                for c in candidates:
                    if c.exists():
                        try:
                            shutil.copy2(c, tmp_db)
                            logger.info(f"Copied initial SQLite database from {c} to {tmp_db}")
                            break
                        except Exception as e:
                            logger.warning(f"Failed to copy initial database: {e}")
            return f"sqlite+aiosqlite:///{tmp_db}"
    return db_url

effective_db_url = get_effective_db_url()
is_sqlite = "sqlite" in effective_db_url

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
        "connect_args": {
            "check_same_thread": False,
            "timeout": 30,
        },
    })

engine = create_async_engine(
    effective_db_url,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

_db_initialized = False


async def get_db() -> AsyncSession:
    global _db_initialized
    if not _db_initialized:
        try:
            await init_db()
        except Exception as e:
            logger.warning(f"Lazy init_db failed: {e}")
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
    global _db_initialized
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

    _db_initialized = True
    logger.info("Database tables and migrations created successfully.")


async def check_db_connection():
    """Health check for DB."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return True
