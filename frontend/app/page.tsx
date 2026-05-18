import ChatInterface from "@/components/ChatInterface";

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-telkom-red text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-telkom-red font-bold text-sm">TU</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Asisten Akademik</p>
            <p className="text-xs text-red-200">Telkom University</p>
          </div>
        </div>
        <a href="/admin" className="text-xs text-red-200 hover:text-white transition-colors">
          Admin
        </a>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
