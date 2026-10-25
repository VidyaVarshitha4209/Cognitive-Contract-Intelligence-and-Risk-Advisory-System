from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class ContractCompareRequest(BaseModel):
    contract_a_id: str
    contract_b_id: str

class ClauseComparisonItem(BaseModel):
    category: str
    contract_a_clause: Optional[str] = "Clause not found"
    contract_b_clause: Optional[str] = "Clause not found"
    main_difference: str
    potential_impact: str
    risk_assessment: str  # "A is Riskier", "B is Riskier", "Equal", "Neutral"

class ComparisonReportOut(BaseModel):
    id: str
    contract_a_id: str
    contract_b_id: str
    contract_a_name: str
    contract_b_name: str
    executive_summary: str
    key_similarities: List[str]
    key_differences: List[str]
    missing_clauses: List[Dict[str, Any]]
    policy_compliance_comparison: List[Dict[str, Any]]
    risk_comparison: Dict[str, Any]
    clause_comparisons: List[ClauseComparisonItem]
    recommended_actions: List[str]
    created_at: datetime
