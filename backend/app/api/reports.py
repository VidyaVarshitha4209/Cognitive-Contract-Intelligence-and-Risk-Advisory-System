import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.contract import Contract
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports & Intelligence"])

@router.get("/{contract_id}/data")
def get_report_data(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    return report_service.generate_full_report_data(contract, db)

@router.get("/{contract_id}/pdf")
def download_pdf_report(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    try:
        pdf_path = report_service.export_pdf(contract, db)
        return FileResponse(
            path=pdf_path,
            filename=f"Report_{contract.filename}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.get("/{contract_id}/csv")
def download_csv_report(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    try:
        csv_path = report_service.export_csv(contract, db)
        return FileResponse(
            path=csv_path,
            filename=f"Risks_{contract.filename}.csv",
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")
