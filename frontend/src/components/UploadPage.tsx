import React, { useState, useEffect } from 'react';
import { adminApi, Document } from '../services/api';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [activeSection, setActiveSection] = useState<'list' | 'upload' | 'scrape'>('list');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeTitle, setScrapeTitle] = useState('');

  const fetchDocs = async () => {
    try {
      const docs = await adminApi.listDocuments();
      setDocuments(docs);
    } catch {}
    setLoadingDocs(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) { setMessage({ type: 'error', text: 'File dan judul wajib diisi.' }); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      await adminApi.uploadPdf(file, title, docNumber || undefined);
      setMessage({ type: 'success', text: 'PDF berhasil diupload dan sedang diproses.' });
      setFile(null); setTitle(''); setDocNumber('');
      const inp = document.getElementById('file-upload') as HTMLInputElement;
      if (inp) inp.value = '';
      fetchDocs();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal upload PDF.' });
    } finally { setIsSubmitting(false); }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl || !scrapeTitle) { setMessage({ type: 'error', text: 'URL dan judul wajib diisi.' }); return; }
    setIsSubmitting(true); setMessage(null);
    try {
      await adminApi.scrapeUrl(scrapeUrl, scrapeTitle);
      setMessage({ type: 'success', text: 'URL berhasil ditambahkan dan sedang diproses.' });
      setScrapeUrl(''); setScrapeTitle('');
      fetchDocs();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal scrape URL.' });
    } finally { setIsSubmitting(false); }
  };

  const handleReindex = async (id: number) => {
    try {
      await adminApi.reindex(id);
      setMessage({ type: 'success', text: 'Reindex dimulai.' });
      setTimeout(fetchDocs, 2000);
    } catch { setMessage({ type: 'error', text: 'Gagal reindex.' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      await adminApi.deleteDocument(id);
      fetchDocs();
    } catch { setMessage({ type: 'error', text: 'Gagal hapus dokumen.' }); }
  };

  const statusColor = (s: string) =>
    s === 'indexed' ? 'text-primary-teal' : s === 'failed' ? 'text-red-400' : 'text-yellow-400';

  const inputClass = "w-full bg-bg-deep border border-text-dim/20 rounded-xl px-4 py-3 text-text-bright placeholder-text-dim/50 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-colors";

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-text-bright mb-6">Manajemen Dokumen</h1>

      {message && (
        <div className={`mb-5 p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-primary-teal/10 text-primary-teal border border-primary-teal/30'}`}>
          {message.text}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-bg-deep border border-text-dim/20 rounded-xl p-1 w-fit">
        {(['list', 'upload', 'scrape'] as const).map((s) => (
          <button key={s} onClick={() => { setActiveSection(s); setMessage(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSection === s ? 'bg-primary-teal text-bg-deep shadow-sm' : 'text-text-dim hover:text-text-bright'}`}>
            {s === 'list' ? 'Daftar Dokumen' : s === 'upload' ? 'Upload PDF' : 'Scrape Website'}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-surface-dark border border-text-dim/20 rounded-2xl p-6">

        {activeSection === 'list' && (
          <div>
            {loadingDocs ? (
              <p className="text-text-dim text-sm">Memuat dokumen...</p>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 text-text-dim">
                <p className="text-4xl mb-3">📂</p>
                <p className="font-medium">Belum ada dokumen</p>
                <p className="text-sm mt-1">Upload PDF atau scrape website untuk mulai mengindeks dokumen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc, i) => (
                  <div key={doc.id}>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-bright truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {doc.doc_number && <span className="text-xs text-text-dim">{doc.doc_number}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            doc.status === 'indexed' ? 'bg-primary-teal/15 text-primary-teal' :
                            doc.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          }`}>{doc.status}</span>
                          {doc.total_chunks > 0 && <span className="text-xs text-text-dim">{doc.total_chunks} chunks</span>}
                        </div>
                        {doc.error_message && <p className="text-xs text-red-400 mt-1">{doc.error_message}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleReindex(doc.id)}
                          className="px-3 py-1.5 text-xs border border-text-dim/30 hover:border-primary-teal text-text-dim hover:text-primary-teal rounded-lg transition">
                          Reindex
                        </button>
                        <button onClick={() => handleDelete(doc.id)}
                          className="px-3 py-1.5 text-xs border border-red-500/30 hover:border-red-400 text-red-400 hover:text-red-300 rounded-lg transition">
                          Hapus
                        </button>
                      </div>
                    </div>
                    {i < documents.length - 1 && <div className="border-t border-text-dim/10" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'upload' && (
          <form className="space-y-5" onSubmit={handleUpload}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-bright">File PDF <span className="text-red-400">*</span></label>
              <input type="file" id="file-upload" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-text-dim file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-teal/10 file:text-primary-teal hover:file:bg-primary-teal/20 bg-bg-deep border border-text-dim/20 rounded-xl cursor-pointer p-2 transition" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-bright">Judul Dokumen <span className="text-red-400">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Pedoman Akademik 2024" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-bright">Nomor Dokumen <span className="text-text-dim font-normal">(opsional)</span></label>
              <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className={inputClass} placeholder="PU.028/AKD03/2024" />
            </div>
            <div className="pt-2 border-t border-text-dim/10">
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-primary-teal hover:bg-primary-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-bg-deep font-semibold py-3 rounded-xl transition">
                {isSubmitting ? 'Mengupload...' : 'Upload & Proses'}
              </button>
            </div>
          </form>
        )}

        {activeSection === 'scrape' && (
          <form className="space-y-5" onSubmit={handleScrape}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-bright">URL Website <span className="text-red-400">*</span></label>
              <input type="url" value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} className={inputClass} placeholder="https://student.telkomuniversity.ac.id/..." />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-bright">Judul <span className="text-red-400">*</span></label>
              <input type="text" value={scrapeTitle} onChange={(e) => setScrapeTitle(e.target.value)} className={inputClass} placeholder="Informasi Akademik" />
            </div>
            <div className="pt-2 border-t border-text-dim/10">
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-primary-teal hover:bg-primary-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-bg-deep font-semibold py-3 rounded-xl transition">
                {isSubmitting ? 'Memproses...' : 'Scrape & Proses'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
