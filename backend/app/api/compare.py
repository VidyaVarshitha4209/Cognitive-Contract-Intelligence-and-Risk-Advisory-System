import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.comparison import ContractComparison
from app.schemas.compare import ContractCompareRequest, ComparisonReportOut, ClauseComparisonItem
from app.services.comparison_service import comparison_service

router = APIRouter(prefix="/compare", tags=["Contract Comparison"])

@router.post("", response_model=ComparisonReportOut)
def compare_contracts(
    req: ContractCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.contract_a_id == req.contract_b_id:
        raise HTTPException(
            status_code=400,
            detail="Please select two distinct contracts to perform a comparison."
        )

    try:
        report_data = comparison_service.compare_contracts(db, req.contract_a_id, req.contract_b_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Persist comparison record
    comparison_record = ContractComparison(
        contract_a_id=req.contract_a_id,
        contract_b_id=req.contract_b_id,
        executive_summary=report_data["executive_summary"],
        comparison_data=json.dumps(report_data)
    )
    db.add(comparison_record)
    db.commit()
    db.refresh(comparison_record)

    clause_items = [
        ClauseComparisonItem(
            category=item["category"],
            contract_a_clause=item["contract_a_clause"],
            contract_b_clause=item["contract_b_clause"],
            main_difference=item["main_difference"],
            potential_impact=item["potential_impact"],
            risk_assessment=item["risk_assessment"]
        )
        for item in report_data["clause_comparisons"]
    ]

    return ComparisonReportOut(
        id=comparison_record.id,
        contract_a_id=report_data["contract_a_id"],
        contract_b_id=report_data["contract_b_id"],
        contract_a_name=report_data["contract_a_name"],
        contract_b_name=report_data["contract_b_name"],
        executive_summary=report_data["executive_summary"],
        key_similarities=report_data["key_similarities"],
        key_differences=report_data["key_differences"],
        missing_clauses=report_data["missing_clauses"],
        policy_compliance_comparison=report_data["policy_compliance_comparison"],
        risk_comparison=report_data["risk_comparison"],
        clause_comparisons=clause_items,
        recommended_actions=report_data["recommended_actions"],
        created_at=comparison_record.created_at
    )
