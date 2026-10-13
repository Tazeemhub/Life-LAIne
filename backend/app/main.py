import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, check_db_connection
from app.routers import upload, documents, patients, timeline, doctor, drive, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Health Copilot API...")
    try:
        await init_db()
        await check_db_connection()
        logger.info("Database ready.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    yield
    logger.info("Shutting down Health Copilot API.")


app = FastAPI(
    title="AI-Powered Personal Health Copilot",
    description="Upload medical documents, extract structured data, and get AI-generated plain-language summaries.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — robust regex allowing all local dev ports (5173, 3000, etc.) with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(patients.router)
app.include_router(timeline.router)
app.include_router(doctor.router)
app.include_router(drive.router)
app.include_router(chat.router)


@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    try:
        db_ok = await check_db_connection()
    except Exception:
        db_ok = False
    return {"status": "ok", "db": "connected" if db_ok else "unavailable"}


@app.get("/")
async def root():
    return {"message": "Health Copilot API", "docs": "/docs"}
