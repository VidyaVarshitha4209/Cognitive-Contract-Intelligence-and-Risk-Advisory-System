from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.user import utcnow


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    contract_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), index=True)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    overall_score: Mapped[float] = mapped_column(Float, default=0)
    overall_level: Mapped[str] = mapped_column(String(10), default="low")
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    compliant_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_used: Mapped[bool] = mapped_column(Boolean, default=False)

    contract = relationship("Contract", back_populates="runs")
    findings = relationship("RiskFinding", back_populates="run", cascade="all, delete-orphan")


class RiskFinding(Base):
    __tablename__ = "risk_findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    contract_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), index=True)
    policy_id: Mapped[int | None] = mapped_column(ForeignKey("policies.id", ondelete="SET NULL"), nullable=True)
    clause_id: Mapped[int | None] = mapped_column(ForeignKey("clauses.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20))  # compliant | non_compliant | needs_review | not_found
    risk_level: Mapped[str] = mapped_column(String(10), default="low")
    original_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    run = relationship("AnalysisRun", back_populates="findings")
    contract = relationship("Contract", back_populates="findings")


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(primary_key=True)
    contract_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(255))
    date: Mapped[datetime] = mapped_column(DateTime)
    kind: Mapped[str] = mapped_column(String(20))  # signing | payment | delivery | renewal | expiry
    source_clause_id: Mapped[int | None] = mapped_column(ForeignKey("clauses.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")

    contract = relationship("Contract", back_populates="deadlines")


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    contract_a_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"))
    contract_b_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"))
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
