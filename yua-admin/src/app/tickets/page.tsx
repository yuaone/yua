"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import type { SupportTicket, TicketMessage } from "yua-shared";

const STATUS_OPTIONS = ["", "open", "in_progress", "waiting_user", "resolved", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "전체",
  open: "열림",
  in_progress: "진행 중",
  waiting_user: "유저 대기",
  resolved: "해결됨",
  closed: "닫힘",
};
const STATUS_ICONS: Record<string, string> = {
  open: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  in_progress: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  resolved: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  closed: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};
const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  waiting_user: "#a855f7",
  resolved: "#10b981",
  closed: "#6b7280",
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "긴급" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "높음" },
  medium: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "보통" },
  low: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "낮음" },
};

const CATEGORY_COLORS: Record<string, string> = {
  bug: "#ef4444",
  feature: "#8b5cf6",
  billing: "#f59e0b",
  account: "#10b981",
  general: "#6b7280",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  // Detail panel
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSources, setAiSources] = useState<Array<{ id: number; question: string; similarity: number }>>([]);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // Messages thread (TicketMessage from yua-shared)
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // Classification
  const [classifying, setClassifying] = useState(false);

  const fetchTickets = useCallback(async (p: number, status: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (status) params.set("status", status);

    const res = await adminFetch<{ tickets: SupportTicket[]; total: number }>(
      `/admin/tickets?${params}`
    );
    if (res.ok && res.data) {
      setTickets(res.data.tickets);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "티켓을 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets(page, statusFilter);
  }, [page, statusFilter, fetchTickets]);

  const fetchMessages = async (ticketId: number) => {
    setMsgsLoading(true);
    const res = await adminFetch<{ messages: TicketMessage[] }>(
      `/admin/tickets/${ticketId}/messages`
    );
    if (res.ok && res.data) {
      setMessages(res.data.messages);
    } else {
      setMessages([]);
    }
    setMsgsLoading(false);
  };

  const selectTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setReplyContent("");
    setAiSources([]);
    fetchMessages(ticket.id);
  };

  const handleReply = async () => {
    if (!selected || !replyContent.trim()) return;
    setReplying(true);
    const res = await adminFetch(`/admin/tickets/${selected.id}/reply`, {
      method: "POST",
      body: JSON.stringify({ content: replyContent }),
    });
    if (res.ok) {
      setReplyContent("");
      setAiSources([]);
      fetchMessages(selected.id);
    } else {
      alert(res.error ?? "답변 전송 실패");
    }
    setReplying(false);
  };

  const handleAiDraft = async () => {
    if (!selected) return;
    setAiDrafting(true);
    const res = await adminFetch<{ draft: string; sources: Array<{ id: number; question: string; similarity: number }> }>(
      `/admin/tickets/${selected.id}/ai-draft`,
      { method: "POST" }
    );
    if (res.ok && res.data) {
      setReplyContent(res.data.draft);
      setAiSources(res.data.sources ?? []);
      // Refresh messages to show the saved AI draft
      fetchMessages(selected.id);
    }
    setAiDrafting(false);
    replyRef.current?.focus();
  };

  const handleClassify = async () => {
    if (!selected) return;
    setClassifying(true);
    const res = await adminFetch<{ category: string; priority: string; confidence: number }>(
      `/admin/tickets/${selected.id}/classify`,
      { method: "POST" }
    );
    if (res.ok && res.data) {
      // Apply classification (both category and priority)
      await adminFetch(`/admin/tickets/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ category: res.data.category, priority: res.data.priority }),
      });
      fetchTickets(page, statusFilter);
      setSelected({
        ...selected,
        priority: res.data.priority as SupportTicket["priority"],
        category: res.data.category as SupportTicket["category"],
      });
    }
    setClassifying(false);
  };

  const handleApproveDraft = async (messageId: number) => {
    const res = await adminFetch(`/admin/tickets/${selected!.id}/approve-draft`, {
      method: "POST",
      body: JSON.stringify({ messageId }),
    });
    if (res.ok) {
      fetchMessages(selected!.id);
    } else {
      alert(res.error ?? "승인 실패");
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    const res = await adminFetch(`/admin/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchTickets(page, statusFilter);
      if (selected && selected.id === ticketId) {
        setSelected({ ...selected, status: newStatus as SupportTicket["status"] });
      }
    } else {
      alert(res.error ?? "상태 변경 실패");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Count by status
  const statusCounts = tickets.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  return (
    <>
      <PageHeader
        title="지원 티켓"
        actions={
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            총 {total.toLocaleString()}건
          </div>
        }
      />

      {/* Status Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: "var(--surface-panel)" }}
      >
        {STATUS_OPTIONS.map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: active ? "var(--surface-main)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {s && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[s] }}
                />
              )}
              {STATUS_LABELS[s]}
              {s && statusCounts[s] ? (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: active ? `${STATUS_COLORS[s]}20` : "var(--line)",
                    color: active ? STATUS_COLORS[s] : "var(--text-muted)",
                  }}
                >
                  {statusCounts[s]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* Ticket List */}
        <div className={`${selected ? "flex-1 min-w-0" : "w-full"} flex flex-col`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="yua-admin-spinner" />
            </div>
          ) : tickets.length === 0 ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              <span className="text-sm">해당하는 티켓이 없습니다</span>
            </div>
          ) : (
            <>
              <div className="space-y-2 flex-1">
                {tickets.map((ticket) => {
                  const pri = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low;
                  const catColor = CATEGORY_COLORS[ticket.category] ?? "#6b7280";
                  const isSelected = selected?.id === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className="group rounded-xl border px-4 py-3.5 cursor-pointer transition-all duration-150"
                      style={{
                        borderColor: isSelected ? "var(--text-muted)" : "var(--line)",
                        background: isSelected ? "var(--surface-panel)" : "var(--surface-main)",
                        borderLeftWidth: "3px",
                        borderLeftColor: pri.color,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Top row: ID + Subject */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                              style={{
                                color: "var(--text-muted)",
                                background: "var(--surface-panel)",
                              }}
                            >
                              #{ticket.id}
                            </span>
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {ticket.subject}
                            </span>
                          </div>

                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority */}
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ color: pri.color, background: pri.bg }}
                            >
                              {ticket.priority === "urgent" && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                                </svg>
                              )}
                              {pri.label}
                            </span>

                            {/* Category */}
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                color: catColor,
                                background: `${catColor}15`,
                              }}
                            >
                              {ticket.category}
                            </span>

                            {/* Status */}
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium"
                              style={{ color: STATUS_COLORS[ticket.status] ?? "#6b7280" }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: STATUS_COLORS[ticket.status] ?? "#6b7280",
                                }}
                              />
                              {STATUS_LABELS[ticket.status] ?? ticket.status}
                            </span>
                          </div>
                        </div>

                        {/* Right side: time + avatar */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            {getTimeAgo(ticket.created_at)}
                          </span>
                          {ticket.assigned_admin_id ? (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: "var(--btn-primary)" }}
                              title={`담당: ${ticket.assigned_admin_id}`}
                            >
                              {String(ticket.assigned_admin_id).charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center border border-dashed"
                              style={{ borderColor: "var(--text-muted)" }}
                              title="미배정"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--text-muted)">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                              </svg>
                            </div>
                          )}
                        </div>
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
                    {total.toLocaleString()}건 중 {(page - 1) * limit + 1}-
                    {Math.min(page * limit, total)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30 transition-colors"
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
                          className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
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
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30 transition-colors"
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

        {/* Ticket Detail Panel */}
        {selected && (
          <div
            className="w-[440px] shrink-0 rounded-xl border overflow-hidden flex flex-col yua-admin-slide-in"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface-panel)",
              maxHeight: "calc(100vh - 140px)",
            }}
          >
            {/* Detail Header */}
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "var(--line)", color: "var(--text-muted)" }}
                    >
                      #{selected.id}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: PRIORITY_CONFIG[selected.priority]?.color ?? "#6b7280",
                        background: PRIORITY_CONFIG[selected.priority]?.bg ?? "rgba(107,114,128,0.12)",
                      }}
                    >
                      {PRIORITY_CONFIG[selected.priority]?.label ?? selected.priority}
                    </span>
                  </div>
                  <h3
                    className="text-base font-semibold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selected.subject}
                  </h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--line)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              {/* Meta info grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                    카테고리
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full inline-block"
                    style={{
                      color: CATEGORY_COLORS[selected.category] ?? "#6b7280",
                      background: `${CATEGORY_COLORS[selected.category] ?? "#6b7280"}15`,
                    }}
                  >
                    {selected.category}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                    유저
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    #{selected.user_id}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                    생성
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {getTimeAgo(selected.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status changer */}
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                상태 변경
              </div>
              <div className="flex gap-1">
                {(["open", "in_progress", "waiting_user", "resolved", "closed"] as const).map((s) => {
                  const active = selected.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                      style={{
                        background: active ? `${STATUS_COLORS[s]}20` : "transparent",
                        color: active ? STATUS_COLORS[s] : "var(--text-muted)",
                        border: `1px solid ${active ? STATUS_COLORS[s] + "40" : "var(--line)"}`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: STATUS_COLORS[s] }}
                      />
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Classify button */}
            <div className="px-5 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
              <button
                onClick={handleClassify}
                disabled={classifying}
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {classifying ? "분류 중..." : "AI 자동 분류"}
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="yua-admin-spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  메시지가 없습니다
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender_type === "user";
                  const isAi = msg.sender_type === "ai";
                  const isAdmin = msg.sender_type === "admin";

                  return (
                    <div
                      key={msg.id}
                      className="rounded-lg px-3.5 py-3 text-sm"
                      style={{
                        background: isAi
                          ? "rgba(139,92,246,0.08)"
                          : isAdmin
                          ? "rgba(59,130,246,0.08)"
                          : "var(--surface-main)",
                        border: isAi ? "1px solid rgba(139,92,246,0.2)" : "1px solid var(--line)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            color: isAi ? "#8b5cf6" : isAdmin ? "#3b82f6" : "#10b981",
                            background: isAi ? "rgba(139,92,246,0.15)" : isAdmin ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                          }}
                        >
                          {isAi ? "AI" : isAdmin ? "관리자" : "유저"}
                        </span>
                        {msg.is_ai_draft && !msg.approved_by && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)" }}>
                            초안
                          </span>
                        )}
                        {msg.is_ai_draft && msg.approved_by && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: "#10b981", background: "rgba(16,185,129,0.12)" }}>
                            승인됨
                          </span>
                        )}
                        <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                          {getTimeAgo(msg.created_at)}
                        </span>
                      </div>
                      <div className="leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                        {msg.content}
                      </div>
                      {msg.is_ai_draft && !msg.approved_by && (
                        <button
                          onClick={() => handleApproveDraft(msg.id)}
                          className="mt-2 flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                          style={{ color: "#10b981", background: "rgba(16,185,129,0.1)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                          초안 승인
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {/* AI Sources */}
              {aiSources.length > 0 && (
                <div className="rounded-lg px-3 py-2.5 border" style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
                  <div className="text-[10px] font-semibold mb-1.5" style={{ color: "#8b5cf6" }}>
                    참고된 지식 베이스
                  </div>
                  {aiSources.map((s) => (
                    <div key={s.id} className="text-[11px] py-0.5" style={{ color: "var(--text-secondary)" }}>
                      - {s.question} ({Math.round(s.similarity * 100)}% 일치)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div className="p-4 border-t" style={{ borderColor: "var(--line)", background: "var(--surface-main)" }}>
              {/* AI Draft button */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  답변 작성
                </span>
                <button
                  onClick={handleAiDraft}
                  disabled={aiDrafting}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
                  style={{
                    color: "#8b5cf6",
                    background: "rgba(139,92,246,0.1)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  {aiDrafting ? "생성 중..." : "AI 초안"}
                </button>
              </div>
              <textarea
                ref={replyRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none transition-colors"
                rows={4}
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-panel)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleReply}
                disabled={replying || !replyContent.trim()}
                className="mt-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-40"
                style={{ background: "var(--btn-primary)" }}
              >
                {replying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="yua-admin-spinner-sm" />
                    전송 중...
                  </span>
                ) : (
                  "답변 전송"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
