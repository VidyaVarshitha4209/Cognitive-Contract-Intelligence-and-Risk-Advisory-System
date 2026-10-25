"""Database engine + session. Change DATABASE_URL in .env to move to PostgreSQL later."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.database.base import Base

_is_sqlite = settings.sqlalchemy_url.startswith("sqlite")

engine = create_engine(
    settings.sqlalchemy_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _record):
        # SQLite ignores foreign keys (and cascade deletes) unless this is switched on
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    """FastAPI dependency: gives each request its own session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create storage folders and all tables (safe to run on every startup)."""
    import app.models  # noqa: F401  (importing registers every model with Base)

    for folder in (settings.upload_dir, settings.extracted_text_dir,
                   settings.vector_store_dir, settings.reports_dir):
        folder.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
