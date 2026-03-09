"""
Pydantic v2 schemas — defines the shape of API responses.
Separates database models from what the API returns.
"""

from pydantic import BaseModel
from datetime import datetime


class ClaimOut(BaseModel):
    id: int
    post_id: str
    claim_text: str
    fact_check_publisher: str
    fact_check_url: str
    fact_check_verdict: str
    rating: str
    confidence: float
    explanation: str
    misinformation_risk: str
    spread_count: int
    first_seen_at: datetime
    last_seen_at: datetime

    model_config = {"from_attributes": True}


class PostOut(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary: str
    published: str
    collected_at: datetime
    analyzed: bool
    analyzed_at: datetime | None
    highest_risk: str
    claims: list[ClaimOut] = []

    model_config = {"from_attributes": True}


class PostSummary(BaseModel):
    """Lighter version without claims — for list endpoints."""
    id: str
    source: str
    title: str
    url: str
    collected_at: datetime
    analyzed: bool
    highest_risk: str

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    total_posts: int
    analyzed_posts: int
    total_claims: int
    risk_breakdown: dict[str, int]
    source_breakdown: dict[str, int]
    high_risk_claims: int


class VelocityPoint(BaseModel):
    claim_text: str
    spread_count: int
    misinformation_risk: str
    first_seen_at: datetime
    last_seen_at: datetime
    hours_active: float
