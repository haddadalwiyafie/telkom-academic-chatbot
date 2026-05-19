"""
RAG pipeline menggunakan Cohere Command R+ dengan grounded citations.
Cohere secara native mengembalikan citations (document_ids) dari dokumen yang diberikan.
"""
import asyncio
from typing import Any, Optional
import chromadb
import cohere
from app.core.config import settings

_chroma_client: Optional[Any] = None
_cohere_client: Optional[cohere.AsyncClient] = None


def get_chroma() -> chromadb.Collection:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_path)
    return _chroma_client.get_or_create_collection(
        name="academic_docs",
        metadata={"hnsw:space": "cosine"},
    )


def get_cohere() -> cohere.AsyncClient:
    global _cohere_client
    if _cohere_client is None:
        _cohere_client = cohere.AsyncClient(api_key=settings.cohere_api_key)
    return _cohere_client


async def embed_texts(texts: list[str], input_type: str = "search_document") -> list[list[float]]:
    co = get_cohere()
    response = await co.embed(
        texts=texts,
        model=settings.cohere_embed_model,
        input_type=input_type,
    )
    return response.embeddings


async def add_chunks_to_vector_store(
    chunks: list[dict],  # [{chroma_id, text, document_id, doc_number, title, page_number, source_type}]
) -> None:
    if not chunks:
        return

    texts = [c["text"] for c in chunks]
    embeddings = await embed_texts(texts, input_type="search_document")

    collection = await asyncio.to_thread(get_chroma)
    await asyncio.to_thread(
        collection.add,
        ids=[c["chroma_id"] for c in chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[
            {
                "document_id": c["document_id"],
                "doc_number": c.get("doc_number") or "",
                "title": c["title"],
                "page_number": c.get("page_number") or 0,
                "source_type": c["source_type"],
            }
            for c in chunks
        ],
    )


async def delete_document_from_vector_store(chroma_ids: list[str]) -> None:
    if not chroma_ids:
        return
    collection = await asyncio.to_thread(get_chroma)
    await asyncio.to_thread(collection.delete, ids=chroma_ids)


async def retrieve(query: str, top_k: int | None = None) -> list[dict[str, Any]]:
    """Semantic search — returns ranked chunks with metadata."""
    k = top_k or settings.top_k_retrieval
    query_embedding = await embed_texts([query], input_type="search_query")

    collection = await asyncio.to_thread(get_chroma)
    results = await asyncio.to_thread(
        collection.query,
        query_embeddings=query_embedding,
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for i, chroma_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        chunks.append(
            {
                "chroma_id": chroma_id,
                "text": results["documents"][0][i],
                "document_id": meta["document_id"],
                "doc_number": meta["doc_number"],
                "title": meta["title"],
                "page_number": meta["page_number"],
                "source_type": meta["source_type"],
                "score": 1 - results["distances"][0][i],  # cosine similarity
            }
        )
    return chunks


async def chat_with_rag(
    message: str,
    chat_history: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks from ChromaDB
    2. Send to Cohere with documents → get grounded answer + citations
    Returns: {answer, citations, retrieved_chunks}
    """
    chunks = await retrieve(message)
    if not chunks:
        return {
            "answer": "Maaf, saya tidak menemukan informasi yang relevan dalam dokumen yang tersedia.",
            "citations": [],
            "retrieved_chunks": [],
        }

    # Build documents for Cohere RAG format
    cohere_docs = [
        {
            "id": chunk["chroma_id"],
            "title": chunk["title"],
            "snippet": chunk["text"],
            "doc_number": chunk["doc_number"],
            "page": str(chunk["page_number"]) if chunk["page_number"] else "-",
            "source_type": chunk["source_type"],
        }
        for chunk in chunks
    ]

    # Build chat history for Cohere (role must be USER/CHATBOT)
    cohere_history = []
    for msg in (chat_history or []):
        cohere_history.append(
            cohere.ChatMessage(
                role="USER" if msg["role"] == "user" else "CHATBOT",
                message=msg["content"],
            )
        )

    co = get_cohere()
    response = await co.chat(
        model=settings.cohere_chat_model,
        message=message,
        documents=cohere_docs,
        chat_history=cohere_history if cohere_history else None,
        preamble=(
            "Anda adalah asisten akademik Telkom University yang membantu mahasiswa memahami peraturan dan kebijakan akademik. "
            "Jawab pertanyaan secara lengkap dan detail berdasarkan dokumen yang diberikan dalam Bahasa Indonesia. "
            "Sertakan SEMUA informasi relevan dari dokumen: angka, nilai, IPK, SKS, syarat, prosedur, dan kriteria. "
            "Gunakan format yang rapi: bullet points untuk daftar, tabel Markdown untuk data tabular, dan rumus jika perlu. "
            "Jangan menghilangkan informasi penting meskipun terasa teknis. "
            "Di akhir jawaban, sebutkan sumber dokumen dan halaman yang digunakan."
        ),
    )

    # Parse Cohere's native citations → map back to document metadata
    formatted_citations = []
    seen_doc_ids = set()
    for citation in (response.citations or []):
        for doc_id in citation.document_ids:
            if doc_id in seen_doc_ids:
                continue
            seen_doc_ids.add(doc_id)
            # Find matching chunk
            source = next((c for c in chunks if c["chroma_id"] == doc_id), None)
            if source:
                formatted_citations.append(
                    {
                        "doc_number": source["doc_number"] or "–",
                        "title": source["title"],
                        "page": source["page_number"],
                        "source_type": source["source_type"],
                        "cited_text": citation.text,
                    }
                )

    return {
        "answer": response.text,
        "citations": formatted_citations,
        "retrieved_chunks": chunks,
    }
