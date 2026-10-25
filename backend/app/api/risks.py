from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_optional_user
from app.models.user import User
from app.models.contract import Contract
from app.models.risk import RiskAssessment
from app.schemas.risk import RiskAssessmentOut, RiskAnalysisResponse
from app.services.risk_engine import risk_engine

router = APIRouter(prefix="/risks", tags=["Risk Analysis"])

@router.get("/contract/{contract_id}", response_model=List[RiskAssessmentOut])
def get_contract_risks(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    risks = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract_id).all()
    return [RiskAssessmentOut.model_validate(r) for r in risks]

@router.post("/contract/{contract_id}/analyze", response_model=RiskAnalysisResponse)
def analyze_contract_risks(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    res = risk_engine.analyze_contract(db, contract)
    risks = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract_id).all()

    return RiskAnalysisResponse(
        contract_id=contract.id,
        overall_risk_score=res["overall_risk_score"],
        overall_risk_level=res["overall_risk_level"],
        high_risk_count=res["high_risk_count"],
        medium_risk_count=res["medium_risk_count"],
        low_risk_count=res["low_risk_count"],
        risks=[RiskAssessmentOut.model_validate(r) for r in risks]
    )
