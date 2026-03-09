"""
SQLAlchemy ORM models.
Two tables: posts and claims (one-to-many).
"""

from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base


class Post(Base):
    __tablename__ = "posts"

    id:            Mapped[str]      = mapped_column(String(64), primary_key=True)
    source:        Mapped[str]      = mapped_column(String(64))
    title:         Mapped[str]      = mapped_column(Text)
    url:           Mapped[str]      = mapped_column(Text)
    summary:       Mapped[str]      = mapped_column(Text, default="")
    published:     Mapped[str]      = mapped_column(String(128), default="")
    collected_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    analyzed:      Mapped[bool]     = mapped_column(Boolean, default=False)
    analyzed_at:   Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    highest_risk:  Mapped[str]      = mapped_column(String(16), default="LOW")

    claims: Mapped[list["Claim"]] = relationship(
        "Claim", back_populates="post", cascade="all, delete-orphan"
    )


class Claim(Base):
    __tablename__ = "claims"

    id:                 Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    post_id:            Mapped[str] = mapped_column(String(64), ForeignKey("posts.id", ondelete="CASCADE"))
    claim_text:         Mapped[str] = mapped_column(Text)
    fact_check_publisher: Mapped[str] = mapped_column(Text, default="")
    fact_check_url:     Mapped[str] = mapped_column(Text, default="")
    fact_check_verdict: Mapped[str] = mapped_column(Text, default="")
    rating:             Mapped[str] = mapped_column(String(32), default="UNVERIFIABLE")
    confidence:         Mapped[float] = mapped_column(Float, default=0.0)
    explanation:        Mapped[str] = mapped_column(Text, default="")
    misinformation_risk: Mapped[str] = mapped_column(String(16), default="LOW")

    # Velocity tracking — how many times this claim appeared across sources
    spread_count:       Mapped[int] = mapped_column(default=1)
    first_seen_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    last_seen_at:       Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    post: Mapped["Post"] = relationship("Post", back_populates="claims")
