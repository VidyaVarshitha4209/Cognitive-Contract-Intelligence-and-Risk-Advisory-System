import pytest
from pathlib import Path
from app.services.document_processor import document_processor
from app.services.clause_segmenter import clause_segmenter
from app.services.entity_extractor import entity_extractor

def test_text_cleaning():
    raw = "Section 1.   Payment\r\n\r\n\r\n\r\nAmount is   $5,000."
    cleaned = document_processor._clean_text(raw)
    assert "Section 1. Payment" in cleaned
    assert "Amount is $5,000." in cleaned

def test_clause_segmentation():
    sample = """
1. Payment Terms
Client shall pay all fees within 30 days of invoice.

2. Confidentiality
Both parties agree to maintain strict confidentiality for 3 years.

3. Termination
Either party may terminate upon 30 days written notice.
"""
    clauses = clause_segmenter.segment_text(sample)
    assert len(clauses) >= 3
    categories = [c["category"] for c in clauses]
    assert "payment" in categories
    assert "confidentiality" in categories
    assert "termination" in categories

def test_entity_extraction():
    sample = "This Master Services Agreement is made between Alpha Corp and Beta LLC on January 1, 2026."
    clauses = clause_segmenter.segment_text(sample)
    entities = entity_extractor.extract_entities(sample, clauses)
    assert "Alpha Corp" in entities["parties"] or "Beta LLC" in entities["parties"]
    assert "Master Services Agreement" in entities["contract_type"] or "Commercial Contract" in entities["contract_type"]
