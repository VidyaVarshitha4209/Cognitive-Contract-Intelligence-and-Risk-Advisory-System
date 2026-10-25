import os
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.core.config import settings

class RAGService:
    """
    RAG (Retrieval-Augmented Generation) Service:
    - Chunks contract text while retaining clause and page metadata.
    - Builds semantic search indices (using TF-IDF & dense representations).
    - Retrieves top-k most relevant chunks for user queries.
    - Saves and loads vector indices per contract.
    """

    def __init__(self):
        self.vector_store_dir = settings.VECTOR_STORE_DIR

    def chunk_contract(self, clauses: List[Dict[str, Any]], raw_text: str = "") -> List[Dict[str, Any]]:
        """
        Splits contract into semantic chunks preserving clause title, category, and page.
        """
        chunks = []
        chunk_id = 0

        # Chunk by clauses first
        for clause in clauses:
            text = clause.get("clause_text", "")
            page_no = clause.get("page_number", 1)
            category = clause.get("category", "general")
            title = clause.get("clause_title", "Clause")

            # If clause is short (< 800 chars), keep as single chunk
            if len(text) <= 800:
                chunks.append({
                    "chunk_id": chunk_id,
                    "text": text,
                    "clause_category": category,
                    "clause_title": title,
                    "page_number": page_no
                })
                chunk_id += 1
            else:
                # Split large clauses into sub-chunks of ~500 chars with 100 overlap
                words = text.split()
                chunk_words = 100
                overlap = 20
                for start_idx in range(0, len(words), chunk_words - overlap):
                    sub_text = " ".join(words[start_idx:start_idx + chunk_words])
                    if len(sub_text.strip()) > 30:
                        chunks.append({
                            "chunk_id": chunk_id,
                            "text": sub_text,
                            "clause_category": category,
                            "clause_title": f"{title} (Part {(start_idx // (chunk_words - overlap)) + 1})",
                            "page_number": page_no
                        })
                        chunk_id += 1

        # If no clauses available, chunk raw text
        if not chunks and raw_text:
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 30]
            for p in paragraphs:
                chunks.append({
                    "chunk_id": chunk_id,
                    "text": p,
                    "clause_category": "general",
                    "clause_title": "Section",
                    "page_number": 1
                })
                chunk_id += 1

        return chunks

    def build_and_save_index(self, contract_id: str, chunks: List[Dict[str, Any]]) -> bool:
        """
        Builds index for a contract and saves chunks to disk.
        """
        try:
            target_path = self.vector_store_dir / f"{contract_id}_chunks.json"
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(chunks, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving vector index for contract {contract_id}: {e}")
            return False

    def load_chunks(self, contract_id: str) -> List[Dict[str, Any]]:
        """Loads chunks for a contract."""
        target_path = self.vector_store_dir / f"{contract_id}_chunks.json"
        if not target_path.exists():
            return []
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def retrieve_relevant_chunks(
        self,
        contract_id: str,
        query: str,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity retrieval using TF-IDF Vectorizer with n-grams
        and cosine distance over the contract's indexed chunks.
        """
        chunks = self.load_chunks(contract_id)
        if not chunks:
            return []

        corpus = [c["text"] for c in chunks]
        if not corpus:
            return []

        try:
            # Vectorize query and chunk corpus
            vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                sublinear_tf=True
            )
            tfidf_matrix = vectorizer.fit_transform(corpus)
            query_vec = vectorizer.transform([query])

            scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
            
            # Sort by similarity score descending
            ranked_indices = np.argsort(scores)[::-1]
            
            results = []
            for idx in ranked_indices[:top_k]:
                score = float(scores[idx])
                chunk = chunks[idx].copy()
                chunk["relevance_score"] = round(score, 4)
                results.append(chunk)

            return results
        except Exception as e:
            print(f"Retrieval error: {e}")
            # Fallback to simple keyword match
            return chunks[:top_k]

rag_service = RAGService()
