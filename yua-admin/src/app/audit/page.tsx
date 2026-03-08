"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import type { AdminAuditLog } from "yua-shared";

const ACTION_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  create: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    icon: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  },
  update: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  },
  delete: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    icon: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  },
  login: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    icon: "M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z",
  },
};

const getActionConfig = (action: string) => {
  for (const [key, config] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return config;
  }
  return {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.12)",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  };
};

const ACTION_TYPES = ["", "create", "update", "delete", "login"] as const;
const ACTION_LABELS: Record<string, string> = {
  "": "전체",
  create: "생성",
  update: "수정",
  delete: "삭제",
  login: "로그인",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const limit = 30;

  const fetchLogs = useCallback(async (p: number, action: string, admin: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (action) params.set("action", action);
    if (admin) params.set("admin", admin);

    const res = await adminFetch<{ logs: AdminAuditLog[]; total: number }>(
      `/admin/audit?${params}`
    );
    if (res.ok && res.data) {
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "감사 로그를 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(page, actionFilter, adminFilter);
  }, [page, actionFilter, adminFilter, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return `오늘 ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    if (isYesterday) return `어제 ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group logs by date
  const groupedLogs = logs.reduce(
    (acc, log) => {
      const dateKey = new Date(log.created_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(log);
      return acc;
    },
    {} as Record<string, AdminAuditLog[]>
  );

  return (
    <>
      <PageHeader
        title="감사 로그"
        actions={
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {total.toLocaleString()}건 기록
          </span>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Action type filter pills */}
        <div
          className="flex gap-0.5 p-1 rounded-xl"
          style={{ background: "var(--surface-panel)" }}
        >
          {ACTION_TYPES.map((type) => {
            const active = actionFilter === type;
            const config = type ? getActionConfig(type) : null;
            return (
              <button
                key={type}
                onClick={() => { setActionFilter(type); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                style={{
                  background: active ? "var(--surface-main)" : "transparent",
                  color: active ? (config?.color ?? "var(--text-primary)") : "var(--text-muted)",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {config && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: config.color }}
                  />
                )}
                {ACTION_LABELS[type]}
              </button>
            );
          })}
        </div>

        {/* Admin search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          style={{ borderColor: "var(--line)", background: "var(--surface-panel)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <input
            type="text"
            placeholder="관리자 필터..."
            value={adminFilter}
            onChange={(e) => { setAdminFilter(e.target.value); setPage(1); }}
            className="text-[11px] bg-transparent outline-none w-28"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="yua-admin-spinner" />
        </div>
      ) : logs.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <span className="text-sm">로그가 없습니다</span>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div
            className="absolute left-[23px] top-0 bottom-0 w-px"
            style={{ background: "var(--line)" }}
          />

          {Object.entries(groupedLogs).map(([dateKey, dateLogs]) => (
            <div key={dateKey} className="mb-6">
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div
                  className="w-[47px] flex justify-center"
                >
                  <span
                    className="w-3 h-3 rounded-full border-2"
                    style={{
                      borderColor: "var(--text-muted)",
                      background: "var(--surface-main)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{
                    color: "var(--text-muted)",
                    background: "var(--surface-panel)",
                  }}
                >
                  {dateKey}
                </span>
              </div>

              {/* Logs for this date */}
              <div className="space-y-1">
                {dateLogs.map((log) => {
                  const config = getActionConfig(log.action);
                  const isExpanded = expandedId === log.id;

                  return (
                    <div key={log.id} className="relative flex gap-3 group">
                      {/* Timeline dot */}
                      <div className="w-[47px] flex justify-center pt-3 shrink-0 relative z-10">
                        <div
                          className="w-[9px] h-[9px] rounded-full transition-transform duration-150 group-hover:scale-125"
                          style={{ background: config.color }}
                        />
                      </div>

                      {/* Content card */}
                      <div
                        className="flex-1 rounded-xl px-4 py-3 mb-1 cursor-pointer transition-all duration-150"
                        style={{
                          background: isExpanded ? "var(--surface-panel)" : "transparent",
                          border: isExpanded ? "1px solid var(--line)" : "1px solid transparent",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {/* Admin avatar */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                              style={{
                                background: `hsl(${(log.admin_email?.charCodeAt(0) ?? 0) * 37 % 360}, 50%, 45%)`,
                              }}
                            >
                              {(log.admin_name || log.admin_email || "?").charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              {/* Action description */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {log.admin_name || log.admin_email}
                                </span>
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ color: config.color, background: config.bg }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <path d={config.icon} />
                                  </svg>
                                  {log.action}
                                </span>
                              </div>

                              {/* Target */}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                  {log.target_type}
                                </span>
                                <span className="text-[10px]" style={{ color: "var(--line)" }}>|</span>
                                <span
                                  className="text-xs font-mono"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {log.target_id}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Time + IP */}
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {formatTime(log.created_at)}
                            </span>
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                              {log.ip_address}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                                  관리자 ID
                                </span>
                                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                                  {log.admin_id}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                                  이메일
                                </span>
                                <span style={{ color: "var(--text-secondary)" }}>
                                  {log.admin_email}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                                  대상 타입
                                </span>
                                <span style={{ color: "var(--text-secondary)" }}>
                                  {log.target_type}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                                  대상 ID
                                </span>
                                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
                                  {log.target_id}
                                </span>
                              </div>
                            </div>
                            {log.details && (
                              <div className="mt-3">
                                <span className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                                  상세 데이터
                                </span>
                                <pre
                                  className="text-[11px] font-mono p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                  style={{
                                    background: "var(--surface-main)",
                                    color: "var(--text-secondary)",
                                    border: "1px solid var(--line)",
                                  }}
                                >
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between mt-6 pt-4 border-t text-sm ml-[59px]"
              style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
            >
              <span className="text-xs">
                {total.toLocaleString()}건 중 페이지 {page}/{totalPages}
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
        </div>
      )}
    </>
  );
}
