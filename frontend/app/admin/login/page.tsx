"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      if (data.role !== "admin") {
        setError("Akun ini tidak memiliki akses admin");
        return;
      }
      localStorage.setItem("access_token", data.access_token);
      router.push("/admin");
    } catch {
      setError("Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-telkom-gray">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-telkom-red rounded-xl mx-auto flex items-center justify-center mb-3">
            <span className="text-white font-bold">TU</span>
          </div>
          <h1 className="font-bold text-lg">Admin Login</h1>
          <p className="text-sm text-gray-500">Telkom Academic Chatbot</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="admin@telkomuniversity.ac.id" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          <a href="/" className="text-telkom-red hover:underline">Kembali ke Chatbot</a>
        </p>
      </div>
    </div>
  );
}
