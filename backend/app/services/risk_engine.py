import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.contract import Contract, Clause
from app.models.policy import Policy
from app.models.risk import RiskAssessment
from app.services.ai_service import ai_service

class RiskEngine:
    """
    Explainable Risk Engine that assesses contract clauses against active company policies.
    Determines:
    - Compliance status (Compliant, Non-compliant, Needs review, Not found)
    - Risk Level (High, Medium, Low)
    - Original clause citation
    - Mismatch reason & suggested action
    - 5-part AI explanation
    - Aggregated contract risk score (0 - 100)
    """

    def analyze_contract(self, db: Session, contract: Contract) -> Dict[str, Any]:
        policies = db.query(Policy).filter(Policy.is_active == True).all()
        clauses = db.query(Clause).filter(Clause.contract_id == contract.id).all()

        clauses_by_category: Dict[str, List[Clause]] = {}
        for c in clauses:
            clauses_by_category.setdefault(c.category, []).append(c)

        db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract.id).delete()

        assessments = []
        high_count = 0
        medium_count = 0
        low_count = 0

        for policy in policies:
            matched_clauses = clauses_by_category.get(policy.category, [])
            
            if not matched_clauses:
                if policy.severity == "High":
                    assessment = RiskAssessment(
                        contract_id=contract.id,
                        policy_id=policy.id,
                        clause_id=None,
                        risk_title=f"Missing Clause: {policy.name}",
                        category=policy.category,
                        risk_level="High",
                        compliance_status="Not found",
                        original_clause_text="No explicit clause covering this requirement was found in the contract.",
                        matched_policy_rule=policy.expected_condition,
                        mismatch_reason=f"The contract is silent on {policy.category}, violating policy requirements.",
                        suggested_action=f"Add a standard {policy.name} clause conforming to: '{policy.expected_condition}'",
                        ai_explanation=ai_service.generate_risk_explanation(
                            clause_title=f"Missing {policy.name}",
                            clause_text="[Missing from contract]",
                            policy_name=policy.name,
                            policy_expected=policy.expected_condition,
                            mismatch_reason="The contract completely omits provisions for this policy category.",
                            category=policy.category
                        ),
                        source_page=1,
                        confidence=0.9
                    )
                    assessments.append(assessment)
                    high_count += 1
                elif policy.severity == "Medium":
                    assessment = RiskAssessment(
                        contract_id=contract.id,
                        policy_id=policy.id,
                        clause_id=None,
                        risk_title=f"Omitted Policy Term: {policy.name}",
                        category=policy.category,
                        risk_level="Medium",
                        compliance_status="Needs review",
                        original_clause_text="No matching clause identified in document.",
                        matched_policy_rule=policy.expected_condition,
                        mismatch_reason=f"No clause for {policy.name} identified. Clarification required.",
                        suggested_action=f"Review if {policy.name} is handled in an addendum or requires insertion.",
                        ai_explanation=ai_service.generate_risk_explanation(
                            clause_title=f"Omitted {policy.name}",
                            clause_text="[Clause not identified]",
                            policy_name=policy.name,
                            policy_expected=policy.expected_condition,
                            mismatch_reason="Clause not present in extracted sections.",
                            category=policy.category
                        ),
                        source_page=1,
                        confidence=0.75
                    )
                    assessments.append(assessment)
                    medium_count += 1
                continue

            for cl in matched_clauses:
                status, level, reason, action = self._evaluate_clause_policy(cl, policy)
                
                if status in ["Non-compliant", "Needs review"]:
                    explanation = ai_service.generate_risk_explanation(
                        clause_title=cl.clause_title,
                        clause_text=cl.clause_text,
                        policy_name=policy.name,
                        policy_expected=policy.expected_condition,
                        mismatch_reason=reason,
                        category=policy.category
                    )

                    assessment = RiskAssessment(
                        contract_id=contract.id,
                        policy_id=policy.id,
                        clause_id=cl.id,
                        risk_title=f"{policy.name} Mismatch",
                        category=policy.category,
                        risk_level=level,
                        compliance_status=status,
                        original_clause_text=cl.clause_text,
                        matched_policy_rule=policy.expected_condition,
                        mismatch_reason=reason,
                        suggested_action=action,
                        ai_explanation=explanation,
                        source_page=cl.page_number,
                        confidence=0.88
                    )
                    assessments.append(assessment)
                    cl.risk_level = level

                    if level == "High":
                        high_count += 1
                    elif level == "Medium":
                        medium_count += 1
                    else:
                        low_count += 1
                else:
                    cl.risk_level = "Low"

        calculated_score = min(100.0, float(high_count * 25 + medium_count * 10 + low_count * 4))
        
        if calculated_score >= 60 or high_count >= 2:
            overall_level = "High"
        elif calculated_score >= 25 or medium_count >= 2:
            overall_level = "Medium"
        else:
            overall_level = "Low"

        for a in assessments:
            db.add(a)

        contract.overall_risk_score = calculated_score
        contract.overall_risk_level = overall_level
        contract.high_risk_count = high_count
        contract.medium_risk_count = medium_count
        contract.low_risk_count = low_count
        contract.processing_status = "analyzed"
        db.commit()

        return {
            "contract_id": contract.id,
            "overall_risk_score": calculated_score,
            "overall_risk_level": overall_level,
            "high_risk_count": high_count,
            "medium_risk_count": medium_count,
            "low_risk_count": low_count,
            "total_risks_detected": len(assessments)
        }

    def _evaluate_clause_policy(
        self,
        clause: Clause,
        policy: Policy
    ) -> Tuple[str, str, str, str]:
        text = clause.clause_text.lower()
        cat = policy.category

        if cat == "liability":
            if any(term in text for term in ["unlimited liability", "no limit of liability", "without limitation", "no cap"]):
                return (
                    "Non-compliant",
                    "High",
                    "The clause imposes unlimited liability or excludes liability caps entirely.",
                    "Negotiate an explicit liability cap not exceeding 1x contract fees or $500,000."
                )
            if "indemnif" in text and "hold harmless" in text and "solely" not in text and "cap" not in text:
                return (
                    "Needs review",
                    "Medium",
                    "Broad indemnification obligations identified without clear mutual capping.",
                    "Ensure indemnity is limited to direct third-party intellectual property infringement or gross negligence."
                )

        elif cat == "termination":
            notice_match = re.search(r"(\d{1,3})\s*(?:business\s*)?days?\s*(?:prior\s*)?(?:written\s*)?notice", text)
            if notice_match:
                days = int(notice_match.group(1))
                if policy.numeric_threshold and days < policy.numeric_threshold:
                    return (
                        "Non-compliant",
                        "High" if days <= 7 else "Medium",
                        f"Notice period of {days} days is below company minimum policy of {int(policy.numeric_threshold)} days.",
                        f"Amend termination notice period from {days} days to at least {int(policy.numeric_threshold)} days."
                    )
            elif "immediate termination" in text or "without notice" in text:
                return (
                    "Non-compliant",
                    "High",
                    "Allows unilateral immediate termination without cure period or advance notice.",
                    "Insert a mandatory 30-day notice and cure period for alleged breaches."
                )

        elif cat == "payment":
            net_match = re.search(r"net\s*(\d{1,3})|within\s*(\d{1,3})\s*days", text)
            if net_match:
                days = int(net_match.group(1) or net_match.group(2))
                if policy.numeric_threshold and days > policy.numeric_threshold:
                    return (
                        "Non-compliant",
                        "Medium",
                        f"Payment term is Net {days} days, exceeding company standard limit of Net {int(policy.numeric_threshold)} days.",
                        f"Adjust payment terms to Net {int(policy.numeric_threshold)} days."
                    )
            if any(p in text for p in ["penalty of 5%", "penalty of 10%", "2% per month", "interest rate of 18%"]):
                return (
                    "Non-compliant",
                    "Medium",
                    "Excessive late payment penalty or punitive interest identified.",
                    "Cap late interest at statutory or maximum 1% to 1.5% per month."
                )

        elif cat == "confidentiality":
            surv_match = re.search(r"survive\s+(?:for\s+)?(\d{1,2})\s*(?:year|month)", text)
            if surv_match:
                duration_years = int(surv_match.group(1))
                if "month" in surv_match.group(0):
                    duration_years = duration_years / 12.0
                if policy.numeric_threshold and duration_years < policy.numeric_threshold:
                    return (
                        "Non-compliant",
                        "Medium",
                        f"Confidentiality survival of {duration_years} year(s) is shorter than required {int(policy.numeric_threshold)} years.",
                        f"Extend confidentiality duration to at least {int(policy.numeric_threshold)} years or perpetual for proprietary information."
                    )
            if "1 year" in text and "survive" in text:
                return (
                    "Non-compliant",
                    "Medium",
                    "Confidentiality obligations expire after only 1 year post-termination.",
                    "Extend confidentiality protection to standard 3-year term."
                )

        elif cat == "renewal":
            if any(term in text for term in ["automatic renewal", "automatically renew", "evergreen"]):
                if not any(term in text for term in ["written notice", "opt-out", "notice of non-renewal"]):
                    return (
                        "Non-compliant",
                        "High",
                        "Contract automatically renews with no clear notice mechanism for non-renewal.",
                        "Add clause permitting either party to prevent renewal with 30 days written notice."
                    )
                else:
                    return (
                        "Needs review",
                        "Low",
                        "Contract contains automatic renewal with notice mechanism.",
                        "Calendar non-renewal deadlines in tracking system."
                    )

        elif cat == "data_protection":
            if not any(t in text for t in ["72 hours", "breach notification", "gdpr", "security incident"]):
                return (
                    "Needs review",
                    "Medium",
                    "Data protection clause lacks explicit 72-hour breach notification timeframe.",
                    "Require vendor to formally report security breaches within 72 hours."
                )

        return ("Compliant", "Low", "Clause generally satisfies company policy requirements.", "No immediate action required.")

risk_engine = RiskEngine()
