# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: FastAPI (Python 3.11) + SQLAlchemy 2.0 + PostgreSQL
- **LLM + Embeddings**: Cohere (`command-r-plus-08-2024` for chat, `embed-multilingual-v3.0` for embeddings)
- **Vector DB**: ChromaDB (persistent, local)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS

## Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in COHERE_API_KEY and SECRET_KEY

uvicorn app.main:app --reload       # dev server at :8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # dev server at :3000
npm run build && npm start
npm run lint
```

### Docker (full stack)
```bash
docker compose up --build
```

## Architecture

### RAG Pipeline (`backend/app/services/rag.py`)
1. Query → Cohere embed (`search_query`) → ChromaDB cosine search (top-6)
2. Retrieved chunks + chat history → `co.chat(documents=[...])` on Command R+
3. Cohere natively returns `response.citations` (list of `{start, end, text, document_ids}`)
4. Citations are mapped back to document metadata (title, doc_number, page) for display

### Document Ingestion (`backend/app/services/ingestion.py`)
- **PDF**: PyMuPDF extracts text per page → word-based chunking (400 words, 50 overlap)
- **Web**: httpx + BeautifulSoup scrapes Telkom University domains → same chunking
- Each chunk gets a unique `chroma_id` stored in both ChromaDB and `document_chunks` table
- Re-indexing deletes old ChromaDB entries and `document_chunks` rows, then re-processes

### Domain Safety (`backend/ingestion/scraper.py`)
Scraper only allows `telkomuniversity.ac.id` and its subdomains — validated in `_validate_domain()`.

### Auth (`backend/app/core/auth.py`)
JWT Bearer tokens. Two roles: `admin` / `user`. Admin seeded on startup from `.env`.
`require_admin` dependency used on all `/api/admin/*` routes.

### Database Models (`backend/app/models/models.py`)
- `Document` → `DocumentChunk` (1:many, cascade delete)
- `ChatSession` → `ChatMessage` (1:many, cascade delete)
- `ChatMessage.citations` is a JSON column storing the formatted citation list

### Frontend Data Flow
- `lib/api.ts` — all axios calls, single source of truth for types
- Admin auth: JWT stored in `localStorage`, injected via axios interceptor
- Chat: stateless on frontend (session_id passed per request, history stored server-side)
