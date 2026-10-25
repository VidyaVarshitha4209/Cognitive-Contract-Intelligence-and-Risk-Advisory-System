from typing import List
from sqlalchemy.orm import Session
from app.models.policy import Policy

DEFAULT_POLICIES = [
    {
        "name": "Liability Cap Limitation",
        "category": "liability",
        "description": "Contracts must have a capped liability not exceeding 1x total contract fees or $500,000. Unlimited liability or uncapped consequential damages are prohibited.",
        "expected_condition": "Liability must be capped at 1x contract value or $500,000 maximum.",
        "severity": "High",
        "numeric_threshold": 500000.0,
        "is_active": True
    },
    {
        "name": "Standard Termination Notice Period",
        "category": "termination",
        "description": "Contracts must require a minimum of 30 days written notice for convenience termination.",
        "expected_condition": "Minimum 30 days prior written notice required for termination without cause.",
        "severity": "Medium",
        "numeric_threshold": 30.0,
        "is_active": True
    },
    {
        "name": "Payment Term Limit",
        "category": "payment",
        "description": "Invoice payment terms must not exceed Net 45 days. Late payment penalties must not exceed 1.5% per month.",
        "expected_condition": "Payment terms strictly within Net 30 or Net 45 days.",
        "severity": "Medium",
        "numeric_threshold": 45.0,
        "is_active": True
    },
    {
        "name": "Confidentiality & Non-Disclosure Survival",
        "category": "confidentiality",
        "description": "Confidentiality obligations must survive contract termination for at least 3 years or indefinitely for proprietary IP and trade secrets.",
        "expected_condition": "Confidentiality survival for minimum 3 years post-termination.",
        "severity": "High",
        "numeric_threshold": 3.0,
        "is_active": True
    },
    {
        "name": "Automatic Renewal & Cancellation Notice",
        "category": "renewal",
        "description": "Agreements with evergreen/automatic renewal clauses must allow at least 30 to 60 days advance written cancellation notice.",
        "expected_condition": "At least 30 days advance notice to cancel auto-renewal.",
        "severity": "Medium",
        "numeric_threshold": 30.0,
        "is_active": True
    },
    {
        "name": "Governing Law & Dispute Resolution",
        "category": "governing_law",
        "description": "Contracts should specify a recognized jurisdiction without exclusive arbitration in unfamiliar or hostile foreign venues.",
        "expected_condition": "Governing law in home jurisdiction or mutually agreed commercial arbitration.",
        "severity": "Low",
        "numeric_threshold": None,
        "is_active": True
    },
    {
        "name": "Data Protection & Security Breach Notice",
        "category": "data_protection",
        "description": "Vendors handling company or customer data must notify of security breaches within 72 hours and comply with data protection regulations.",
        "expected_condition": "Security incident / breach notification required within 72 hours.",
        "severity": "High",
        "numeric_threshold": 72.0,
        "is_active": True
    }
]

def seed_default_policies(db: Session):
    """Seeds initial demonstration policies if policies table is empty."""
    existing_count = db.query(Policy).count()
    if existing_count == 0:
        for p_data in DEFAULT_POLICIES:
            policy = Policy(**p_data)
            db.add(policy)
        db.commit()
