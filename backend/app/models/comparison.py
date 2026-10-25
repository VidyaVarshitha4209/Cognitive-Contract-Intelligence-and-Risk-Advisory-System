import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.core.database import Base

class ContractComparison(Base):
    __tablename__ = "contract_comparisons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_a_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    contract_b_id = Column(String(36), ForeignKey("contracts.id"), nullable=False)
    
    executive_summary = Column(Text, nullable=True)
    comparison_data = Column(Text, nullable=False)  # Full JSON structure: similarities, differences, missing, compliance, risk
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
