from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import ChatSession, ChatMessage
from app.services.rag import chat_with_rag

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None


class CitationOut(BaseModel):
    doc_number: str
    title: str
    page: Optional[int]
    source_type: str
    cited_text: str


class ChatResponse(BaseModel):
    session_id: int
    answer: str
    citations: list[CitationOut]


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Pesan tidak boleh kosong")

    # Get or create session
    if payload.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    else:
        session = ChatSession()
        db.add(session)
        db.commit()
        db.refresh(session)

    # Build history for context (last 10 messages)
    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id.desc())
        .limit(10)
        .all()
    )
    chat_history = [{"role": m.role, "content": m.content} for m in reversed(history_rows)]

    # RAG pipeline
    result = await chat_with_rag(message=payload.message, chat_history=chat_history)

    # Persist user message + assistant response
    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message))
    db.add(
        ChatMessage(
            session_id=session.id,
            role="assistant",
            content=result["answer"],
            citations=result["citations"],
        )
    )
    db.commit()

    return ChatResponse(
        session_id=session.id,
        answer=result["answer"],
        citations=[CitationOut(**c) for c in result["citations"]],
    )


@router.get("/sessions/{session_id}/history")
def get_history(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .all()
    )
    return [
        {
            "role": m.role,
            "content": m.content,
            "citations": m.citations,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]
