import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

def get_database_engine():
    # If explicit DATABASE_URL is set
    db_url = settings.DATABASE_URL
    if not db_url:
        if settings.DATABASE_TYPE == "oracle":
            # Oracle thin mode URL
            # e.g. oracle+oracledb://scott:tiger@localhost:1521/?service_name=xe
            db_url = f"oracle+oracledb://{settings.ORACLE_USER}:{settings.ORACLE_PASSWORD}@{settings.ORACLE_HOST}:{settings.ORACLE_PORT}/?service_name={settings.ORACLE_SERVICE_NAME}"
        else:
            sqlite_path = settings.STORAGE_BASE_DIR / "contracts.db"
            db_url = f"sqlite:///{sqlite_path.as_posix()}"

    connect_args = {}
    if "sqlite" in db_url:
        connect_args = {"check_same_thread": False}

    try:
        engine = create_engine(db_url, connect_args=connect_args, echo=False)
        # Test connection
        with engine.connect() as conn:
            pass
        print(f"[Database] Successfully connected using URL: {db_url.split('@')[-1] if '@' in db_url else 'SQLite'}")
        return engine, db_url
    except Exception as e:
        print(f"[Database Warning] Could not connect to primary database ({db_url.split('@')[-1] if '@' in db_url else db_url}): {e}")
        # If Oracle failed, gracefully fall back to local SQLite so development and demonstration is never interrupted
        fallback_sqlite = settings.STORAGE_BASE_DIR / "contracts.db"
        fallback_url = f"sqlite:///{fallback_sqlite.as_posix()}"
        print(f"[Database Notice] Falling back to local SQLite: {fallback_sqlite} (You can update Oracle credentials in backend/.env anytime)")
        fallback_engine = create_engine(fallback_url, connect_args={"check_same_thread": False}, echo=False)
        return fallback_engine, fallback_url

from sqlalchemy import event

engine, ACTIVE_DB_URL = get_database_engine()

if "sqlite" in ACTIVE_DB_URL:
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.database.base import Base

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
