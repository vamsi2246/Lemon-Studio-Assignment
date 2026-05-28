import pypdf
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def extract_pdf_pages(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF file using pypdf.
    Returns a list of dicts: [{'text': str, 'page': int}]
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at: {file_path}")

    pages_data = []
    try:
        reader = pypdf.PdfReader(file_path)
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            # Clean up double spacing and empty pages
            page_text = page_text.strip()
            if page_text:
                pages_data.append({
                    "text": page_text,
                    "page": idx + 1 # 1-indexed page
                })
        logger.info(f"Successfully extracted {len(pages_data)} pages from {file_path}")
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {e}")
        raise e

    return pages_data
