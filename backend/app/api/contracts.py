import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_optional_user
from app.core.config import settings
from app.models.user import User
from app.models.contract import Contract, Clause
from app.models.risk import RiskAssessment
from app.models.chat import ChatMessage
from app.schemas.contract import ContractOut, ContractDetailOut, ClauseOut
from app.services.document_processor import document_processor
from app.services.clause_segmenter import clause_segmenter
from app.services.entity_extractor import entity_extractor
from app.services.rag_service import rag_service
from app.services.risk_engine import risk_engine

router = APIRouter(prefix="/contracts", tags=["Contracts"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".txt"}

@router.post("/upload", response_model=ContractDetailOut)
async def upload_contract(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    """
    Uploads a contract (PDF, DOCX, Scanned PDF, Image),
    extracts text & structure, identifies clauses, extracts entities,
    indexes for RAG retrieval, and computes initial risk assessments.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: PDF, DOCX, PNG, JPG, TXT."
        )

    # Read content and validate size (max 25MB)
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB."
        )

    # Save to storage/uploads with unique safe filename
    contract_id = str(uuid.uuid4())
    safe_filename = f"{contract_id}_{Path(file.filename).name}"
    save_path = settings.UPLOAD_DIR / safe_filename

    with open(save_path, "wb") as f:
        f.write(content)

    # Determine file type
    file_type = "pdf"
    if file_ext in [".docx", ".doc"]:
        file_type = "docx"
    elif file_ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
        file_type = "image"
    elif file_ext == ".txt":
        file_type = "txt"

    # Create Contract record in DB
    contract = Contract(
        id=contract_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(save_path),
        file_size=len(content),
        file_type=file_type,
        processing_status="extracting"
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    # 1. Text & OCR Extraction
    extraction_res = document_processor.extract_from_file(save_path)
    if not extraction_res["success"]:
        contract.processing_status = "failed"
        contract.error_message = extraction_res.get("error", "Extraction failed")
        db.commit()
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {contract.error_message}")

    extracted_text = extraction_res["text"]
    contract.page_count = extraction_res["page_count"]
    if extraction_res["is_scanned"]:
        contract.file_type = "scanned_pdf" if file_type == "pdf" else "scanned_image"

    # Save extracted text to storage/extracted_text/{contract_id}.txt
    text_save_path = settings.EXTRACTED_TEXT_DIR / f"{contract_id}.txt"
    with open(text_save_path, "w", encoding="utf-8") as tf:
        tf.write(extracted_text)
    contract.extracted_text_path = str(text_save_path)

    # 2. Clause Segmentation
    clause_data_list = clause_segmenter.segment_text(extracted_text)
    saved_clauses = []
    for c_data in clause_data_list:
        clause = Clause(
            contract_id=contract.id,
            category=c_data["category"],
            clause_title=c_data["clause_title"],
            clause_text=c_data["clause_text"],
            page_number=c_data["page_number"],
            confidence_score=c_data["confidence_score"]
        )
        db.add(clause)
        saved_clauses.append(clause)
    db.commit()

    # 3. Entity & Key Information Extraction
    entities = entity_extractor.extract_entities(extracted_text, clause_data_list)
    contract.title = entities.get("title")
    contract.contract_type = entities.get("contract_type")
    contract.parties = entities.get("parties")
    contract.effective_date = entities.get("effective_date")
    contract.expiration_date = entities.get("expiration_date")
    contract.governing_law = entities.get("governing_law")
    contract.payment_terms_summary = entities.get("payment_terms")
    contract.notice_period_summary = entities.get("notice_period")
    contract.processing_status = "extracted"
    db.commit()

    # 4. RAG Chunks Indexing
    chunks = rag_service.chunk_contract(clause_data_list, extracted_text)
    rag_service.build_and_save_index(contract.id, chunks)

    # 5. Risk Assessment against active policies
    try:
        risk_engine.analyze_contract(db, contract)
    except Exception as e:
        print(f"Risk analysis error during upload: {e}")

    db.refresh(contract)
    clauses = db.query(Clause).filter(Clause.contract_id == contract.id).all()

    return ContractDetailOut(
        **contract.__dict__,
        clauses=[ClauseOut.model_validate(c) for c in clauses],
        extracted_text=extracted_text
    )

@router.get("", response_model=List[ContractOut])
def list_contracts(
    search: Optional[str] = Query(None, description="Search by filename or title"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (High, Medium, Low)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    query = db.query(Contract)
    if search:
        query = query.filter(
            (Contract.filename.ilike(f"%{search}%")) | (Contract.title.ilike(f"%{search}%"))
        )
    if status:
        query = query.filter(Contract.processing_status == status)
    if risk_level:
        query = query.filter(Contract.overall_risk_level == risk_level)

    contracts = query.order_by(Contract.created_at.desc()).all()
    return [ContractOut.model_validate(c) for c in contracts]

@router.get("/{contract_id}", response_model=ContractDetailOut)
def get_contract_details(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    clauses = db.query(Clause).filter(Clause.contract_id == contract.id).all()

    extracted_text = ""
    if contract.extracted_text_path and os.path.exists(contract.extracted_text_path):
        with open(contract.extracted_text_path, "r", encoding="utf-8", errors="ignore") as f:
            extracted_text = f.read()

    return ContractDetailOut(
        **contract.__dict__,
        clauses=[ClauseOut.model_validate(c) for c in clauses],
        extracted_text=extracted_text
    )

@router.post("/{contract_id}/reanalyze", response_model=ContractOut)
def reanalyze_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    risk_engine.analyze_contract(db, contract)
    db.refresh(contract)
    return ContractOut.model_validate(contract)

@router.delete("/{contract_id}")
def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    # Remove files safely
    for path_str in [contract.file_path, contract.extracted_text_path]:
        if path_str and os.path.exists(path_str):
            try:
                os.remove(path_str)
            except Exception:
                pass

    # Remove RAG index file
    index_file = settings.VECTOR_STORE_DIR / f"{contract_id}_chunks.json"
    if index_file.exists():
        try:
            os.remove(index_file)
        except Exception:
            pass

    db.delete(contract)
    db.commit()
    return {"message": f"Contract '{contract.filename}' deleted successfully."}
