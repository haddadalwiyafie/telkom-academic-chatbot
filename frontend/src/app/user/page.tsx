'use client';

import { useState, useRef, useEffect } from 'react';
import { UserSidebar } from './UserSidebar';
import { UserHeader } from './UserHeader';
import { UserHero } from './UserHero';
import { ChatInput } from '../../components/ChatInput';
import { ChatMessages } from '../../components/ChatMessages';
import { HistoryPage } from '../../components/HistoryPage';
import { SettingsPage } from '../../components/SettingsPage';
import { HelpModal } from '../../components/HelpModal';
import { Message, ChatSession } from '../../types';
import { useApp } from '../../components/AppContext';
import { chatApi } from '../../services/api';
import { formatCitations } from '../../utils/formatCitations';

export default function UserPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState('new-chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem('chat_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem('chat_sessions', JSON.stringify(chatSessions)); } catch {}
  }, [chatSessions]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'new-chat') setCurrentChatId(null);
  };

  const handleSelectSession = (id: string) => {
    setCurrentChatId(id);
    setActiveTab('new-chat');
  };

  const handleDeleteSession = (id: string) => {
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentChatId === id) setCurrentChatId(null);
  };

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
      const newSession: ChatSession = {
        id: activeSessionId,
        title: text.substring(0, 40) + (text.length > 40 ? '...' : ''),
        timestamp: Date.now(),
        messages: [newMessage],
      };
      sessionList = [newSession, ...sessionList];
      setCurrentChatId(activeSessionId);
      sessionIndex = 0;
    } else {
      sessionList[sessionIndex] = {
        ...sessionList[sessionIndex],
        messages: [...sessionList[sessionIndex].messages, newMessage],
      };
    }

    setChatSessions(sessionList);
    setIsLoading(true);

    try {
      const result = await chatApi.send(text.trim(), sessionId);
      setSessionId(result.session_id);

      const citationText = formatCitations(result.citations);

      const botMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: result.answer + citationText };
      setChatSessions((prev) =>
        prev.map((s) => s.id === activeSessionId ? { ...s, messages: [...s.messages, botMessage] } : s)
      );
    } catch (error) {
      const errorText = error instanceof Error ? `Terjadi kesalahan: ${error.message}` : 'Terjadi kesalahan saat menghubungi server.';
      const errMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: errorText };
      setChatSessions((prev) =>
        prev.map((s) => s.id === activeSessionId ? { ...s, messages: [...s.messages, errMessage] } : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex bg-bg-deep text-text-bright font-sans selection:bg-primary-teal/30 overflow-hidden">
      <UserSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeTab={activeTab} setActiveTab={handleTabChange} onOpenHelp={() => setIsHelpOpen(true)} />
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <UserHeader onMenuClick={toggleSidebar} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 md:p-10 relative scroll-smooth">
          {activeTab === 'new-chat' ? (
            currentMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center pb-10 min-h-min"><UserHero /></div>
            ) : (
              <ChatMessages messages={currentMessages} isLoading={isLoading} />
            )
          ) : activeTab === 'history' ? (
            <HistoryPage chatSessions={chatSessions} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onClearHistory={() => { setChatSessions([]); setCurrentChatId(null); }} />
          ) : activeTab === 'settings' ? (
            <SettingsPage onClearHistory={() => setChatSessions([])} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-dim">Coming soon.</div>
          )}
        </div>
        {activeTab === 'new-chat' && (
          <div className="flex-none p-4 md:p-8 shrink-0 bg-transparent flex justify-center w-full">
            <div className="w-full max-w-4xl">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={t('placeholder.type')} />
            </div>
          </div>
        )}
      </main>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
