"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  ArrowDown,
} from "lucide-react";

type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

type Citation = {
  block_id: string;
  block_type: string;
  content_preview: string;
  score: number;
  block_order: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type Props = {
  docId: string;
  authFetch: AuthFetchFn;
  onCitationClick?: (citation: Citation) => void;
  onInsertBelow?: (content: string) => void;
};

export default function DocChatPanel({
  docId,
  authFetch,
  onCitationClick,
  onInsertBelow,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevDocIdRef = useRef(docId);

  const newSessionId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Init session id on mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = newSessionId();
    }
  }, []);

  // Reset session when doc changes
  useEffect(() => {
    if (prevDocIdRef.current === docId) return;
    prevDocIdRef.current = docId;
    sessionIdRef.current = newSessionId();
    setMessages([]);
    setInput("");
  }, [docId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch(`/api/workspace/docs/${docId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: text,
          topK: 8,
        }),
      });

      if (!res.ok) throw new Error("CHAT_FAILED");
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "CHAT_FAILED");

      // Clean citation markers from display text
      const cleanReply = data.reply.replace(/\[block:[a-f0-9-]+\]/g, "").trim();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: cleanReply,
        citations: data.citations ?? [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "응답을 생성하지 못했습니다. 다시 시도해 주세요.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, authFetch, docId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Collapsed FAB
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6 z-50
          max-md:bottom-4 max-md:right-4
          flex items-center gap-2
          rounded-full bg-violet-600 hover:bg-violet-700
          px-4 py-3 text-sm font-medium text-white
          shadow-lg shadow-violet-500/20
          transition active:scale-95
        "
      >
        <Sparkles size={16} />
        <span className="max-md:hidden">Ask AI</span>
      </button>
    );
  }

  return (
    <div
      className="
        fixed bottom-0 right-0 z-50
        max-md:inset-0 max-md:bg-white max-md:dark:bg-[#1b1b1b]
        md:bottom-4 md:right-4 md:w-[420px] md:max-h-[60vh]
        flex flex-col
        rounded-t-2xl md:rounded-2xl
        border border-[var(--line)]
        bg-white dark:bg-[#1b1b1b]
        shadow-2xl
        overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            YUA 문서 AI
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
        >
          <X size={16} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={24} className="mx-auto text-violet-400 mb-2" />
            <div className="text-sm text-[var(--text-muted)]">
              이 문서에 대해 질문하세요
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              문서 내용 기반으로 답변합니다
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 dark:bg-white/5 text-[var(--text-primary)]"
                }
              `}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.citations.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onCitationClick?.(c)}
                      className="flex items-center gap-1 rounded-md bg-white/10 dark:bg-white/5 border border-[var(--line)] px-2 py-1 text-[10px] font-medium hover:bg-white/20 transition"
                      title={c.content_preview}
                    >
                      <FileText size={10} />
                      {c.block_type}
                      <span className="opacity-60">
                        ({(c.score * 100).toFixed(0)}%)
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Insert button */}
              {msg.role === "assistant" && msg.content && onInsertBelow && (
                <div className="mt-2 pt-2 border-t border-[var(--line)]/30">
                  <button
                    onClick={() => onInsertBelow(msg.content)}
                    className="flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition"
                  >
                    <ArrowDown size={10} />
                    문서에 삽입
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-gray-100 dark:bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-muted)]">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] px-3 py-2.5 max-md:pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문서에 대해 질문하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none max-h-[100px] overflow-y-auto"
            style={{ minHeight: "36px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
