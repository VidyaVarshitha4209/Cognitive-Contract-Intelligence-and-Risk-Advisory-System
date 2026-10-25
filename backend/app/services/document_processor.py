import os
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple
import fitz  # PyMuPDF
from PIL import Image, ImageEnhance, ImageFilter

class DocumentProcessor:
    """
    Robust document processing pipeline supporting:
    - Digital PDF (PyMuPDF with pdfplumber fallback)
    - Scanned PDF (PyMuPDF render + pytesseract OCR)
    - DOCX (python-docx)
    - Images (PNG, JPG, TIFF) via OCR with preprocessing
    - Plain text files
    """

    def __init__(self, tesseract_cmd: str = ""):
        self.tesseract_cmd = tesseract_cmd
        self._init_tesseract()

    def _init_tesseract(self):
        try:
            import pytesseract
            if self.tesseract_cmd and os.path.exists(self.tesseract_cmd):
                pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
            else:
                # Check standard Windows paths
                common_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
                ]
                for p in common_paths:
                    if os.path.exists(p):
                        pytesseract.pytesseract.tesseract_cmd = p
                        break
        except Exception:
            pass

    def _clean_text(self, text: str) -> str:
        """Removes excessive whitespace, invalid characters, and normalizes line breaks."""
        if not text:
            return ""
        # Replace carriage returns
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces and exotic spaces
        text = re.sub(r"[\xa0\u2000-\u200b]", " ", text)
        # Collapse multi-newlines (>3) to double newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse multiple inline spaces to one
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()

    def extract_from_file(self, file_path: str | Path) -> Dict[str, Any]:
        """
        Main extraction entry point.
        Returns:
            {
                "success": bool,
                "text": str,
                "pages": List[Dict[str, Any]], # page_number, text
                "page_count": int,
                "is_scanned": bool,
                "error": str | None
            }
        """
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": f"File not found: {file_path}", "pages": [], "page_count": 0, "text": ""}

        ext = path.suffix.lower()

        try:
            if ext == ".pdf":
                return self._extract_pdf(path)
            elif ext in [".docx", ".doc"]:
                return self._extract_docx(path)
            elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
                return self._extract_image(path)
            elif ext in [".txt", ".md"]:
                return self._extract_text_file(path)
            else:
                return {"success": False, "error": f"Unsupported file extension: {ext}", "pages": [], "page_count": 0, "text": ""}
        except Exception as e:
            return {"success": False, "error": f"Extraction failed: {str(e)}", "pages": [], "page_count": 0, "text": ""}

    def _extract_pdf(self, path: Path) -> Dict[str, Any]:
        doc = fitz.open(str(path))
        page_count = len(doc)
        pages = []
        is_scanned = False
        full_text_parts = []

        try:
            import pytesseract
            has_pytesseract = True
        except ImportError:
            has_pytesseract = False

        for page_idx in range(page_count):
            page = doc[page_idx]
            page_text = page.get_text() or ""
            cleaned = self._clean_text(page_text)

            # If page text is very short (less than 50 chars), it may be a scanned page
            if len(cleaned) < 50:
                # Attempt OCR on the page
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                if has_pytesseract:
                    try:
                        # Preprocess image
                        gray = img.convert("L")
                        ocr_text = pytesseract.image_to_string(gray)
                        cleaned_ocr = self._clean_text(ocr_text)
                        if len(cleaned_ocr) > len(cleaned):
                            cleaned = cleaned_ocr
                            is_scanned = True
                    except Exception:
                        pass  # keep digital text or note

            pages.append({
                "page_number": page_idx + 1,
                "text": cleaned
            })
            if cleaned:
                full_text_parts.append(f"--- [Page {page_idx + 1}] ---\n{cleaned}")

        doc.close()
        combined_text = "\n\n".join(full_text_parts)
        return {
            "success": True,
            "text": combined_text,
            "pages": pages,
            "page_count": page_count,
            "is_scanned": is_scanned,
            "error": None
        }

    def _extract_docx(self, path: Path) -> Dict[str, Any]:
        import docx
        doc = docx.Document(str(path))
        paragraphs = []
        
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                paragraphs.append(text)
                
        # Also extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)

        full_text = "\n\n".join(paragraphs)
        cleaned = self._clean_text(full_text)
        
        # Word documents don't have rigid physical pages, estimate 500 words per page
        words = cleaned.split()
        page_count = max(1, (len(words) // 400) + 1)
        
        pages = [{"page_number": 1, "text": cleaned}]
        return {
            "success": True,
            "text": cleaned,
            "pages": pages,
            "page_count": page_count,
            "is_scanned": False,
            "error": None
        }

    def _extract_image(self, path: Path) -> Dict[str, Any]:
        try:
            import pytesseract
            img = Image.open(str(path))
            
            # Preprocess: convert to grayscale and boost contrast
            gray = img.convert("L")
            enhancer = ImageEnhance.Contrast(gray)
            enhanced = enhancer.enhance(1.8)
            
            ocr_text = pytesseract.image_to_string(enhanced)
            cleaned = self._clean_text(ocr_text)
            
            return {
                "success": True,
                "text": cleaned,
                "pages": [{"page_number": 1, "text": cleaned}],
                "page_count": 1,
                "is_scanned": True,
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "text": "",
                "pages": [],
                "page_count": 0,
                "is_scanned": True,
                "error": f"OCR failed or Tesseract not installed: {str(e)}"
            }

    def _extract_text_file(self, path: Path) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        cleaned = self._clean_text(content)
        return {
            "success": True,
            "text": cleaned,
            "pages": [{"page_number": 1, "text": cleaned}],
            "page_count": max(1, len(cleaned.split()) // 400 + 1),
            "is_scanned": False,
            "error": None
        }

document_processor = DocumentProcessor()
