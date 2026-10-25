from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.models.contract import Contract
from app.models.risk import RiskAssessment
from app.schemas.contract import ContractOut
from app.schemas.dashboard import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard Statistics"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contracts = db.query(Contract).order_by(Contract.created_at.desc()).all()
    risks = db.query(RiskAssessment).all()

    total_contracts = len(contracts)
    analyzed_contracts = len([c for c in contracts if c.processing_status == "analyzed"])
    high_risk_contracts = len([c for c in contracts if c.overall_risk_level == "High"])
    medium_risk_contracts = len([c for c in contracts if c.overall_risk_level == "Medium"])
    low_risk_contracts = len([c for c in contracts if c.overall_risk_level == "Low"])

    risk_dist = {
        "High": high_risk_contracts,
        "Medium": medium_risk_contracts,
        "Low": low_risk_contracts
    }

    status_counts = Counter([c.processing_status for c in contracts])
    status_dist = {
        "analyzed": status_counts.get("analyzed", 0),
        "extracted": status_counts.get("extracted", 0),
        "uploaded": status_counts.get("uploaded", 0),
        "failed": status_counts.get("failed", 0)
    }

    category_counts = Counter([r.category for r in risks])

    recent = [ContractOut.model_validate(c) for c in contracts[:6]]

    return DashboardStats(
        total_contracts=total_contracts,
        analyzed_contracts=analyzed_contracts,
        high_risk_contracts=high_risk_contracts,
        medium_risk_contracts=medium_risk_contracts,
        low_risk_contracts=low_risk_contracts,
        recent_contracts=recent,
        risk_distribution=risk_dist,
        status_distribution=status_dist,
        category_risk_counts=dict(category_counts)
    )
