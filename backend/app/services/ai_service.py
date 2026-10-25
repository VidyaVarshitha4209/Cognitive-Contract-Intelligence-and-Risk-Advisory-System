import os
import json
from typing import Dict, Any, List, Optional
from app.core.config import settings

class AIService:
    """
    Configurable AI service supporting:
    - Google Gemini (when GEMINI_API_KEY is configured)
    - Grounded Local Rule & Knowledge Analyzer (offline / mock mode)
    Provides:
    1. 5-Part Grounded Risk Explanations
    2. RAG Contract Chatbot Answers with Source Citations
    3. Executive Comparison Summaries
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = settings.GEMINI_MODEL
        self.has_gemini = False
        
        if self.api_key and self.api_key.strip():
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key.strip())
                self.gemini_model = genai.GenerativeModel(self.model_name)
                self.has_gemini = True
            except Exception as e:
                print(f"Failed to initialize Gemini API: {e}")
                self.has_gemini = False

    def generate_risk_explanation(
        self,
        clause_title: str,
        clause_text: str,
        policy_name: str,
        policy_expected: str,
        mismatch_reason: str,
        category: str
    ) -> str:
        """
        Generates the required 5-part structured risk explanation:
        1. What the contract says
        2. What company policy requires
        3. How the two differ
        4. Why the difference matters
        5. Suggested action for the reviewer
        """
        prompt = f"""
You are an expert contract risk advisor assisting a legal reviewer.
Analyze this potential risk between a contract clause and company policy.
Do NOT fabricate citations. Use ONLY the facts provided below:

[Contract Clause: {clause_title}]
"{clause_text}"

[Company Policy: {policy_name}]
"{policy_expected}"

[Identified Mismatch]
"{mismatch_reason}"

Provide your assessment in exactly this 5-point structure:
1. What the contract says: (Concise factual summary of the clause)
2. What the company policy requires: (Summary of policy requirement)
3. How the two differ: (Direct contrast of the specific mismatch)
4. Why the difference may matter: (Commercial/operational/financial risk)
5. Suggested action: (Clear, actionable negotiation recommendation)

Disclaimer: Advisory only. Not formal legal advice.
"""
        if self.has_gemini:
            try:
                response = self.gemini_model.generate_content(prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                print(f"Gemini API call failed, falling back to local generator: {e}")

        # Grounded Local Explanation Generator (Strictly adheres to the 5 points)
        return (
            f"1. What the contract says: The clause '{clause_title}' specifies: \"{clause_text[:250]}...\"\n"
            f"2. What company policy requires: Under policy '{policy_name}', the organization expects: \"{policy_expected}\".\n"
            f"3. How the two differ: {mismatch_reason}.\n"
            f"4. Why the difference may matter: Deviating from company standards in the {category} category exposes the organization to unbudgeted liabilities, operational lock-in, or regulatory compliance exposure.\n"
            f"5. Suggested action: Request an amendment to align with '{policy_name}', or obtain formal executive waiver prior to signature.\n\n"
            f"[Note: Generated via Grounded Advisory Engine. For live Gemini LLM responses, set GEMINI_API_KEY in backend/.env]"
        )

    def answer_chat_question(
        self,
        question: str,
        contract_title: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        RAG Q&A grounded in retrieved chunks.
        Distinguishes between information present in contract vs missing.
        """
        if not retrieved_chunks:
            return {
                "answer": "I could not find any relevant information or clauses in the uploaded contract addressing your question. Please verify if this topic is covered in another section or rephrase your query.",
                "sources": []
            }

        context_text = "\n\n".join([
            f"[Source {i+1} | Page {c.get('page_number', 1)} | {c.get('clause_title', 'Clause')}]:\n{c.get('text', '')}"
            for i, c in enumerate(retrieved_chunks)
        ])

        system_instruction = (
            "You are a Cognitive Contract Intelligence AI Assistant. "
            "Your task is to answer the user's question strictly grounded in the provided contract excerpts. "
            "Never hallucinate terms not present in the excerpts. "
            "If the information is not in the excerpts, clearly state that it is not found. "
            "Always reference the relevant section and page numbers."
        )

        prompt = f"""
{system_instruction}

Contract: {contract_title}

Contract Excerpts:
{context_text}

Question: {question}

Provide a clear, professional answer:
"""

        sources = [
            {
                "clause_category": c.get("clause_category", "general"),
                "page_number": c.get("page_number", 1),
                "snippet": c.get("text", "")[:180] + "..."
            }
            for c in retrieved_chunks
        ]

        if self.has_gemini:
            try:
                response = self.gemini_model.generate_content(prompt)
                if response and response.text:
                    return {
                        "answer": response.text.strip(),
                        "sources": sources
                    }
            except Exception as e:
                print(f"Gemini chat failed, fallback to local: {e}")

        # Grounded Local Fallback Response
        best_chunk = retrieved_chunks[0]
        answer = (
            f"Based on **{best_chunk.get('clause_title', 'the contract text')}** (Page {best_chunk.get('page_number', 1)}):\n\n"
            f"> \"{best_chunk.get('text', '')[:350]}...\"\n\n"
            f"**Key Findings:**\n"
            f"- Topic: Related to **{best_chunk.get('clause_category', 'contract terms').replace('_', ' ').title()}**.\n"
            f"- Relevant excerpt located on **Page {best_chunk.get('page_number', 1)}**.\n\n"
            f"*Notice: This answer is extracted directly from contract clauses. Configure GEMINI_API_KEY in backend/.env for synthesized conversational answers.*"
        )

        return {
            "answer": answer,
            "sources": sources
        }

    def generate_comparison_summary(
        self,
        contract_a_title: str,
        contract_b_title: str,
        similarities: List[str],
        differences: List[str]
    ) -> str:
        """Generates executive summary for contract comparison."""
        diff_summary = "; ".join(differences[:3]) if differences else "No major discrepancies found."
        sim_summary = "; ".join(similarities[:3]) if similarities else "Standard commercial terms shared."
        
        return (
            f"Executive Comparison Summary: Compared '{contract_a_title}' against '{contract_b_title}'. "
            f"Key Differences Identified: {diff_summary}. "
            f"Shared Baseline Provisions: {sim_summary}. "
            f"Reviewers are advised to pay particular attention to liability caps, termination notice periods, and indemnity obligations before execution."
        )

ai_service = AIService()
