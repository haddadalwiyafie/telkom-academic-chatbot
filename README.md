# Telkom Academic Chatbot

Chatbot akademik berbasis RAG (Retrieval-Augmented Generation) untuk civitas Telkom University. Memberikan jawaban dari dokumen PDF dan website resmi Telkom, disertai kutipan sumber yang presisi.

## Cara Kerja

```
Pertanyaan user
    ↓
Embed query (Cohere embed-multilingual-v3.0)
    ↓
Cari chunk relevan di ChromaDB (cosine similarity, top-6)
    ↓
Kirim ke Cohere Command R+ dengan dokumen sebagai konteks
    ↓
Jawaban + citations otomatis dari Cohere
    ↓
Tampilkan: "Berdasarkan [Judul Dokumen — No. 123/2024, Hal. 5]"
```

## Cara Menjalankan

### 1. Copy environment file
```bash
cp backend/.env.example backend/.env
# Edit backend/.env, isi:
# COHERE_API_KEY=<api key dari dashboard.cohere.com>
# SECRET_KEY=<random string panjang>
```

### 2. Jalankan dengan Docker
```bash
docker compose up --build
```

- Chatbot: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- API Docs: http://localhost:8000/docs

### 3. Login Admin
Email dan password default ada di `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Menambah Dokumen (Admin)

1. Login ke `/admin`
2. Tab **Upload PDF** → pilih file, isi judul dan nomor dokumen → Upload
3. Tab **Scrape Website** → masukkan URL dari `telkomuniversity.ac.id` → Mulai Scraping
4. Status berubah dari `pending` → `indexed` saat selesai diproses
5. Tombol **Re-index** untuk memperbarui dokumen yang sudah ada

## Struktur Proyek

```
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes (auth, chat, admin)
│   │   ├── core/         # config, database, JWT auth
│   │   ├── models/       # SQLAlchemy models
│   │   └── services/     # RAG pipeline, ingestion orchestrator
│   └── ingestion/        # PDF parser, web scraper
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # ChatInterface, AdminPanel, MessageBubble
│   └── lib/api.ts        # Axios client + TypeScript types
└── docker-compose.yml
```
