"""
Extracts and chunks text from PDF files using PyMuPDF.
Preserves page numbers per chunk for accurate citation.
"""
import re
import fitz  # PyMuPDF


def extract_chunks_from_pdf(
    file_path: str,
    chunk_size: int = 400,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Returns list of {text, page_number} dicts.
    chunk_size is measured in approximate word count (≈ tokens).
    """
    doc = fitz.open(file_path)
    page_texts: list[tuple[int, str]] = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")
        text = _clean_text(text)
        if text:
            page_texts.append((page_num, text))

    doc.close()
    return _chunk_pages(page_texts, chunk_size, chunk_overlap)


def _clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _chunk_pages(
    page_texts: list[tuple[int, str]],
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    """
    Splits each page's text into overlapping chunks.
    Overlap is achieved by re-using the last `chunk_overlap` words of the previous chunk.
    """
    chunks = []
    for page_number, text in page_texts:
        words = text.split()
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_text = " ".join(words[start:end])
            if len(chunk_text) > 50:  # skip tiny fragments
                chunks.append({"text": chunk_text, "page_number": page_number})
            if end == len(words):
                break
            start += chunk_size - chunk_overlap
    return chunks
