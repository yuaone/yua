"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";

/* ---------- Types ---------- */

interface SupportStats {
  totalTickets: number;
  autoResolved: number;
  manualResolved: number;
  escalated: number;
  avgResponseTimeSec: number;
  aiAccuracy: number; // 0-1
  categoryBreakdown: Record<string, number>;
}

interface RecentTicket {
  id: number;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
}

/* ---------- Config ---------- */

const CATEGORY_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  billing:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "결제" },
  technical: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "기술" },
  account:   { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "계정" },
  general:   { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "일반" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "열림",
  in_progress: "진행 중",
  waiting_user: "유저 대기",
  resolved: "해결됨",
  closed: "닫힘",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  waiting_user: "#a855f7",
  resolved: "#10b981",
  closed: "#6b7280",
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  urgent: { color: "#ef4444", label: "긴급" },
  high:   { color: "#f97316", label: "높음" },
  medium: { color: "#3b82f6", label: "보통" },
  low:    { color: "#6b7280", label: "낮음" },
};

/* ---------- Component ---------- */

export default function SupportDashboardPage() {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real API calls
    // const statsRes = await adminFetch<SupportStats>("/admin/support/stats");
    // const ticketsRes = await adminFetch<{tickets: RecentTicket[]}>("/admin/tickets?limit=5&sort=created_at:desc");

    const mockStats: SupportStats = {
      totalTickets: 1248,
      autoResolved: 743,
      manualResolved: 389,
      escalated: 116,
      avgResponseTimeSec: 127,
      aiAccuracy: 0.874,
      categoryBreakdown: {
        billing: 412,
        technical: 356,
        account: 298,
        general: 182,
      },
    };

    const mockTickets: RecentTicket[] = [
      { id: 1024, subject: "결제 오류 발생", category: "billing", status: "open", priority: "high", created_at: new Date(Date.now() - 1200_000).toISOString() },
      { id: 1023, subject: "비밀번호 재설정 불가", category: "account", status: "in_progress", priority: "medium", created_at: new Date(Date.now() - 3600_000).toISOString() },
      { id: 1022, subject: "API 응답 지연", category: "technical", status: "open", priority: "urgent", created_at: new Date(Date.now() - 7200_000).toISOString() },
      { id: 1021, subject: "요금제 변경 문의", category: "billing", status: "resolved", priority: "low", created_at: new Date(Date.now() - 14400_000).toISOString() },
      { id: 1020, subject: "서비스 이용 방법 문의", category: "general", status: "closed", priority: "low", created_at: new Date(Date.now() - 28800_000).toISOString() },
    ];

    setTimeout(() => {
      setStats(mockStats);
      setRecentTickets(mockTickets);
      setLoading(false);
    }, 300);
  }, []);

  const formatResponseTime = (sec: number) => {
    if (sec < 60) return `${sec}초`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  };

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

  // Category chart data
  const categories = stats ? Object.entries(stats.categoryBreakdown) : [];
  const totalCatCount = categories.reduce((s, [, c]) => s + c, 0) || 1;

  return (
    <>
      <PageHeader
        title="Support AI 대시보드"
        subtitle="AI 지원 시스템 현황"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/support/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              설정
            </Link>
            <Link
              href="/tickets"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: "var(--btn-primary)" }}
            >
              전체 티켓 보기
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <div className="yua-admin-spinner" />
        </div>
      ) : stats ? (
        <div className="fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="총 티켓"
              value={stats.totalTickets}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
                </svg>
              }
            />
            <StatCard
              label="자동 해결"
              value={stats.autoResolved}
              change={`${Math.round((stats.autoResolved / stats.totalTickets) * 100)}%`}
              trend="up"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              }
            />
            <StatCard
              label="수동 해결"
              value={stats.manualResolved}
              change={`${Math.round((stats.manualResolved / stats.totalTickets) * 100)}%`}
              trend="flat"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="에스컬레이션"
              value={stats.escalated}
              change={`${Math.round((stats.escalated / stats.totalTickets) * 100)}%`}
              trend="down"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />
            <StatCard
              label="평균 응답 시간"
              value={formatResponseTime(stats.avgResponseTimeSec)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              }
            />
            <StatCard
              label="AI 정확도"
              value={`${Math.round(stats.aiAccuracy * 100)}%`}
              trend="up"
              change="지난주 대비 +2.1%"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              }
            />
          </div>

          {/* Category Breakdown + Recent Tickets */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category Breakdown */}
            <div
              className="admin-card"
              style={{ padding: "20px" }}
            >
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                카테고리별 분포
              </h3>

              {/* Bar chart */}
              <div className="space-y-3">
                {categories.map(([cat, count]) => {
                  const cfg = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.general;
                  const pct = Math.round((count / totalCatCount) * 100);

                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: cfg.color }}
                          />
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {count.toLocaleString()}건 ({pct}%)
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--line)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: cfg.color,
                            minWidth: 4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend totals */}
              <div
                className="mt-4 pt-3 border-t text-xs"
                style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
              >
                총 {totalCatCount.toLocaleString()}건
              </div>
            </div>

            {/* Recent Tickets */}
            <div
              className="admin-card"
              style={{ padding: "20px" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  최근 티켓
                </h3>
                <Link
                  href="/tickets"
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: "var(--btn-primary)" }}
                >
                  전체 보기
                </Link>
              </div>

              <div className="space-y-2">
                {recentTickets.map((ticket) => {
                  const catCfg = CATEGORY_COLORS[ticket.category] ?? CATEGORY_COLORS.general;
                  const priCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low;

                  return (
                    <Link
                      key={ticket.id}
                      href="/tickets"
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 hover:border-[var(--text-muted)]"
                      style={{
                        borderColor: "var(--line)",
                        background: "var(--surface-main)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ color: "var(--text-muted)", background: "var(--surface-panel)" }}
                          >
                            #{ticket.id}
                          </span>
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {ticket.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ color: catCfg.color, background: catCfg.bg }}
                          >
                            {catCfg.label}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium"
                            style={{ color: STATUS_COLORS[ticket.status] ?? "#6b7280" }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: STATUS_COLORS[ticket.status] ?? "#6b7280" }}
                            />
                            {STATUS_LABELS[ticket.status] ?? ticket.status}
                          </span>
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: priCfg.color }}
                          >
                            {priCfg.label}
                          </span>
                        </div>
                      </div>
                      <span
                        className="text-[10px] shrink-0 mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {getTimeAgo(ticket.created_at)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          통계를 불러올 수 없습니다
        </div>
      )}
    </>
  );
}
