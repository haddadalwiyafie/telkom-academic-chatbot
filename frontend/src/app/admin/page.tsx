'use client';

import { useState, useRef, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminHero } from './AdminHero';
import { ChatInput } from '../../components/ChatInput';
import { ChatMessages } from '../../components/ChatMessages';
import { SettingsPage } from '../../components/SettingsPage';
import { UploadPage } from '../../components/UploadPage';
import { HelpModal } from '../../components/HelpModal';
import { Message, ChatSession } from '../../types';
import { useApp } from '../../components/AppContext';
import { chatApi, Citation } from '../../services/api';

export default function AdminPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState('admin-dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMessages = chatSessions.find((s) => s.id === currentChatId)?.messages || [];

  useEffect(() => {
    if (scrollRef.current && currentMessages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, isLoading]);

  const handleSendMessage = async (text: string, _image?: string) => {
    if (!text.trim()) return;

    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };

    let activeSessionId = currentChatId;
    let sessionList = [...chatSessions];
    let sessionIndex = sessionList.findIndex((s) => s.id === activeSessionId);

    if (sessionIndex === -1) {
      activeSessionId = Date.now().toString();
      sessionList = [{ id: activeSessionId, title: text.substring(0, 40) + (text.length > 40 ? '...' : ''), timestamp: Date.now(), messages: [newMessage] }, ...sessionList];
      setCurrentChatId(activeSessionId);
      sessionIndex = 0;
    } else {
      sessionList[sessionIndex] = { ...sessionList[sessionIndex], messages: [...sessionList[sessionIndex].messages, newMessage] };
    }

    setChatSessions(sessionList);
    setIsLoading(true);

    try {
      const result = await chatApi.send(text.trim(), sessionId);
      setSessionId(result.session_id);

      const citationText = result.citations.length > 0
        ? '\n\n---\n**Sumber:**\n' + result.citations.map((c: Citation) =>
            `- **${c.title}**${c.doc_number ? ` (${c.doc_number})` : ''}${c.page ? `, Hal. ${c.page}` : ''}`
          ).join('\n')
        : '';

      const botMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: result.answer + citationText };
      setChatSessions((prev) =>
        prev.map((s) => s.id === activeSessionId ? { ...s, messages: [...s.messages, botMessage] } : s)
      );
    } catch (error) {
      const errText = error instanceof Error ? `Terjadi kesalahan: ${error.message}` : 'Terjadi kesalahan saat menghubungi server.';
      const errMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: errText };
      setChatSessions((prev) =>
        prev.map((s) => s.id === activeSessionId ? { ...s, messages: [...s.messages, errMessage] } : s)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex bg-bg-deep text-text-bright font-sans selection:bg-primary-teal/30 overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeTab={activeTab} setActiveTab={setActiveTab} onOpenHelp={() => setIsHelpOpen(true)} />
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onHelpClick={() => setIsHelpOpen(true)} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 md:p-10 relative scroll-smooth">
          {activeTab === 'admin-dashboard' ? (
            currentMessages.length === 0
              ? <div className="flex-1 flex flex-col items-center justify-center min-h-[min-content]"><AdminHero /></div>
              : <ChatMessages messages={currentMessages} isLoading={isLoading} />
          ) : activeTab === 'settings' ? (
            <SettingsPage onClearHistory={() => setChatSessions([])} />
          ) : activeTab === 'admin-upload' ? (
            <UploadPage />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-dim">Coming soon.</div>
          )}
        </div>
        {activeTab === 'admin-dashboard' && (
          <div className="flex-none p-4 md:p-8 shrink-0 bg-transparent flex justify-center w-full">
            <div className="w-full max-w-4xl">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={t('placeholder.help')} />
            </div>
          </div>
        )}
      </main>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
