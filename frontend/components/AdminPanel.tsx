"use client";
import { useEffect, useState, useRef } from "react";
import { adminApi, Document } from "@/lib/api";
import { Upload, Globe, RefreshCw, Trash2, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import clsx from "clsx";

export default function AdminPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "upload-pdf" | "scrape">("documents");

  // Upload PDF form
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfDocNumber, setPdfDocNumber] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Scrape form
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeTitle, setScrapeTitle] = useState("");
  const [scrapeDocNumber, setScrapeDocNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDocuments = async () => {
    try {
      const { data } = await adminApi.listDocuments();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !pdfTitle) return;
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("title", pdfTitle);
    if (pdfDocNumber) formData.append("doc_number", pdfDocNumber);
    setSubmitting(true);
    try {
      await adminApi.uploadPdf(formData);
      setFeedback({ type: "success", message: "PDF berhasil diupload dan sedang diproses..." });
      setPdfTitle(""); setPdfDocNumber(""); setPdfFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(fetchDocuments, 2000);
    } catch {
      setFeedback({ type: "error", message: "Gagal mengupload PDF" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl || !scrapeTitle) return;
    setSubmitting(true);
    try {
      await adminApi.scrapeUrl(scrapeUrl, scrapeTitle, scrapeDocNumber || undefined);
      setFeedback({ type: "success", message: "Scraping dijadwalkan dan sedang berjalan..." });
      setScrapeUrl(""); setScrapeTitle(""); setScrapeDocNumber("");
      setTimeout(fetchDocuments, 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Gagal memulai scraping";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReindex = async (id: number) => {
    try {
      await adminApi.reindex(id);
      fetchDocuments();
    } catch { /* noop */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus dokumen ini beserta semua datanya?")) return;
    await adminApi.deleteDocument(id);
    fetchDocuments();
  };

  const statusIcon = (status: Document["status"]) => ({
    indexed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    pending: <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />,
  }[status]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-telkom-dark">Manajemen Dokumen</h1>

      {feedback && (
        <div className={clsx("mb-4 px-4 py-3 rounded-lg text-sm", feedback.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200")}>
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(["documents", "upload-pdf", "scrape"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", activeTab === tab ? "border-telkom-red text-telkom-red" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            {{ documents: "Daftar Dokumen", "upload-pdf": "Upload PDF", scrape: "Scrape Website" }[tab]}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {activeTab === "documents" && (
        <div className="flex flex-col gap-3">
          <button onClick={fetchDocuments} className="btn-secondary self-end flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : documents.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Belum ada dokumen. Upload PDF atau scrape website terlebih dahulu.</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(doc.status)}
                    <span className="font-semibold text-sm truncate">{doc.title}</span>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full", doc.source_type === "pdf" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                      {doc.source_type.toUpperCase()}
                    </span>
                  </div>
                  {doc.doc_number && <p className="text-xs text-gray-500 mb-1">{doc.doc_number}</p>}
                  <p className="text-xs text-gray-400">{doc.total_chunks} chunk · {new Date(doc.created_at).toLocaleDateString("id-ID")}</p>
                  {doc.status === "failed" && doc.error_message && (
                    <p className="text-xs text-red-500 mt-1">{doc.error_message}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleReindex(doc.id)} className="btn-secondary p-2" title="Re-index">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload PDF */}
      {activeTab === "upload-pdf" && (
        <form onSubmit={handleUploadPdf} className="card flex flex-col gap-4 max-w-lg">
          <h2 className="font-semibold">Upload Dokumen PDF</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Judul Dokumen *</label>
            <input value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} required className="input-field" placeholder="Pedoman Akademik 2024/2025" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nomor Dokumen</label>
            <input value={pdfDocNumber} onChange={(e) => setPdfDocNumber(e.target.value)} className="input-field" placeholder="No. 001/UN1/2024" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">File PDF *</label>
            <input ref={fileRef} type="file" accept=".pdf" required onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="input-field file:mr-2 file:border-0 file:bg-telkom-red file:text-white file:px-3 file:py-1 file:rounded" />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload & Proses
          </button>
        </form>
      )}

      {/* Scrape */}
      {activeTab === "scrape" && (
        <form onSubmit={handleScrape} className="card flex flex-col gap-4 max-w-lg">
          <h2 className="font-semibold">Scrape dari Website Telkom University</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">URL *</label>
            <input value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} required className="input-field" placeholder="https://telkomuniversity.ac.id/..." />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Judul Dokumen *</label>
            <input value={scrapeTitle} onChange={(e) => setScrapeTitle(e.target.value)} required className="input-field" placeholder="Informasi Akademik - Halaman Resmi" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nomor Dokumen</label>
            <input value={scrapeDocNumber} onChange={(e) => setScrapeDocNumber(e.target.value)} className="input-field" placeholder="(opsional)" />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Mulai Scraping
          </button>
          <p className="text-xs text-gray-400">Hanya domain telkomuniversity.ac.id yang diizinkan.</p>
        </form>
      )}
    </div>
  );
}
