import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.contract import Contract, Clause
from app.core.security import get_password_hash
from app.services.policy_service import seed_default_policies
from app.services.document_processor import document_processor
from app.services.clause_segmenter import clause_segmenter
from app.services.entity_extractor import entity_extractor
from app.services.rag_service import rag_service
from app.services.risk_engine import risk_engine
from app.core.config import settings

def main():
    print("[Seed] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed demo user
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            user = User(
                email="test@example.com",
                hashed_password=get_password_hash("StrongPass123"),
                full_name="Senior Legal Reviewer",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("[Seed] Created default user: test@example.com")

        # 2. Seed default policies
        seed_default_policies(db)
        print("[Seed] Seeded default company policies.")

        # 3. Ingest sample contracts if not already present
        samples = [
            ("sample_vendor_agreement.txt", Path("D:/contract-intelligence/samples/sample_vendor_agreement.txt")),
            ("sample_safe_nda.txt", Path("D:/contract-intelligence/samples/sample_safe_nda.txt")),
        ]

        for filename, sample_path in samples:
            if not sample_path.exists():
                continue

            existing = db.query(Contract).filter(Contract.filename == filename).first()
            if existing:
                print(f"[Seed] Contract '{filename}' already present in database.")
                continue

            print(f"[Seed] Processing and ingesting '{filename}'...")
            with open(sample_path, "rb") as f:
                content = f.read()

            import uuid
            contract_id = str(uuid.uuid4())
            stored_path = settings.UPLOAD_DIR / f"{contract_id}_{filename}"
            with open(stored_path, "wb") as f:
                f.write(content)

            contract = Contract(
                id=contract_id,
                user_id=user.id,
                filename=filename,
                file_path=str(stored_path),
                file_size=len(content),
                file_type="txt",
                processing_status="extracting"
            )
            db.add(contract)
            db.commit()

            # Extraction
            res = document_processor.extract_from_file(stored_path)
            extracted_text = res["text"]
            text_path = settings.EXTRACTED_TEXT_DIR / f"{contract_id}.txt"
            with open(text_path, "w", encoding="utf-8") as tf:
                tf.write(extracted_text)
            contract.extracted_text_path = str(text_path)
            contract.page_count = res["page_count"]

            # Clauses
            clauses = clause_segmenter.segment_text(extracted_text)
            for c in clauses:
                cl = Clause(
                    contract_id=contract.id,
                    category=c["category"],
                    clause_title=c["clause_title"],
                    clause_text=c["clause_text"],
                    page_number=c["page_number"],
                    confidence_score=c["confidence_score"]
                )
                db.add(cl)
            db.commit()

            # Entities
            entities = entity_extractor.extract_entities(extracted_text, clauses)
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

            # RAG
            chunks = rag_service.chunk_contract(clauses, extracted_text)
            rag_service.build_and_save_index(contract.id, chunks)

            # Risk Engine
            risk_engine.analyze_contract(db, contract)
            print(f"[Seed] Ingested '{filename}' (Risk Score: {contract.overall_risk_score}, Level: {contract.overall_risk_level})")

        print("[Seed] Database successfully populated with initial demonstration contracts.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
