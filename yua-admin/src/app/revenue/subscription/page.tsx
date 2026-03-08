"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RevenueNav from "@/components/RevenueNav";

// --- Mock data types ---

interface SubscriptionInvoice {
  id: string;
  date: string;
  user_email: string;
  plan: string;
  amount: number;
  status: "paid" | "failed" | "refunded";
}

interface MrrPoint {
  month: string;
  mrr: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
  percentage: number;
}

interface SubscriptionRevenueData {
  mrr: number;
  mrrGrowth: number; // percentage change
  totalSubscribers: number;
  churnRate: number; // percentage
  arpu: number; // average revenue per user
  invoices: SubscriptionInvoice[];
  mrrTrend: MrrPoint[];
  planDistribution: PlanDistribution[];
}

// TODO: Replace with actual API call — adminFetch<SubscriptionRevenueData>("/admin/stats/revenue/subscription")
function useMockSubscriptionRevenue(): { data: SubscriptionRevenueData | null; loading: boolean; error: string } {
  const [data, setData] = useState<SubscriptionRevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        mrr: 3_850_000,
        mrrGrowth: 12.4,
        totalSubscribers: 342,
        churnRate: 3.2,
        arpu: 11_257,
        invoices: [
          { id: "inv1", date: "2026-03-08", user_email: "team@bigcorp.com", plan: "business", amount: 99000, status: "paid" },
          { id: "inv2", date: "2026-03-07", user_email: "dev@startup.io", plan: "developer_pro", amount: 29000, status: "paid" },
          { id: "inv3", date: "2026-03-07", user_email: "user@example.com", plan: "premium", amount: 9900, status: "failed" },
          { id: "inv4", date: "2026-03-06", user_email: "ml@research.kr", plan: "developer", amount: 19000, status: "paid" },
          { id: "inv5", date: "2026-03-06", user_email: "cancel@user.com", plan: "premium", amount: 9900, status: "refunded" },
          { id: "inv6", date: "2026-03-05", user_email: "enterprise@corp.com", plan: "enterprise", amount: 299000, status: "paid" },
          { id: "inv7", date: "2026-03-05", user_email: "solo@dev.com", plan: "developer", amount: 19000, status: "paid" },
          { id: "inv8", date: "2026-03-04", user_email: "team2@agency.com", plan: "business", amount: 99000, status: "paid" },
        ],
        mrrTrend: [
          { month: "2025-10", mrr: 2_100_000 },
          { month: "2025-11", mrr: 2_450_000 },
          { month: "2025-12", mrr: 2_800_000 },
          { month: "2026-01", mrr: 3_200_000 },
          { month: "2026-02", mrr: 3_420_000 },
          { month: "2026-03", mrr: 3_850_000 },
        ],
        planDistribution: [
          { plan: "free", count: 1240, percentage: 64.2 },
          { plan: "premium", count: 180, percentage: 9.3 },
          { plan: "developer", count: 95, percentage: 4.9 },
          { plan: "developer_pro", count: 42, percentage: 2.2 },
          { plan: "business", count: 20, percentage: 1.0 },
          { plan: "enterprise", count: 5, percentage: 0.3 },
        ],
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { data, loading, error: "" };
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  developer: "Developer",
  developer_pro: "Developer Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  free: "var(--badge-gray-text)",
  premium: "var(--badge-amber-text)",
  developer: "var(--badge-blue-text)",
  developer_pro: "var(--badge-purple-text)",
  business: "var(--badge-green-text)",
  enterprise: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = { paid: "완료", failed: "실패", refunded: "환불" };
const STATUS_BADGES: Record<string, string> = { paid: "badge-green", failed: "badge-red", refunded: "badge-amber" };

export default function SubscriptionRevenuePage() {
  const { data, loading } = useMockSubscriptionRevenue();

  // MRR chart
  const mrrPoints = data?.mrrTrend ?? [];
  const maxMrr = Math.max(...mrrPoints.map((p) => p.mrr), 1);

  // Plan distribution total (excluding free for paid pie)
  const allPlans = data?.planDistribution ?? [];
  const totalUsers = allPlans.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <div className="fade-in">
      <PageHeader
        title="구독 매출 상세"
        subtitle="MRR, 구독 인보이스 및 플랜별 분석"
      />

      <RevenueNav />

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

      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <StatCard
              label="MRR"
              value={formatAmount(data.mrr)}
              change={`${data.mrrGrowth > 0 ? "+" : ""}${data.mrrGrowth}%`}
              trend={data.mrrGrowth > 0 ? "up" : data.mrrGrowth < 0 ? "down" : "flat"}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                  <polyline points="17,6 23,6 23,12" />
                </svg>
              }
            />
            <StatCard
              label="총 구독자"
              value={data.totalSubscribers}
              pulse
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              label="이탈률 (Churn)"
              value={`${data.churnRate}%`}
              change={data.churnRate <= 5 ? "양호" : "주의"}
              trend={data.churnRate <= 5 ? "down" : "up"}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />
            <StatCard
              label="ARPU"
              value={formatAmount(data.arpu)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
          </div>

          {/* MRR Trend + Plan Distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 24 }}>
            {/* MRR Trend Chart */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                MRR 추이
              </h3>
              {mrrPoints.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 6,
                      height: 180,
                      padding: "0 0 8px 0",
                    }}
                  >
                    {mrrPoints.map((p, i) => {
                      const pct = (p.mrr / maxMrr) * 100;
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
                          title={`${p.month}: ${p.mrr.toLocaleString()}`}
                        >
                          <span className="data-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            {formatAmount(p.mrr)}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              maxWidth: 48,
                              minHeight: 4,
                              height: `${Math.max(pct, 4)}%`,
                              background: "linear-gradient(180deg, var(--accent), var(--accent-hover))",
                              borderRadius: "3px 3px 0 0",
                              transition: "height 0.3s ease",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {mrrPoints.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 10,
                          color: "var(--text-muted)",
                        }}
                      >
                        {new Date(p.month + "-01").toLocaleDateString("ko-KR", { month: "short" })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Plan Distribution */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                플랜별 분포
              </h3>
              {allPlans.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Stacked bar */}
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--surface-panel)" }}>
                    {allPlans.map((p) => (
                      <div
                        key={p.plan}
                        style={{
                          width: `${(p.count / totalUsers) * 100}%`,
                          background: PLAN_COLORS[p.plan] ?? "var(--accent)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    ))}
                  </div>
                  {/* Legend */}
                  {allPlans.map((p) => (
                    <div key={p.plan} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: PLAN_COLORS[p.plan] ?? "var(--accent)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                          {PLAN_LABELS[p.plan] ?? p.plan}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {p.count}
                        </span>
                        <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          ({p.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subscription Invoices Table */}
          <div className="admin-card" style={{ marginTop: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                구독 인보이스
              </h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>유저</th>
                  <th>플랜</th>
                  <th>금액</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                      인보이스가 없습니다
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {inv.date}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                          {inv.user_email}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: PLAN_COLORS[inv.plan] ?? "var(--text-primary)",
                          }}
                        >
                          {PLAN_LABELS[inv.plan] ?? inv.plan}
                        </span>
                      </td>
                      <td>
                        <span className="data-mono" style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                          {inv.amount.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGES[inv.status] ?? "badge-gray"}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Churn Detail */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>월간 이탈률</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: data.churnRate <= 5 ? "var(--status-online)" : "var(--status-error)" }}>
                {data.churnRate}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {data.churnRate <= 3 ? "우수" : data.churnRate <= 5 ? "양호" : "개선 필요"}
              </div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>MRR 전월 대비</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: data.mrrGrowth > 0 ? "var(--status-online)" : "var(--status-error)" }}>
                {data.mrrGrowth > 0 ? "+" : ""}{data.mrrGrowth}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {data.mrrGrowth > 10 ? "고성장" : data.mrrGrowth > 0 ? "안정 성장" : "역성장"}
              </div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>ARPU (유저당 매출)</div>
              <div className="data-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {data.arpu.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                유료 구독자 기준
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
