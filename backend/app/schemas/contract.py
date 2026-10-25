from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class ClauseBase(BaseModel):
    category: str
    clause_title: str
    clause_text: str
    page_number: int = 1
    confidence_score: float = 0.9
    risk_level: str = "None"

class ClauseCreate(ClauseBase):
    pass

class ClauseOut(ClauseBase):
    id: str
    contract_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ContractBase(BaseModel):
    filename: str
    file_type: str = "pdf"

class ContractCreate(ContractBase):
    file_path: str
    file_size: int = 0

class ContractUpdate(BaseModel):
    title: Optional[str] = None
    contract_type: Optional[str] = None
    parties: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    governing_law: Optional[str] = None
    payment_terms_summary: Optional[str] = None
    notice_period_summary: Optional[str] = None

class ContractOut(BaseModel):
    id: str
    user_id: str
    filename: str
    file_size: int
    file_type: str
    processing_status: str
    page_count: int
    title: Optional[str] = None
    contract_type: Optional[str] = None
    parties: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    governing_law: Optional[str] = None
    payment_terms_summary: Optional[str] = None
    notice_period_summary: Optional[str] = None
    overall_risk_score: float = 0.0
    overall_risk_level: str = "Low"
    high_risk_count: int = 0
    medium_risk_count: int = 0
    low_risk_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ContractDetailOut(ContractOut):
    clauses: List[ClauseOut] = []
    extracted_text: Optional[str] = None
