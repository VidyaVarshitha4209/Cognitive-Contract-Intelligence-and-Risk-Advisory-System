import re
from typing import List, Dict, Any

class ClauseSegmenter:
    """
    Intelligently splits contract text into structured clauses and assigns
    standardized legal categories using rule-based heading detection,
    numbering detection, and semantic pattern matching.
    """

    CATEGORIES = {
        "parties": [
            r"parties", r"between\s+the\s+undersigned", r"definitions?", r"recitals?", r"preamble",
            r"this\s+agreement\s+is\s+made\s+and\s+entered", r"contracting\s+parties"
        ],
        "payment": [
            r"payment", r"fees?", r"compensation", r"invoicing", r"consideration", r"price",
            r"billing", r"remuneration", r"taxes", r"currency", r"installments?"
        ],
        "confidentiality": [
            r"confidentiality", r"confidential\s+information", r"non-disclosure", r"nda",
            r"proprietary\s+information", r"trade\s+secrets?", r"secrecy"
        ],
        "liability": [
            r"liability", r"limitation\s+of\s+liability", r"indemnification", r"indemnity",
            r"hold\s+harmless", r"damages", r"warranty\s+disclaimer", r"warranties"
        ],
        "termination": [
            r"termination", r"term\s+and\s+termination", r"survival", r"expiration",
            r"cancellation", r"suspension\s+of\s+services?"
        ],
        "renewal": [
            r"renewal", r"extension", r"automatic\s+renewal", r"evergreen", r"prolongation"
        ],
        "notice_period": [
            r"notice\s+period", r"written\s+notice", r"notices?", r"notification"
        ],
        "penalties": [
            r"penalt(y|ies)", r"liquidated\s+damages", r"late\s+fee", r"interest\s+on\s+late\s+payment",
            r"default\s+charges?"
        ],
        "intellectual_property": [
            r"intellectual\s+property", r"ip\s+rights?", r"ownership\s+of\s+work", r"trademarks?",
            r"copyrights?", r"patents?", r"work\s+made\s+for\s+hire", r"licens(e|ing)"
        ],
        "dispute_resolution": [
            r"dispute\s+resolution", r"arbitration", r"mediation", r"jurisdiction",
            r"governing\s+courts?", r"litigation"
        ],
        "governing_law": [
            r"governing\s+law", r"applicable\s+law", r"choice\s+of\s+law", r"jurisdiction\s+and\s+governing\s+law"
        ],
        "data_protection": [
            r"data\s+protection", r"privacy", r"gdpr", r"security", r"data\s+processing",
            r"personal\s+data", r"confidential\s+data"
        ]
    }

    def _detect_category(self, title: str, text: str) -> str:
        """Determines the clause category based on title and snippet."""
        combined = f"{title.lower()} {text[:200].lower()}"
        
        # Check title first (higher priority)
        title_lower = title.lower()
        for cat, patterns in self.CATEGORIES.items():
            for pat in patterns:
                if re.search(r"\b" + pat + r"\b", title_lower, re.IGNORECASE):
                    return cat

        # Check body text
        for cat, patterns in self.CATEGORIES.items():
            for pat in patterns:
                if re.search(r"\b" + pat + r"\b", combined, re.IGNORECASE):
                    return cat

        return "other"

    def segment_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Segments full document text into structured clauses.
        Returns list of dicts:
            {
                "category": str,
                "clause_title": str,
                "clause_text": str,
                "page_number": int,
                "confidence_score": float
            }
        """
        if not text:
            return []

        # Track page numbers by page markers
        # E.g. --- [Page 1] ---
        page_pattern = re.compile(r"--- \[Page (\d+)\] ---")
        
        # Regex to split on numbered sections or capitalized titles
        # Examples:
        # "1. Payment Terms" or "Section 2: Termination" or "Article III - Liability" or "10. REVIEWS"
        heading_pattern = re.compile(
            r"(?:\n|^)(?:(?:Section|Article|Clause)\s+[\dIVXLC]+[\.\:\-]?\s*|[0-9]{1,2}\.[\s\t]+)([A-Z][^\n]{3,60})(?=\n|$)",
            re.IGNORECASE
        )

        matches = list(heading_pattern.finditer(text))
        clauses = []

        if not matches:
            # Fallback: split by double newlines into logical chunks
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 40]
            current_page = 1
            for idx, p in enumerate(paragraphs):
                # Check if page marker exists in paragraph
                page_match = page_pattern.search(p)
                if page_match:
                    current_page = int(page_match.group(1))
                    p = page_pattern.sub("", p).strip()

                first_line = p.split("\n")[0][:60]
                category = self._detect_category(first_line, p)
                clauses.append({
                    "category": category,
                    "clause_title": f"Clause {idx + 1}: {first_line[:40]}...",
                    "clause_text": p,
                    "page_number": current_page,
                    "confidence_score": 0.8
                })
            return clauses

        current_page = 1
        for i in range(len(matches)):
            m = matches[i]
            title = m.group(1).strip()
            start_pos = m.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            
            clause_content = text[start_pos:end_pos].strip()
            
            # Check for page indicator
            page_search = page_pattern.findall(text[:start_pos])
            if page_search:
                current_page = int(page_search[-1])

            # Clean page tags out of clause text
            cleaned_clause = page_pattern.sub("", clause_content).strip()
            
            # Extract clean title from matched heading
            raw_heading = m.group(0).strip()
            category = self._detect_category(title, cleaned_clause)

            clauses.append({
                "category": category,
                "clause_title": raw_heading.replace("\n", " ")[:100],
                "clause_text": cleaned_clause,
                "page_number": current_page,
                "confidence_score": 0.92
            })

        # Check preamble / definitions if first match started after offset 0
        if matches and matches[0].start() > 50:
            preamble = text[:matches[0].start()].strip()
            preamble = page_pattern.sub("", preamble).strip()
            if len(preamble) > 30:
                clauses.insert(0, {
                    "category": "parties",
                    "clause_title": "Preamble & Recitals",
                    "clause_text": preamble,
                    "page_number": 1,
                    "confidence_score": 0.95
                })

        return clauses

clause_segmenter = ClauseSegmenter()
