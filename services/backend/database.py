"""
Async SQLAlchemy 2.0 engine and session factory.
Uses asyncpg driver for non-blocking PostgreSQL access.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import os
from dotenv import load_dotenv

load_dotenv("../../.env")

DATABASE_URL = os.getenv("POSTGRES_URL", "postgresql+asyncpg://misinfo:misinfo123@localhost:5432/misinfo")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,       # set True to see raw SQL in logs
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # detects stale connections before using them
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a DB session per request."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
