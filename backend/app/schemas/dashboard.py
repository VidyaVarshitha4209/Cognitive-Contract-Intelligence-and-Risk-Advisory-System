from typing import List, Dict, Any
from pydantic import BaseModel
from app.schemas.contract import ContractOut

class DashboardStats(BaseModel):
    total_contracts: int
    analyzed_contracts: int
    high_risk_contracts: int
    medium_risk_contracts: int
    low_risk_contracts: int
    recent_contracts: List[ContractOut]
    risk_distribution: Dict[str, int]  # {"High": count, "Medium": count, "Low": count}
    status_distribution: Dict[str, int]  # {"analyzed": count, "extracted": count, "uploaded": count}
    category_risk_counts: Dict[str, int]  # breakdown of risks by clause category
