import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # liability, termination, payment, confidentiality, etc.
    description = Column(Text, nullable=True, default="")
    expected_condition = Column(Text, nullable=True, default="")
    severity = Column(String(20), default="Medium")  # High, Medium, Low
    numeric_threshold = Column(Float, nullable=True)  # e.g. 30 (days), 100000 (liability cap)
    is_active = Column(Boolean, default=True)
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="policies")
    risks = relationship("RiskAssessment", back_populates="policy")
