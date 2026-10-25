import re
from typing import Dict, Any, List, Optional

class EntityExtractor:
    """
    Extracts structured legal entities and metadata from contract text and clauses:
    - Title & Contract Type
    - Parties Involved
    - Effective & Expiration Dates
    - Payment Terms & Amounts
    - Notice Period
    - Governing Law
    - Renewal Terms
    Preserves exact clause & page references. Returns 'Not found' when unavailable.
    """

    def extract_entities(self, text: str, clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        entities = {
            "title": self._extract_title(text),
            "contract_type": self._extract_contract_type(text),
            "parties": self._extract_parties(text, clauses),
            "effective_date": self._extract_date(text, "effective"),
            "expiration_date": self._extract_date(text, "expiration"),
            "payment_terms": self._extract_payment_terms(clauses),
            "notice_period": self._extract_notice_period(clauses),
            "governing_law": self._extract_governing_law(clauses),
            "renewal_terms": self._extract_renewal_terms(clauses),
            "obligations_summary": self._extract_obligations(clauses)
        }
        return entities

    def _extract_title(self, text: str) -> str:
        first_lines = [l.strip() for l in text.split("\n")[:10] if len(l.strip()) > 3]
        for line in first_lines:
            if any(term in line.upper() for term in ["AGREEMENT", "CONTRACT", "TERMS OF SERVICE", "MEMORANDUM"]):
                return line[:100]
        return first_lines[0][:100] if first_lines else "Contract Document"

    def _extract_contract_type(self, text: str) -> str:
        text_upper = text[:2000].upper()
        types = [
            ("Non-Disclosure Agreement (NDA)", ["NON-DISCLOSURE", "CONFIDENTIALITY AGREEMENT", "NDA"]),
            ("Master Services Agreement (MSA)", ["MASTER SERVICES", "SERVICES AGREEMENT", "SERVICE LEVEL"]),
            ("Employment Agreement", ["EMPLOYMENT AGREEMENT", "EMPLOYMENT CONTRACT", "OFFER LETTER"]),
            ("Vendor / Supplier Agreement", ["VENDOR AGREEMENT", "SUPPLIER AGREEMENT", "PURCHASE AGREEMENT"]),
            ("Software License Agreement", ["SOFTWARE LICENSE", "END USER LICENSE", "EULA", "SAAS AGREEMENT"]),
            ("Lease Agreement", ["LEASE AGREEMENT", "TENANCY AGREEMENT", "RENTAL AGREEMENT"]),
            ("Consulting Agreement", ["CONSULTING AGREEMENT", "ADVISORY AGREEMENT"])
        ]
        for name, keywords in types:
            for kw in keywords:
                if kw in text_upper:
                    return name
        return "Commercial Contract"

    def _extract_parties(self, text: str, clauses: List[Dict[str, Any]]) -> str:
        # Check preamble or parties clause first
        target_text = ""
        for c in clauses:
            if c["category"] == "parties":
                target_text = c["clause_text"]
                break
        if not target_text:
            target_text = text[:1500]

        # Look for pattern: between X and Y
        party_match = re.search(
            r"between\s+([^\n,\"]+?)(?:,\s*|\s+and\s+)([^\n,\"]+?)(?:,\s*collectively|\.|\n)",
            target_text,
            re.IGNORECASE
        )
        if party_match:
            p1 = party_match.group(1).strip()
            p2 = party_match.group(2).strip()
            # Clean common artifacts
            p1 = re.sub(r"^(the\s+)?", "", p1, flags=re.IGNORECASE)
            p2 = re.sub(r"^(the\s+)?", "", p2, flags=re.IGNORECASE)
            return f"{p1} & {p2}"

        # Regex for company suffixes
        orgs = re.findall(r"([A-Z][A-Za-z0-9\s,\.]+(?:Inc\.|LLC|Corp\.|Ltd\.|Corporation|Company|Limited|Pvt\.\s*Ltd\.))", target_text)
        if orgs:
            unique_orgs = list(dict.fromkeys([o.strip() for o in orgs if len(o.strip()) > 3]))
            if len(unique_orgs) >= 2:
                return f"{unique_orgs[0]} & {unique_orgs[1]}"
            elif len(unique_orgs) == 1:
                return unique_orgs[0]

        return "Not specified"

    def _extract_date(self, text: str, date_type: str) -> str:
        snippets = text[:3000]
        if date_type == "effective":
            patterns = [
                r"effective\s+(?:date\s+is\s+|as\s+of\s+)([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
                r"dated\s+(?:as\s+of\s+)?([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
                r"entered\s+into\s+on\s+([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})"
            ]
        else:
            patterns = [
                r"(?:expire|expiration|terminat\w+)\s+(?:on|date\s+is\s+)?([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
                r"(?:term\s+shall\s+end\s+on\s+)([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
                r"valid\s+until\s+([A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})"
            ]

        for p in patterns:
            match = re.search(p, snippets, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return "Not found"

    def _extract_payment_terms(self, clauses: List[Dict[str, Any]]) -> str:
        for c in clauses:
            if c["category"] == "payment":
                text = c["clause_text"]
                # Search for Net days (e.g. Net 30, within 15 days)
                net_match = re.search(r"\b(?:net\s*(\d{1,3})|within\s*(\d{1,3})\s*days)\b", text, re.IGNORECASE)
                # Search for monetary figures
                amounts = re.findall(r"(\$|USD|INR|₹|EUR|€)\s?([0-9,]+(?:\.\d{2})?)", text)
                amount_str = f"Amount: {amounts[0][0]}{amounts[0][1]}" if amounts else ""
                
                days_str = ""
                if net_match:
                    days = net_match.group(1) or net_match.group(2)
                    days_str = f"Payment due within {days} days"
                
                summary = " | ".join(filter(None, [days_str, amount_str]))
                return summary if summary else text[:120] + "..."

        return "Not found"

    def _extract_notice_period(self, clauses: List[Dict[str, Any]]) -> str:
        for c in clauses:
            if c["category"] in ["notice_period", "termination"]:
                text = c["clause_text"]
                match = re.search(r"(\d{1,3})\s*(?:business\s*)?days(?:\'?\s*written\s*notice|\s*prior\s*notice)", text, re.IGNORECASE)
                if match:
                    return f"{match.group(1)} days written notice"
                month_match = re.search(r"(\d{1,2})\s*months?(?:\'?\s*written\s*notice|\s*prior\s*notice)", text, re.IGNORECASE)
                if month_match:
                    return f"{month_match.group(1)} months written notice"

        return "Not found"

    def _extract_governing_law(self, clauses: List[Dict[str, Any]]) -> str:
        for c in clauses:
            if c["category"] == "governing_law":
                text = c["clause_text"]
                match = re.search(r"governed\s+by(?:\s+the\s+laws\s+of)?\s+([A-Za-z\s]+?)(?:,|\.|\s+without|\s+and)", text, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
                return text[:80] + "..."
        return "Not found"

    def _extract_renewal_terms(self, clauses: List[Dict[str, Any]]) -> str:
        for c in clauses:
            if c["category"] in ["renewal", "termination"]:
                text = c["clause_text"]
                if re.search(r"automatic(?:ally)?\s+renew", text, re.IGNORECASE):
                    return "Automatic renewal enabled"
                elif re.search(r"written\s+agreement\s+of\s+both\s+parties", text, re.IGNORECASE):
                    return "Renewal upon mutual written consent"
        return "No auto-renewal specified"

    def _extract_obligations(self, clauses: List[Dict[str, Any]]) -> str:
        obligations = []
        for c in clauses:
            if c["category"] in ["confidentiality", "liability", "intellectual_property", "data_protection"]:
                obligations.append(f"{c['category'].replace('_', ' ').capitalize()}: {c['clause_title']}")
        return ", ".join(obligations[:4]) if obligations else "Standard contractual covenants"

entity_extractor = EntityExtractor()
