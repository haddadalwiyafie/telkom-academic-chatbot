import { Search, Clock, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatSession } from '../types';
import { useState } from 'react';

interface HistoryPageProps {
  chatSessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearHistory?: () => void;
}

export function HistoryPage({ chatSessions, onSelectSession, onDeleteSession, onClearHistory }: HistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filtered = chatSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const now = new Date();
  const isToday = (ts: number) => {
    const d = new Date(ts);
    return d.toDateString() === now.toDateString();
  };
  const isYesterday = (ts: number) => {
    const d = new Date(ts);
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return d.toDateString() === y.toDateString();
  };

  const groups: { label: string; items: ChatSession[] }[] = [];
  const today = filtered.filter((s) => isToday(s.timestamp));
  const yesterday = filtered.filter((s) => isYesterday(s.timestamp));
  const older = filtered.filter((s) => !isToday(s.timestamp) && !isYesterday(s.timestamp));
  if (today.length) groups.push({ label: 'Hari ini', items: today });
  if (yesterday.length) groups.push({ label: 'Kemarin', items: yesterday });
  if (older.length) groups.push({ label: 'Lebih lama', items: older });

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5 pb-10 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-text-bright">Riwayat Percakapan</h2>
          <p className="text-text-dim text-sm mt-1">{chatSessions.length} percakapan tersimpan</p>
        </div>
        {chatSessions.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hapus semua
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          placeholder="Cari percakapan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-dark border border-text-dim/20 rounded-xl py-2.5 pl-9 pr-4 text-text-bright placeholder-text-dim/50 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-colors text-sm"
        />
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-text-dim">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada riwayat percakapan'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-primary-teal uppercase tracking-wider mb-2 px-1">
                {group.label}
              </p>
              <div className="bg-surface-dark border border-text-dim/20 rounded-2xl overflow-hidden">
                {group.items.map((item, i) => (
                  <div key={item.id}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-primary-teal/5 transition-colors group"
                    >
                      <button
                        onClick={() => onSelectSession(item.id)}
                        className="flex-1 flex items-center gap-3 min-w-0 text-left"
                      >
                        <MessageSquare className="w-4 h-4 text-text-dim shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-bright text-sm font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-text-dim">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>{item.messages.length} pesan</span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(item.id); }}
                        className="p-1.5 rounded-lg text-text-dim/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Hapus percakapan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                    {i < group.items.length - 1 && <div className="border-t border-text-dim/10" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm clear all dialog */}
      <AnimatePresence>
        {showConfirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-dark border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-bright mb-1">Hapus semua riwayat?</h3>
                <p className="text-text-dim text-sm mb-5">Semua percakapan akan dihapus permanen.</p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-text-dim/20 text-text-bright hover:bg-white/5 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => { onClearHistory?.(); setShowConfirmClear(false); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    Hapus semua
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
