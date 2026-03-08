"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";

interface Thread {
  id: number;
  user_id: number;
  workspace_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  role: string;
  content: string;
  model: string;
  token_count: number;
  created_at: string;
}

const MODEL_COLORS: Record<string, string> = {
  "gpt-4": "#10b981",
  "gpt-4o": "#8b5cf6",
  "gpt-3.5-turbo": "#3b82f6",
  "claude-3": "#f59e0b",
  default: "#6b7280",
};

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const limit = 20;

  // Message panel state
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const fetchThreads = useCallback(async (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (q) params.set("search", q);

    const res = await adminFetch<{ threads: Thread[]; total: number }>(
      `/admin/threads?${params}`
    );
    if (res.ok && res.data) {
      setThreads(res.data.threads);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "스레드를 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchThreads(page, search);
  }, [page, search, fetchThreads]);

  const openThread = async (thread: Thread) => {
    setSelectedThread(thread);
    setMsgLoading(true);
    const res = await adminFetch<{ messages: Message[] }>(
      `/admin/threads/${thread.id}/messages?limit=100`
    );
    if (res.ok && res.data) {
      setMessages(res.data.messages);
    }
    setMsgLoading(false);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const getModelColor = (model: string) => {
    for (const [key, color] of Object.entries(MODEL_COLORS)) {
      if (model?.includes(key)) return color;
    }
    return MODEL_COLORS.default;
  };

  return (
    <>
      <PageHeader
        title="스레드 브라우저"
        actions={
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            총 {total.toLocaleString()}개
          </div>
        }
      />

      {/* Search Bar */}
      <div className="mb-5 flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-colors"
          style={{
            borderColor: "var(--line)",
            background: "var(--surface-panel)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="스레드 제목 또는 내용으로 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="p-0.5 rounded hover:bg-[var(--line)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ background: "#3b82f6" }}
        >
          검색
        </button>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-5" style={{ minHeight: "calc(100vh - 260px)" }}>
        {/* Thread List */}
        <div className={`${selectedThread ? "flex-1 min-w-0" : "w-full"} flex flex-col`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="yua-admin-spinner" />
            </div>
          ) : threads.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
              </svg>
              <span className="text-sm">
                {search ? `"${search}" 검색 결과가 없습니다` : "스레드가 없습니다"}
              </span>
            </div>
          ) : (
            <>
              <div className="space-y-1 flex-1">
                {threads.map((thread) => {
                  const isSelected = selectedThread?.id === thread.id;
                  const modelColor = getModelColor(thread.model);

                  return (
                    <div
                      key={thread.id}
                      onClick={() => openThread(thread)}
                      className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        background: isSelected ? "var(--surface-panel)" : "transparent",
                        borderLeft: isSelected ? `3px solid ${modelColor}` : "3px solid transparent",
                      }}
                    >
                      {/* User avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{
                          background: `hsl(${(thread.user_id * 137) % 360}, 50%, 45%)`,
                        }}
                      >
                        U{thread.user_id}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {thread.title || "(제목 없음)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{
                              color: modelColor,
                              background: `${modelColor}15`,
                            }}
                          >
                            {thread.model || "unknown"}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            User #{thread.user_id}
                          </span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {getTimeAgo(thread.updated_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between mt-4 pt-4 border-t text-sm"
                  style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
                >
                  <span className="text-xs">
                    페이지 {page} / {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: "var(--line)" }}
                    >
                      이전
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className="w-8 h-8 rounded-lg text-xs font-medium"
                          style={{
                            background: p === page ? "var(--text-primary)" : "transparent",
                            color: p === page ? "var(--surface-main)" : "var(--text-muted)",
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: "var(--line)" }}
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message Side Panel */}
        {selectedThread && (
          <div
            className="w-[480px] shrink-0 rounded-xl border overflow-hidden flex flex-col yua-admin-slide-in"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface-panel)",
              maxHeight: "calc(100vh - 140px)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="min-w-0 flex-1">
                <h3
                  className="text-sm font-semibold truncate mb-0.5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedThread.title || "(제목 없음)"}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Thread #{selectedThread.id}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>|</span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    User #{selectedThread.user_id}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: getModelColor(selectedThread.model),
                      background: `${getModelColor(selectedThread.model)}15`,
                    }}
                  >
                    {selectedThread.model}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedThread(null)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--line)]"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="yua-admin-spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 gap-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity={0.4}>
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
                  </svg>
                  <span className="text-sm">메시지 없음</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-3"
                        style={{
                          background: isUser ? "var(--surface-main)" : "rgba(59,130,246,0.1)",
                          border: isUser ? "1px solid var(--line)" : "none",
                          borderRadius: isUser
                            ? "4px 18px 18px 18px"
                            : "18px 4px 18px 18px",
                        }}
                      >
                        {/* Role + time */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              color: isUser ? "#3b82f6" : "#10b981",
                            }}
                          >
                            {isUser ? "사용자" : "어시스턴트"}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {new Date(msg.created_at).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {!isUser && msg.model && (
                            <span
                              className="text-[9px] font-mono px-1 py-0.5 rounded"
                              style={{
                                color: getModelColor(msg.model),
                                background: `${getModelColor(msg.model)}10`,
                              }}
                            >
                              {msg.model}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {msg.content?.slice(0, 800)}
                          {(msg.content?.length ?? 0) > 800 && (
                            <span style={{ color: "var(--text-muted)" }}> ...({msg.content.length.toLocaleString()}자)</span>
                          )}
                        </div>
                        {msg.token_count > 0 && (
                          <div className="mt-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {msg.token_count.toLocaleString()} tokens
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message count footer */}
            {messages.length > 0 && (
              <div
                className="px-4 py-2.5 border-t text-center"
                style={{ borderColor: "var(--line)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  총 {messages.length}개 메시지 | {messages.filter((m) => m.role === "user").length}개 사용자 | {messages.filter((m) => m.role !== "user").length}개 어시스턴트
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
