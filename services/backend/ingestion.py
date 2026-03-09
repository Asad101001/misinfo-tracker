"""
Ingestion utility — reads analyzed_posts.jsonl and writes to PostgreSQL.
Run this after the analyzer to load data into the database.
"""

import json
import os
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine, async_session, Base
from models import Post, Claim
from dotenv import load_dotenv

load_dotenv("../../.env")

ANALYZED_FILE = "../../data/analyzed_posts.jsonl"


async def create_tables():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created / verified")


async def ingest_post(session: AsyncSession, data: dict) -> bool:
    """Insert one analyzed post + its claims. Skips if already exists."""
    existing = await session.get(Post, data["id"])
    if existing:
        return False

    post = Post(
        id=data["id"],
        source=data["source"],
        title=data["title"],
        url=data["url"],
        summary=data.get("summary", ""),
        published=data.get("published", ""),
        collected_at=datetime.fromisoformat(data["collected_at"].replace("Z", "+00:00")),
        analyzed=data.get("analyzed", False),
        analyzed_at=datetime.fromisoformat(data["analyzed_at"].replace("Z", "+00:00"))
                    if data.get("analyzed_at") else None,
        highest_risk=data.get("highest_risk", "LOW"),
    )
    session.add(post)

    for claim_data in data.get("claims", []):
        veracity = claim_data.get("veracity", {})
        fc = claim_data.get("fact_check", {})
        claim = Claim(
            post_id=data["id"],
            claim_text=claim_data.get("claim", ""),
            fact_check_publisher=fc.get("publisher", ""),
            fact_check_url=fc.get("url", ""),
            fact_check_verdict=fc.get("verdict", ""),
            rating=veracity.get("rating", "UNVERIFIABLE"),
            confidence=float(veracity.get("confidence", 0.0)),
            explanation=veracity.get("explanation", ""),
            misinformation_risk=veracity.get("misinformation_risk", "LOW"),
        )
        session.add(claim)

    return True


async def run_ingestion():
    if not os.path.exists(ANALYZED_FILE):
        print("❌ No analyzed posts file found. Run analyzer.py first.")
        return

    await create_tables()

    new_count = 0
    async with async_session() as session:
        with open(ANALYZED_FILE) as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if await ingest_post(session, data):
                        new_count += 1
                except Exception as e:
                    print(f"  ✗ Skipped a record: {e}")

        await session.commit()

    print(f"✅ Ingestion complete — {new_count} new posts loaded into PostgreSQL")


if __name__ == "__main__":
    asyncio.run(run_ingestion())
