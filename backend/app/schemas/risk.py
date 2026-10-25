from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class RiskAssessmentBase(BaseModel):
    risk_title: str
    category: str
    risk_level: str
    compliance_status: str
    original_clause_text: Optional[str] = None
    matched_policy_rule: Optional[str] = None
    mismatch_reason: Optional[str] = None
    suggested_action: Optional[str] = None
    ai_explanation: Optional[str] = None
    source_page: int = 1
    confidence: float = 0.85

class RiskAssessmentCreate(RiskAssessmentBase):
    contract_id: str
    policy_id: Optional[str] = None
    clause_id: Optional[str] = None

class RiskAssessmentOut(RiskAssessmentBase):
    id: str
    contract_id: str
    policy_id: Optional[str] = None
    clause_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RiskAnalysisResponse(BaseModel):
    contract_id: str
    overall_risk_score: float
    overall_risk_level: str
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    risks: list[RiskAssessmentOut]
