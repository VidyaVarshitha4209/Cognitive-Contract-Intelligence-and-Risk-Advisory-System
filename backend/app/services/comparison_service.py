import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.contract import Contract, Clause
from app.models.risk import RiskAssessment
from app.services.ai_service import ai_service

class ComparisonService:
    """
    Compares two contracts side-by-side across all key dimensions:
    - Parties & Dates
    - Core Legal Clauses (Payment, Termination, Liability, Indemnity, Confidentiality, etc.)
    - Risk & Policy Compliance Profiles
    Produces a structured comparison report for review and PDF/CSV export.
    """

    CATEGORIES_TO_COMPARE = [
        ("parties", "Parties & Definitions"),
        ("payment", "Payment Terms & Currency"),
        ("termination", "Termination & Cancellation"),
        ("liability", "Liability & Indemnification"),
        ("confidentiality", "Confidentiality & Non-Disclosure"),
        ("renewal", "Renewal & Extension Terms"),
        ("notice_period", "Notice Periods"),
        ("penalties", "Penalties & Late Fees"),
        ("intellectual_property", "Intellectual Property Ownership"),
        ("governing_law", "Governing Law & Jurisdiction"),
        ("data_protection", "Data Protection & Security")
    ]

    def compare_contracts(self, db: Session, contract_a_id: str, contract_b_id: str) -> Dict[str, Any]:
        contract_a = db.query(Contract).filter(Contract.id == contract_a_id).first()
        contract_b = db.query(Contract).filter(Contract.id == contract_b_id).first()

        if not contract_a or not contract_b:
            raise ValueError("One or both contracts could not be found.")

        clauses_a = db.query(Clause).filter(Clause.contract_id == contract_a_id).all()
        clauses_b = db.query(Clause).filter(Clause.contract_id == contract_b_id).all()

        risks_a = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract_a_id).all()
        risks_b = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract_b_id).all()

        # Map clauses by category
        map_a: Dict[str, Clause] = {c.category: c for c in clauses_a}
        map_b: Dict[str, Clause] = {c.category: c for c in clauses_b}

        clause_comparisons = []
        similarities = []
        differences = []
        missing_clauses = []

        for cat, label in self.CATEGORIES_TO_COMPARE:
            ca = map_a.get(cat)
            cb = map_b.get(cat)

            text_a = ca.clause_text if ca else None
            text_b = cb.clause_text if cb else None

            if not text_a and not text_b:
                continue

            if not text_a and text_b:
                diff = f"Clause '{label}' is present in {contract_b.filename} but missing in {contract_a.filename}."
                impact = f"Missing protection for {label} in {contract_a.filename}."
                risk_eval = f"{contract_a.filename} is Riskier (Missing Clause)"
                differences.append(diff)
                missing_clauses.append({"clause": label, "missing_in": contract_a.filename})
            elif text_a and not text_b:
                diff = f"Clause '{label}' is present in {contract_a.filename} but missing in {contract_b.filename}."
                impact = f"Missing protection for {label} in {contract_b.filename}."
                risk_eval = f"{contract_b.filename} is Riskier (Missing Clause)"
                differences.append(diff)
                missing_clauses.append({"clause": label, "missing_in": contract_b.filename})
            else:
                # Both have the clause
                if text_a.strip().lower() == text_b.strip().lower():
                    diff = "Clauses are identical in substance and wording."
                    impact = "Identical contractual obligations."
                    risk_eval = "Equal"
                    similarities.append(f"Both contracts share identical {label} terms.")
                else:
                    diff = f"Variation in terms for {label}."
                    # Check liability or termination difference
                    if cat == "liability":
                        impact = "Different liability exposure and indemnification triggers."
                        risk_eval = "Different Caps"
                    elif cat == "termination":
                        impact = "Notice periods or termination conditions differ."
                        risk_eval = "Variance"
                    elif cat == "payment":
                        impact = "Invoice payment windows or milestone structures vary."
                        risk_eval = "Payment Variance"
                    else:
                        impact = "Operational conditions differ between contracts."
                        risk_eval = "Review Recommended"
                    differences.append(f"{label}: Discrepancy observed between contracts.")

            clause_comparisons.append({
                "category": cat,
                "label": label,
                "contract_a_clause": text_a if text_a else "Clause not found",
                "contract_b_clause": text_b if text_b else "Clause not found",
                "main_difference": diff,
                "potential_impact": impact,
                "risk_assessment": risk_eval
            })

        # Policy Compliance Comparison
        compliance_comp = [
            {
                "contract": contract_a.filename,
                "overall_risk_score": contract_a.overall_risk_score,
                "overall_risk_level": contract_a.overall_risk_level,
                "high_risks": contract_a.high_risk_count,
                "medium_risks": contract_a.medium_risk_count,
                "low_risks": contract_a.low_risk_count
            },
            {
                "contract": contract_b.filename,
                "overall_risk_score": contract_b.overall_risk_score,
                "overall_risk_level": contract_b.overall_risk_level,
                "high_risks": contract_b.high_risk_count,
                "medium_risks": contract_b.medium_risk_count,
                "low_risks": contract_b.low_risk_count
            }
        ]

        # Executive Summary
        exec_summary = ai_service.generate_comparison_summary(
            contract_a.filename,
            contract_b.filename,
            similarities,
            differences
        )

        recommended_actions = [
            "Harmonize liability caps and indemnification terms across both agreements.",
            "Verify that notice periods align with company operational capabilities.",
            "Ensure dispute resolution and governing law clauses do not place company in adverse jurisdictions."
        ]

        return {
            "contract_a_id": contract_a.id,
            "contract_b_id": contract_b.id,
            "contract_a_name": contract_a.filename,
            "contract_b_name": contract_b.filename,
            "executive_summary": exec_summary,
            "key_similarities": similarities,
            "key_differences": differences,
            "missing_clauses": missing_clauses,
            "policy_compliance_comparison": compliance_comp,
            "risk_comparison": {
                "safer_contract": contract_a.filename if contract_a.overall_risk_score <= contract_b.overall_risk_score else contract_b.filename,
                "score_difference": abs(contract_a.overall_risk_score - contract_b.overall_risk_score)
            },
            "clause_comparisons": clause_comparisons,
            "recommended_actions": recommended_actions
        }

comparison_service = ComparisonService()
