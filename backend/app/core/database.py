from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from app.core.config import get_settings


settings = get_settings()

_db_url = settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif _db_url.startswith("postgresql://") and "+psycopg2" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(_db_url, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

