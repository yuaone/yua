import { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, X } from 'lucide-react';
import { desktop, isDesktop } from '@/lib/desktop-bridge';

export default function MiniMode() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    // TODO: Wire up actual chat API
    // Placeholder response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: '(Mini mode response placeholder)' }]);
      setLoading(false);
    }, 500);
  }, [input, loading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#1b1b1b] text-[var(--text-primary)]">
      {/* Mini title bar */}
      <div
        className="flex items-center justify-between h-10 px-3 border-b border-gray-200 dark:border-[var(--line)] shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs font-semibold text-[var(--text-secondary)]">YUA Mini</span>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => {
              // Switch to full mode — send IPC to open main window and close mini
              if (isDesktop) desktop!.toggleMiniMode?.();
            }}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/10 transition"
            title="전체 모드로 전환"
          >
            <Maximize2 size={13} className="text-[var(--text-muted)]" />
          </button>
          <button
            onClick={() => { if (isDesktop) desktop!.close(); }}
            className="rounded p-1 hover:bg-red-500/10 transition"
            title="닫기"
          >
            <X size={13} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3">
              <span className="text-white text-sm font-bold">Y</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">빠른 질문을 해보세요</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-white/5 text-[var(--text-primary)]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2 bg-gray-100 dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 dark:border-[var(--line)] px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            rows={1}
            className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm outline-none resize-none max-h-24 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-blue-500 px-3 py-2 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
