import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    file_type = Column(String(50), default="pdf")
    processing_status = Column(String(50), default="uploaded")  # uploaded, extracting, extracted, analyzing, analyzed, failed
    page_count = Column(Integer, default=0)
    
    # Extracted metadata
    title = Column(String(255), nullable=True)
    contract_type = Column(String(100), nullable=True)
    parties = Column(Text, nullable=True)  # JSON string or comma-separated
    effective_date = Column(String(100), nullable=True)
    expiration_date = Column(String(100), nullable=True)
    governing_law = Column(String(255), nullable=True)
    payment_terms_summary = Column(Text, nullable=True)
    notice_period_summary = Column(Text, nullable=True)
    
    # Overall Risk Scores
    overall_risk_score = Column(Float, default=0.0)  # 0 to 100
    overall_risk_level = Column(String(20), default="Low")  # Low, Medium, High
    high_risk_count = Column(Integer, default=0)
    medium_risk_count = Column(Integer, default=0)
    low_risk_count = Column(Integer, default=0)

    extracted_text_path = Column(String(512), nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="contracts")
    clauses = relationship("Clause", back_populates="contract", cascade="all, delete-orphan")
    risks = relationship("RiskAssessment", back_populates="contract", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="contract", cascade="all, delete-orphan")


class Clause(Base):
    __tablename__ = "clauses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    category = Column(String(100), nullable=False)  # parties, payment, liability, etc.
    clause_title = Column(String(255), nullable=False)
    clause_text = Column(Text, nullable=False)
    page_number = Column(Integer, default=1)
    confidence_score = Column(Float, default=0.9)
    risk_level = Column(String(20), default="None")  # None, Low, Medium, High
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    contract = relationship("Contract", back_populates="clauses")
    risks = relationship("RiskAssessment", back_populates="clause")
