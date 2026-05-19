const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getToken = () => localStorage.getItem('auth_token');

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${BASE_URL}/api${path}`, { ...options, headers });
};

export interface Citation {
  doc_number: string;
  title: string;
  page: number | null;
  source_type: string;
  cited_text: string;
}

export interface ChatResult {
  session_id: number;
  answer: string;
  citations: Citation[];
}

export interface Document {
  id: number;
  title: string;
  doc_number: string | null;
  source_type: 'pdf' | 'web';
  source_url: string | null;
  status: 'pending' | 'indexed' | 'failed';
  total_chunks: number;
  error_message: string | null;
  created_at: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login gagal');
    }
    return res.json() as Promise<{ access_token: string; role: string; token_type: string }>;
  },

  register: async (email: string, password: string) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registrasi gagal');
    }
    return res.json() as Promise<{ access_token: string; role: string }>;
  },
};

export const chatApi = {
  send: async (message: string, sessionId?: number): Promise<ChatResult> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
        const res = await apiFetch('/chat', {
          method: 'POST',
          body: JSON.stringify({ message, session_id: sessionId }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  },
};

export const adminApi = {
  listDocuments: async (): Promise<Document[]> => {
    const res = await apiFetch('/admin/documents');
    if (!res.ok) throw new Error('Gagal memuat dokumen');
    return res.json();
  },

  uploadPdf: async (file: File, title: string, docNumber?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (docNumber) formData.append('doc_number', docNumber);
    const res = await apiFetch('/admin/documents/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal upload PDF');
    }
    return res.json();
  },

  scrapeUrl: async (url: string, title: string, docNumber?: string): Promise<Document> => {
    const res = await apiFetch('/admin/documents/scrape', {
      method: 'POST',
      body: JSON.stringify({ url, title, doc_number: docNumber }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal scrape URL');
    }
    return res.json();
  },

  reindex: async (id: number): Promise<Document> => {
    const res = await apiFetch(`/admin/documents/${id}/reindex`, { method: 'POST' });
    if (!res.ok) throw new Error('Gagal reindex');
    return res.json();
  },

  deleteDocument: async (id: number): Promise<void> => {
    const res = await apiFetch(`/admin/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal hapus dokumen');
  },
};
