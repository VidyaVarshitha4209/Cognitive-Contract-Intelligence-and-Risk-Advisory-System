import pytest
from app.models.contract import Clause
from app.models.policy import Policy
from app.services.risk_engine import risk_engine

def test_liability_risk_detection():
    clause = Clause(
        category="liability",
        clause_title="5. Limitation of Liability",
        clause_text="Neither party shall have capped liability. Unlimited liability applies to all damages.",
        page_number=1
    )
    policy = Policy(
        name="Liability Cap Limitation",
        category="liability",
        description="Liability capped at $500,000",
        expected_condition="Liability capped at $500,000 max",
        severity="High"
    )

    status, level, reason, action = risk_engine._evaluate_clause_policy(clause, policy)
    assert status == "Non-compliant"
    assert level == "High"
    assert "unlimited liability" in reason.lower()

def test_termination_notice_detection():
    clause = Clause(
        category="termination",
        clause_title="3. Termination",
        clause_text="Either party may terminate upon 7 business days written notice.",
        page_number=1
    )
    policy = Policy(
        name="Standard Notice",
        category="termination",
        description="Minimum 30 days notice",
        expected_condition="30 days notice",
        severity="Medium",
        numeric_threshold=30.0
    )

    status, level, reason, action = risk_engine._evaluate_clause_policy(clause, policy)
    assert status == "Non-compliant"
    assert "below company minimum" in reason.lower()
