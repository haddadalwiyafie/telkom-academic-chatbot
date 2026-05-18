"""
Orchestrates document ingestion: parse → chunk → embed → store.
Called by admin API after PDF upload or web scrape.
"""
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Document, DocumentChunk
from app.services.rag import add_chunks_to_vector_store, delete_document_from_vector_store
from ingestion.pdf_parser import extract_chunks_from_pdf
from ingestion.scraper import scrape_url


async def ingest_pdf(document_id: int, db: Session) -> None:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path:
        return
    await _process_document(doc, db, source="pdf")


async def ingest_web(document_id: int, db: Session) -> None:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.source_url:
        return
    await _process_document(doc, db, source="web")


async def _process_document(doc: Document, db: Session, source: str) -> None:
    doc.status = "pending"
    db.commit()

    try:
        if source == "pdf":
            raw_chunks = extract_chunks_from_pdf(
                file_path=doc.file_path,
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
        else:
            raw_chunks = await scrape_url(
                url=doc.source_url,
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )

        if not raw_chunks:
            doc.status = "failed"
            doc.error_message = "Tidak ada teks yang dapat diekstrak"
            db.commit()
            return

        # Remove old chunks if re-indexing
        old_chroma_ids = [c.chroma_id for c in doc.chunks]
        if old_chroma_ids:
            await delete_document_from_vector_store(old_chroma_ids)
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
            db.commit()

        # Build chunk records
        chunks_for_vector_store = []
        db_chunks = []
        for i, raw in enumerate(raw_chunks):
            chroma_id = f"doc{doc.id}_chunk{i}_{uuid.uuid4().hex[:8]}"
            db_chunks.append(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=i,
                    chunk_text=raw["text"],
                    page_number=raw.get("page_number"),
                    chroma_id=chroma_id,
                )
            )
            chunks_for_vector_store.append(
                {
                    "chroma_id": chroma_id,
                    "text": raw["text"],
                    "document_id": doc.id,
                    "doc_number": doc.doc_number or "",
                    "title": doc.title,
                    "page_number": raw.get("page_number"),
                    "source_type": doc.source_type,
                }
            )

        # Embed and store in ChromaDB
        await add_chunks_to_vector_store(chunks_for_vector_store)

        # Persist chunks to PostgreSQL
        db.add_all(db_chunks)
        doc.status = "indexed"
        doc.total_chunks = len(db_chunks)
        db.commit()

    except Exception as exc:
        doc.status = "failed"
        doc.error_message = str(exc)
        db.commit()
        raise


async def delete_document(document_id: int, db: Session) -> None:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return

    chroma_ids = [c.chroma_id for c in doc.chunks]
    if chroma_ids:
        await delete_document_from_vector_store(chroma_ids)

    # Delete file if PDF
    if doc.file_path and Path(doc.file_path).exists():
        Path(doc.file_path).unlink(missing_ok=True)

    db.delete(doc)
    db.commit()
