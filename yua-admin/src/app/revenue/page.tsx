"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RevenueNav from "@/components/RevenueNav";

interface RevenueStats {
  subscriptions: Array<{ plan_id: string; status: string; count: string }>;
  credits: { total_purchased: number; total_used: number; total_balance: number };
  recentTransactions: Array<{ type: string; count: string; total_amount: number }>;
}

interface DailyRevenue {
  daily: Array<{ date: string; revenue: string; tx_count: string }>;
  days: number;
}

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [daily, setDaily] = useState<DailyRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetch<RevenueStats>("/admin/stats/revenue"),
      adminFetch<DailyRevenue>(`/admin/stats/revenue/daily?days=${days}`),
    ]).then(([statsRes, dailyRes]) => {
      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      else setError(statsRes.error ?? "매출 통계를 불러올 수 없습니다");

      if (dailyRes.ok && dailyRes.data) setDaily(dailyRes.data);
      setLoading(false);
    });
  }, [days]);

  // Compute summary values
  const totalRevenue = stats?.recentTransactions
    ?.filter((t) => t.type === "purchase")
    .reduce((sum, t) => sum + Number(t.total_amount || 0), 0) ?? 0;
  const totalTx = stats?.recentTransactions
    ?.reduce((sum, t) => sum + Number(t.count || 0), 0) ?? 0;
  const activeSubscriptions = stats?.subscriptions
    ?.filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.count || 0), 0) ?? 0;
  const avgTx = totalTx > 0 ? Math.round(totalRevenue / totalTx) : 0;

  // Chart data
  const dailyRows = daily?.daily ?? [];
  const maxRevenue = Math.max(...dailyRows.map((d) => Number(d.revenue || 0)), 1);

  // Plan subscription breakdown
  const planMap = new Map<string, number>();
  stats?.subscriptions?.forEach((s) => {
    const existing = planMap.get(s.plan_id) || 0;
    planMap.set(s.plan_id, existing + Number(s.count || 0));
  });
  const planEntries = Array.from(planMap.entries()).sort((a, b) => b[1] - a[1]);
  const totalSubs = planEntries.reduce((s, [, c]) => s + c, 0) || 1;

  const PLAN_COLORS: Record<string, string> = {
    free: "var(--badge-gray-text)",
    premium: "var(--badge-amber-text)",
    developer: "var(--badge-blue-text)",
    developer_pro: "var(--badge-purple-text)",
    business: "var(--badge-green-text)",
    enterprise: "#ef4444",
  };

  function formatAmount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="매출 대시보드"
        subtitle="매출 현황 및 구독 분석"
        actions={
          <select
            className="admin-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>최근 7일</option>
            <option value={14}>최근 14일</option>
            <option value={30}>최근 30일</option>
            <option value={60}>최근 60일</option>
            <option value={90}>최근 90일</option>
          </select>
        }
      />

      <RevenueNav />

      {error && (
        <div
          className="admin-card"
          style={{
            padding: "12px 16px",
            marginBottom: 16,
            borderColor: "var(--status-error)",
            color: "var(--badge-red-text)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="status-dot error" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "30%" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <StatCard
              label="총 매출 (30일)"
              value={formatAmount(totalRevenue)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              label="총 거래 수"
              value={totalTx}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              }
            />
            <StatCard
              label="활성 구독"
              value={activeSubscriptions}
              pulse
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              }
            />
            <StatCard
              label="평균 거래 금액"
              value={formatAmount(avgTx)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              }
            />
          </div>

          {/* Daily Revenue Chart + Subscription Distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 24 }}>
            {/* Daily Revenue Bar Chart */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                일별 매출
              </h3>
              {dailyRows.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* Chart area */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 2,
                      height: 180,
                      padding: "0 0 8px 0",
                    }}
                  >
                    {dailyRows.map((d, i) => {
                      const rev = Number(d.revenue || 0);
                      const pct = (rev / maxRevenue) * 100;
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                          title={`${d.date}: ${Number(d.revenue).toLocaleString()} (${d.tx_count}건)`}
                        >
                          <div
                            style={{
                              width: "100%",
                              maxWidth: 24,
                              minHeight: 2,
                              height: `${Math.max(pct, 2)}%`,
                              background: rev > 0
                                ? "linear-gradient(180deg, var(--accent), var(--accent-hover))"
                                : "var(--surface-active)",
                              borderRadius: "3px 3px 0 0",
                              transition: "height 0.3s ease",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis labels (show every 5th) */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {dailyRows.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 9,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {i % Math.ceil(dailyRows.length / 7) === 0
                          ? new Date(d.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
                          : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Distribution */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                플랜별 구독 분포
              </h3>
              {planEntries.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Stacked bar */}
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--surface-panel)" }}>
                    {planEntries.map(([plan, count]) => (
                      <div
                        key={plan}
                        style={{
                          width: `${(count / totalSubs) * 100}%`,
                          background: PLAN_COLORS[plan] ?? "var(--accent)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  {/* Legend */}
                  {planEntries.map(([plan, count]) => (
                    <div key={plan} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: PLAN_COLORS[plan] ?? "var(--accent)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                          {plan}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {count}
                        </span>
                        <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          ({Math.round((count / totalSubs) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions by Type */}
          <div className="admin-card" style={{ marginTop: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                최근 거래 유형 (30일)
              </h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>건수</th>
                  <th>총 금액</th>
                  <th>비율</th>
                </tr>
              </thead>
              <tbody>
                {(!stats.recentTransactions || stats.recentTransactions.length === 0) ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                      거래 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  stats.recentTransactions.map((tx, i) => {
                    const txPct = totalTx > 0 ? Math.round((Number(tx.count) / totalTx) * 100) : 0;
                    const typeLabels: Record<string, string> = {
                      purchase: "구매",
                      usage: "사용",
                      refund: "환불",
                      bonus: "보너스",
                    };
                    const typeBadge: Record<string, string> = {
                      purchase: "badge-green",
                      usage: "badge-blue",
                      refund: "badge-red",
                      bonus: "badge-amber",
                    };
                    return (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${typeBadge[tx.type] ?? "badge-gray"}`}>
                            {typeLabels[tx.type] ?? tx.type}
                          </span>
                        </td>
                        <td>
                          <span className="data-mono" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                            {Number(tx.count).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="data-mono" style={{ fontSize: 13, color: "var(--text-primary)" }}>
                            {Number(tx.total_amount).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, maxWidth: 100, height: 4, borderRadius: 2, background: "var(--surface-panel)", overflow: "hidden" }}>
                              <div style={{ width: `${txPct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                            </div>
                            <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 32 }}>
                              {txPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Credit Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>총 구매 크레딧</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {Number(stats.credits.total_purchased).toLocaleString()}
              </div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>총 사용 크레딧</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {Number(stats.credits.total_used).toLocaleString()}
              </div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>잔여 크레딧</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                {Number(stats.credits.total_balance).toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
