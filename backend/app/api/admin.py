import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import require_admin
from app.core.config import settings
from app.models.models import Document, User
from app.services.ingestion import ingest_pdf, ingest_web, delete_document

router = APIRouter(prefix="/admin", tags=["admin"])


# ── DTOs ───────────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    title: str
    doc_number: Optional[str]
    source_type: str
    source_url: Optional[str]
    status: str
    total_chunks: int
    error_message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ScrapeRequest(BaseModel):
    url: str
    title: str
    doc_number: Optional[str] = None


# ── endpoints ──────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [_doc_to_out(d) for d in docs]


@router.post("/documents/upload", response_model=DocumentOut, status_code=201)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_number: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Hanya file PDF yang diizinkan")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(status_code=413, detail=f"Ukuran file maksimal {settings.max_file_size_mb} MB")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{current_user.id}_{file.filename}"
    file_path.write_bytes(content)

    doc = Document(
        title=title,
        doc_number=doc_number,
        source_type="pdf",
        file_path=str(file_path),
        status="pending",
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(_run_ingest_pdf, doc.id)
    return _doc_to_out(doc)


@router.post("/documents/scrape", response_model=DocumentOut, status_code=201)
async def scrape_web(
    payload: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    doc = Document(
        title=payload.title,
        doc_number=payload.doc_number,
        source_type="web",
        source_url=payload.url,
        status="pending",
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(_run_ingest_web, doc.id)
    return _doc_to_out(doc)


@router.post("/documents/{document_id}/reindex", response_model=DocumentOut)
async def reindex_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    if doc.source_type == "pdf":
        background_tasks.add_task(_run_ingest_pdf, document_id)
    else:
        background_tasks.add_task(_run_ingest_web, document_id)

    doc.status = "pending"
    db.commit()
    db.refresh(doc)
    return _doc_to_out(doc)


@router.delete("/documents/{document_id}", status_code=204)
async def remove_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    await delete_document(document_id, db)


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    return _doc_to_out(doc)


# ── background task wrappers (need own DB session) ─────────────────────────────

def _run_ingest_pdf(document_id: int) -> None:
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        asyncio.run(ingest_pdf(document_id, db))
    finally:
        db.close()


def _run_ingest_web(document_id: int) -> None:
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        asyncio.run(ingest_web(document_id, db))
    finally:
        db.close()


def _doc_to_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        title=d.title,
        doc_number=d.doc_number,
        source_type=d.source_type,
        source_url=d.source_url,
        status=d.status,
        total_chunks=d.total_chunks,
        error_message=d.error_message,
        created_at=d.created_at.isoformat(),
    )
