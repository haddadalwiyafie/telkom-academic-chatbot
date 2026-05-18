"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { LogOut } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("access_token");
    router.push("/admin/login");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-telkom-dark text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="font-bold">Admin Panel</span>
          <span className="text-gray-400 text-sm">Telkom Academic Chatbot</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-gray-300 hover:text-white transition-colors">Chatbot</a>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>
      <main className="flex-1">
        <AdminPanel />
      </main>
    </div>
  );
}
