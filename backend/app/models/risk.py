import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    policy_id = Column(String(36), ForeignKey("policies.id"), nullable=True)
    clause_id = Column(String(36), ForeignKey("clauses.id"), nullable=True)
    
    risk_title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    risk_level = Column(String(20), default="Medium")  # High, Medium, Low
    compliance_status = Column(String(50), default="Non-compliant")  # Compliant, Non-compliant, Needs review, Not found
    
    original_clause_text = Column(Text, nullable=True)
    matched_policy_rule = Column(Text, nullable=True)
    mismatch_reason = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    
    # 5-part AI explanation (What contract says, What policy requires, How they differ, Why it matters, Suggested action)
    ai_explanation = Column(Text, nullable=True)
    
    source_page = Column(Integer, default=1)
    confidence = Column(Float, default=0.85)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    contract = relationship("Contract", back_populates="risks")
    policy = relationship("Policy", back_populates="risks")
    clause = relationship("Clause", back_populates="risks")
