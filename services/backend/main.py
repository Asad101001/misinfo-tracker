"""
FastAPI Backend — Misinfo Tracker
Serves analyzed posts, claims, stats, and velocity data.
Redis caches expensive aggregation queries.
"""

import os
import json
import asyncio
import redis.asyncio as aioredis
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timezone
from dotenv import load_dotenv

from database import get_db, engine, Base
from models import Post, Claim
from schemas import PostOut, PostSummary, ClaimOut, StatsOut, VelocityPoint

load_dotenv("../../.env")

app = FastAPI(
    title="Misinfo Tracker API",
    description="Real-time misinformation velocity tracking API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Redis client ──────────────────────────────────────────────────────────────

redis_client = aioredis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True,
)

async def get_cached(key: str):
    try:
        val = await redis_client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None

async def set_cached(key: str, value, ttl: int = 60):
    try:
        await redis_client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables verified on startup")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Posts ─────────────────────────────────────────────────────────────────────

@app.get("/posts", response_model=list[PostSummary])
async def list_posts(
    skip: int = 0,
    limit: int = 50,
    risk: str | None = None,
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Paginated list of posts. Filter by risk level or source."""
    query = select(Post).order_by(Post.collected_at.desc()).offset(skip).limit(limit)
    if risk:
        query = query.where(Post.highest_risk == risk.upper())
    if source:
        query = query.where(Post.source == source)
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/posts/{post_id}", response_model=PostOut)
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
    """Single post with all its claims and veracity scores."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.refresh(post, ["claims"])
    return post


# ── Claims ────────────────────────────────────────────────────────────────────

@app.get("/claims", response_model=list[ClaimOut])
async def list_claims(
    risk: str | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """All extracted claims, optionally filtered by misinformation risk."""
    query = select(Claim).order_by(Claim.spread_count.desc()).limit(limit)
    if risk:
        query = query.where(Claim.misinformation_risk == risk.upper())
    result = await db.execute(query)
    return result.scalars().all()


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=StatsOut)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Dashboard summary stats. Cached in Redis for 60 seconds."""
    cached = await get_cached("stats")
    if cached:
        return cached

    total_posts    = (await db.execute(select(func.count(Post.id)))).scalar()
    analyzed_posts = (await db.execute(select(func.count(Post.id)).where(Post.analyzed == True))).scalar()
    total_claims   = (await db.execute(select(func.count(Claim.id)))).scalar()
    high_risk      = (await db.execute(select(func.count(Claim.id)).where(Claim.misinformation_risk == "HIGH"))).scalar()

    # Risk breakdown
    risk_rows = (await db.execute(
        select(Post.highest_risk, func.count(Post.id))
        .group_by(Post.highest_risk)
    )).all()
    risk_breakdown = {r: c for r, c in risk_rows}

    # Source breakdown
    source_rows = (await db.execute(
        select(Post.source, func.count(Post.id))
        .group_by(Post.source)
        .order_by(func.count(Post.id).desc())
    )).all()
    source_breakdown = {s: c for s, c in source_rows}

    stats = StatsOut(
        total_posts=total_posts or 0,
        analyzed_posts=analyzed_posts or 0,
        total_claims=total_claims or 0,
        risk_breakdown=risk_breakdown,
        source_breakdown=source_breakdown,
        high_risk_claims=high_risk or 0,
    )

    await set_cached("stats", stats.model_dump(), ttl=60)
    return stats


# ── Velocity ──────────────────────────────────────────────────────────────────

@app.get("/velocity", response_model=list[VelocityPoint])
async def get_velocity(db: AsyncSession = Depends(get_db)):
    """
    Spread velocity per claim — how long it's been active and how many
    times it's appeared. Used to draw the infection map on the frontend.
    Cached 30 seconds.
    """
    cached = await get_cached("velocity")
    if cached:
        return cached

    result = await db.execute(
        select(Claim)
        .where(Claim.misinformation_risk.in_(["MEDIUM", "HIGH"]))
        .order_by(Claim.spread_count.desc())
        .limit(50)
    )
    claims = result.scalars().all()

    points = []
    for c in claims:
        delta = (c.last_seen_at - c.first_seen_at).total_seconds() / 3600
        points.append(VelocityPoint(
            claim_text=c.claim_text,
            spread_count=c.spread_count,
            misinformation_risk=c.misinformation_risk,
            first_seen_at=c.first_seen_at,
            last_seen_at=c.last_seen_at,
            hours_active=round(delta, 2),
        ))

    await set_cached("velocity", [p.model_dump() for p in points], ttl=30)
    return points


# ── Manual trigger ────────────────────────────────────────────────────────────

@app.post("/collect")
async def trigger_collection(background_tasks: BackgroundTasks):
    """
    Manually trigger a collection + analysis + ingestion cycle.
    Runs in background so the HTTP response returns immediately.
    """
    async def run_pipeline():
        import subprocess
        collector_path = "../../services/collector"
        analyzer_path  = "../../services/analyzer"
        subprocess.run(
            ["python", "collector.py"],
            cwd=os.path.abspath(collector_path)
        )
        subprocess.run(
            ["python", "analyzer.py"],
            cwd=os.path.abspath(analyzer_path)
        )

    background_tasks.add_task(run_pipeline)
    return {"message": "Collection pipeline triggered", "status": "running"}
