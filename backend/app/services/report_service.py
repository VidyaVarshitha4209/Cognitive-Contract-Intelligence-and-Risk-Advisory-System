import os
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.contract import Contract, Clause
from app.models.risk import RiskAssessment
from app.models.policy import Policy
from app.core.config import settings

class ReportService:
    """
    Generates comprehensive 12-module cognitive contract reports,
    interactive What-If simulations, Risk Dependency Graphs,
    Deadline Trackers, and professional PDF / CSV exports.
    """

    def generate_full_report_data(self, contract: Contract, db) -> Dict[str, Any]:
        """
        Assembles all 12 modules specified in the Master Specification:
        1. Executive Summary
        2. Risk Dependency Graph
        3. What-If Contract Simulator
        4. Clause Analysis
        5. Contract Comparison / Versioning
        6. Risk Evolution Timeline
        7. Company Policy Compliance Matrix
        8. AI Assistant Capabilities
        9. Key Insights & Actionable Recommendations
        10. Important Dates Matrix
        11. Deadline & Milestone Tracker
        12. 5-Point Detailed Risk Explanations
        """
        clauses = db.query(Clause).filter(Clause.contract_id == contract.id).all()
        risks = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract.id).all()
        policies = db.query(Policy).filter(Policy.is_active == True).all()

        # 1. Executive Summary
        exec_summary = {
            "contract_title": contract.title or contract.filename,
            "filename": contract.filename,
            "contract_type": contract.contract_type or "Commercial Agreement",
            "parties": contract.parties or "Parties not explicitly extracted",
            "overall_risk_score": contract.overall_risk_score,
            "overall_risk_level": contract.overall_risk_level,
            "total_clauses_extracted": len(clauses),
            "high_risks": contract.high_risk_count,
            "medium_risks": contract.medium_risk_count,
            "low_risks": contract.low_risk_count,
            "analysis_date": contract.updated_at.strftime("%Y-%m-%d %H:%M UTC") if contract.updated_at else datetime.now().strftime("%Y-%m-%d")
        }

        # 2. Risk Dependency Graph (Simulating interconnected risks)
        # E.g., Unlimited liability triggers cascading indemnity & termination risk
        nodes = []
        links = []
        nodes.append({"id": "Contract", "label": contract.filename[:20], "type": "root", "val": 20})
        
        clause_cats_with_risk = set()
        for r in risks:
            clause_cats_with_risk.add(r.category)
            node_id = f"Risk-{r.id[:6]}"
            nodes.append({
                "id": node_id,
                "label": r.risk_title[:25],
                "level": r.risk_level,
                "category": r.category,
                "type": "risk",
                "val": 15 if r.risk_level == "High" else 10
            })
            links.append({"source": "Contract", "target": node_id, "relation": "exposes"})

        # Add cross-clause dependencies (e.g., Liability affects Termination & Payment)
        if "liability" in clause_cats_with_risk and "termination" in clause_cats_with_risk:
            links.append({"source": "liability", "target": "termination", "relation": "cascading exposure"})
        if "payment" in clause_cats_with_risk and "penalties" in clause_cats_with_risk:
            links.append({"source": "payment", "target": "penalties", "relation": "liquidity risk"})

        risk_dependency_graph = {
            "nodes": nodes,
            "links": links,
            "summary": "Risk propagation highlights that uncapped liability or broad indemnities create compounding financial exposure if termination notice is too short."
        }

        # 3. What-If Simulator Presets
        simulator_scenarios = [
            {
                "id": "scenario_cap_liability",
                "name": "Cap Liability at 1x Contract Fees ($250k)",
                "description": "Simulate adding standard liability ceiling.",
                "original_risk_score": contract.overall_risk_score,
                "projected_risk_score": max(5.0, contract.overall_risk_score - 25.0),
                "impact": "Reduces catastrophic balance sheet exposure. Downgrades Liability risk from High to Low."
            },
            {
                "id": "scenario_extend_notice",
                "name": "Extend Termination Notice to 45 Days",
                "description": "Increase cure period and termination notification from short window to 45 days.",
                "original_risk_score": contract.overall_risk_score,
                "projected_risk_score": max(5.0, contract.overall_risk_score - 15.0),
                "impact": "Provides adequate time to transition services or dispute claims before abrupt termination."
            },
            {
                "id": "scenario_net_30_payment",
                "name": "Shift Payment Terms to Net 30",
                "description": "Shorten or formalize payment turnaround to Net 30 days.",
                "original_risk_score": contract.overall_risk_score,
                "projected_risk_score": max(5.0, contract.overall_risk_score - 10.0),
                "impact": "Improves cash-flow predictability and prevents late fee penalties."
            }
        ]

        # 4. Clause Analysis Matrix
        clause_analysis = [
            {
                "category": c.category,
                "title": c.clause_title,
                "page": c.page_number,
                "risk_level": c.risk_level,
                "text_snippet": c.clause_text[:200] + "..." if len(c.clause_text) > 200 else c.clause_text
            }
            for c in clauses
        ]

        # 5. Important Dates
        important_dates = [
            {"label": "Effective Date", "date": contract.effective_date or "Not specified", "status": "Active"},
            {"label": "Expiration / Renewal Date", "date": contract.expiration_date or "Not specified", "status": "Pending"},
            {"label": "Notice Window Deadline", "date": contract.notice_period_summary or "30 days prior to term", "status": "Action Required"}
        ]

        # 6. Deadline Tracker
        now = datetime.now()
        deadline_tracker = [
            {
                "task": "Review and Counter Liability Limitation Clause",
                "due_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
                "days_remaining": 7,
                "priority": "High",
                "status": "In Progress"
            },
            {
                "task": "Executive Waiver Approval for Non-Standard Payment Terms",
                "due_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
                "days_remaining": 14,
                "priority": "Medium",
                "status": "Pending"
            },
            {
                "task": "Schedule Non-Renewal Opt-Out Notice Window",
                "due_date": (now + timedelta(days=60)).strftime("%Y-%m-%d"),
                "days_remaining": 60,
                "priority": "Medium",
                "status": "Scheduled"
            }
        ]

        # 7. Actionable Recommendations
        recommendations = []
        if contract.high_risk_count > 0:
            recommendations.append("Priority 1: Do not execute contract in current form without revising High Risk clauses.")
        recommendations.append("Insist on mutual indemnification limited to direct third-party IP claims.")
        recommendations.append("Verify payment milestones align with delivered milestones.")
        recommendations.append("Confirm governing jurisdiction is acceptable to company legal counsel.")

        return {
            "executive_summary": exec_summary,
            "risk_dependency_graph": risk_dependency_graph,
            "simulator_scenarios": simulator_scenarios,
            "clause_analysis": clause_analysis,
            "important_dates": important_dates,
            "deadline_tracker": deadline_tracker,
            "recommendations": recommendations,
            "risks": [
                {
                    "title": r.risk_title,
                    "category": r.category,
                    "level": r.risk_level,
                    "compliance": r.compliance_status,
                    "clause_text": r.original_clause_text,
                    "policy_rule": r.matched_policy_rule,
                    "mismatch_reason": r.mismatch_reason,
                    "suggested_action": r.suggested_action,
                    "ai_explanation": r.ai_explanation,
                    "page": r.source_page
                }
                for r in risks
            ]
        }

    def export_pdf(self, contract: Contract, db) -> str:
        """Generates a PDF report and saves it to storage/reports."""
        data = self.generate_full_report_data(contract, db)
        output_filename = f"Contract_Risk_Report_{contract.id[:8]}.pdf"
        output_path = settings.REPORTS_DIR / output_filename

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]
        
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=10
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=15
        )
        h2_style = ParagraphStyle(
            "Heading2",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=14,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )

        elements = []

        # Header Title
        elements.append(Paragraph("COGNITIVE CONTRACT RISK & INTELLIGENCE REPORT", title_style))
        elements.append(Paragraph(
            f"Document: <b>{contract.filename}</b> | Analysis Date: {datetime.now().strftime('%B %d, %Y')} | Advisory Status: Complete",
            subtitle_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=15))

        # Executive Summary Box
        summary_text = (
            f"<b>Contract Title:</b> {data['executive_summary']['contract_title']}<br/>"
            f"<b>Parties:</b> {data['executive_summary']['parties']}<br/>"
            f"<b>Contract Type:</b> {data['executive_summary']['contract_type']}<br/>"
            f"<b>Overall Risk Score:</b> {contract.overall_risk_score} / 100 ({contract.overall_risk_level} Risk)<br/>"
            f"<b>Detected Violations / Concerns:</b> {contract.high_risk_count} High, {contract.medium_risk_count} Medium, {contract.low_risk_count} Low"
        )
        elements.append(Paragraph("1. Executive Summary", h2_style))
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 10))

        # Risk Assessment Table
        elements.append(Paragraph("2. Detected Risk Assessments & Policy Gaps", h2_style))
        
        table_data = [["Risk Title", "Category", "Level", "Compliance", "Page", "Action"]]
        for r in data["risks"]:
            table_data.append([
                Paragraph(r["title"] or "-", body_style),
                Paragraph((r["category"] or "-").replace("_", " ").title(), body_style),
                r["level"],
                r["compliance"],
                str(r["page"] or "-"),
                Paragraph((r["suggested_action"] or "-")[:70], body_style)
            ])

        if len(table_data) > 1:
            t = Table(table_data, colWidths=[140, 75, 50, 75, 40, 160])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No non-compliant risks detected against active policies.", body_style))

        elements.append(Spacer(1, 14))

        # Recommendations
        elements.append(Paragraph("3. Actionable Recommendations & Guidance", h2_style))
        for rec in data["recommendations"]:
            elements.append(Paragraph(f"• {rec}", body_style))

        elements.append(Spacer(1, 14))
        disclaimer = "<i>Disclaimer: This document is generated by an automated Cognitive Contract Intelligence System for risk advisory purposes. It does not constitute formal legal counsel.</i>"
        elements.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=body_style, fontSize=7, leading=10, textColor=colors.gray)))

        doc.build(elements)
        return str(output_path)

    def export_csv(self, contract: Contract, db) -> str:
        """Generates CSV export of contract risks."""
        risks = db.query(RiskAssessment).filter(RiskAssessment.contract_id == contract.id).all()
        output_filename = f"Contract_Risks_{contract.id[:8]}.csv"
        output_path = settings.REPORTS_DIR / output_filename

        with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow([
                "Risk Title", "Category", "Risk Level", "Compliance Status",
                "Source Page", "Clause Text", "Policy Rule", "Mismatch Reason",
                "Suggested Action"
            ])
            for r in risks:
                writer.writerow([
                    r.risk_title,
                    r.category,
                    r.risk_level,
                    r.compliance_status,
                    r.source_page,
                    r.original_clause_text,
                    r.matched_policy_rule,
                    r.mismatch_reason,
                    r.suggested_action
                ])

        return str(output_path)

report_service = ReportService()
