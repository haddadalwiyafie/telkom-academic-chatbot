import axios from "axios";

// Call Railway backend directly from browser (bypasses Vercel proxy restriction)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Citation {
  doc_number: string;
  title: string;
  page: number | null;
  source_type: string;
  cited_text: string;
}

export interface ChatResponse {
  session_id: number;
  answer: string;
  citations: Citation[];
}

export interface Document {
  id: number;
  title: string;
  doc_number: string | null;
  source_type: "pdf" | "web";
  source_url: string | null;
  status: "pending" | "indexed" | "failed";
  total_chunks: number;
  error_message: string | null;
  created_at: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; role: string; token_type: string }>("/auth/login", { email, password }),
  register: (email: string, password: string) =>
    api.post<{ access_token: string; role: string }>("/auth/register", { email, password }),
};

export const chatApi = {
  send: (message: string, session_id?: number) =>
    api.post<ChatResponse>("/chat", { message, session_id }),
  history: (session_id: number) =>
    api.get<{ role: string; content: string; citations: Citation[] | null; created_at: string }[]>(
      `/chat/sessions/${session_id}/history`
    ),
};

export const adminApi = {
  listDocuments: () => api.get<Document[]>("/admin/documents"),
  getDocument: (id: number) => api.get<Document>(`/admin/documents/${id}`),
  uploadPdf: (formData: FormData) =>
    api.post<Document>("/admin/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  scrapeUrl: (url: string, title: string, doc_number?: string) =>
    api.post<Document>("/admin/documents/scrape", { url, title, doc_number }),
  reindex: (id: number) => api.post<Document>(`/admin/documents/${id}/reindex`),
  deleteDocument: (id: number) => api.delete(`/admin/documents/${id}`),
};

export default api;
