"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import RevenueNav from "@/components/RevenueNav";

// --- Mock data types ---

interface CreditTransaction {
  id: string;
  date: string;
  user_email: string;
  amount: number;
  type: "topup" | "deduct" | "refund";
  balance_after: number;
  model?: string;
}

interface ModelUsage {
  model: string;
  calls: number;
  credits_used: number;
  revenue_share: number; // percentage
}

interface TopApiUser {
  user_email: string;
  total_spend: number;
  call_count: number;
}

interface ApiRevenueData {
  totalApiRevenue: number;
  totalTransactions: number;
  avgCreditPerCall: number;
  activeApiUsers: number;
  transactions: CreditTransaction[];
  dailyRevenue: Array<{ date: string; revenue: number; tx_count: number }>;
  modelUsage: ModelUsage[];
  topUsers: TopApiUser[];
}

// TODO: Replace with actual API call — adminFetch<ApiRevenueData>("/admin/stats/revenue/api")
function useMockApiRevenue(days: number): { data: ApiRevenueData | null; loading: boolean; error: string } {
  const [data, setData] = useState<ApiRevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        totalApiRevenue: 2_450_000,
        totalTransactions: 1_247,
        avgCreditPerCall: 1_964,
        activeApiUsers: 89,
        transactions: [
          { id: "tx1", date: "2026-03-08 14:32", user_email: "dev@company.com", amount: 50000, type: "topup", balance_after: 120000 },
          { id: "tx2", date: "2026-03-08 13:15", user_email: "ai-team@startup.io", amount: -320, type: "deduct", balance_after: 45680 },
          { id: "tx3", date: "2026-03-08 12:40", user_email: "research@lab.kr", amount: -1500, type: "deduct", balance_after: 8500 },
          { id: "tx4", date: "2026-03-08 11:20", user_email: "support@corp.com", amount: 10000, type: "refund", balance_after: 35000 },
          { id: "tx5", date: "2026-03-07 22:10", user_email: "dev@company.com", amount: -800, type: "deduct", balance_after: 70000 },
          { id: "tx6", date: "2026-03-07 18:45", user_email: "ml@bigcorp.com", amount: 100000, type: "topup", balance_after: 250000 },
          { id: "tx7", date: "2026-03-07 15:30", user_email: "ai-team@startup.io", amount: -2100, type: "deduct", balance_after: 46000 },
          { id: "tx8", date: "2026-03-07 10:05", user_email: "test@example.com", amount: -150, type: "deduct", balance_after: 9850 },
        ],
        dailyRevenue: Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          return {
            date: d.toISOString().split("T")[0],
            revenue: Math.floor(Math.random() * 120000) + 30000,
            tx_count: Math.floor(Math.random() * 60) + 10,
          };
        }),
        modelUsage: [
          { model: "gpt-4o", calls: 5420, credits_used: 1_084_000, revenue_share: 44.2 },
          { model: "gpt-4o-mini", calls: 12300, credits_used: 615_000, revenue_share: 25.1 },
          { model: "claude-3.5-sonnet", calls: 3210, credits_used: 481_500, revenue_share: 19.7 },
          { model: "gemini-1.5-pro", calls: 1800, credits_used: 270_000, revenue_share: 11.0 },
        ],
        topUsers: [
          { user_email: "ml@bigcorp.com", total_spend: 450_000, call_count: 2340 },
          { user_email: "dev@company.com", total_spend: 320_000, call_count: 1890 },
          { user_email: "ai-team@startup.io", total_spend: 280_000, call_count: 1560 },
          { user_email: "research@lab.kr", total_spend: 195_000, call_count: 980 },
          { user_email: "support@corp.com", total_spend: 140_000, call_count: 720 },
        ],
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [days]);

  return { data, loading, error: "" };
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const TYPE_LABELS: Record<string, string> = { topup: "충전", deduct: "차감", refund: "환불" };
const TYPE_BADGES: Record<string, string> = { topup: "badge-green", deduct: "badge-blue", refund: "badge-red" };

export default function ApiRevenuePage() {
  const [days, setDays] = useState(30);
  const { data, loading } = useMockApiRevenue(days);

  const dailyRows = data?.dailyRevenue ?? [];
  const maxRevenue = Math.max(...dailyRows.map((d) => d.revenue), 1);

  // Model usage bar max
  const maxModelRevenue = Math.max(...(data?.modelUsage ?? []).map((m) => m.credits_used), 1);

  return (
    <div className="fade-in">
      <PageHeader
        title="API 매출 상세"
        subtitle="API 크레딧 거래 및 모델별 사용 분석"
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
              label="API 총 매출"
              value={formatAmount(data.totalApiRevenue)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              label="총 거래 수"
              value={data.totalTransactions.toLocaleString()}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16,3 21,3 21,8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21,16 21,21 16,21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              }
            />
            <StatCard
              label="평균 크레딧/호출"
              value={formatAmount(data.avgCreditPerCall)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              }
            />
            <StatCard
              label="활성 API 유저"
              value={data.activeApiUsers}
              pulse
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            />
          </div>

          {/* Daily API Revenue Chart + Model Usage */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 24 }}>
            {/* Daily API Revenue */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                일별 API 매출
              </h3>
              {dailyRows.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                      const pct = (d.revenue / maxRevenue) * 100;
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
                          title={`${d.date}: ${d.revenue.toLocaleString()} (${d.tx_count}건)`}
                        >
                          <div
                            style={{
                              width: "100%",
                              maxWidth: 24,
                              minHeight: 2,
                              height: `${Math.max(pct, 2)}%`,
                              background: d.revenue > 0
                                ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
                                : "var(--surface-active)",
                              borderRadius: "3px 3px 0 0",
                              transition: "height 0.3s ease",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
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

            {/* Model Usage Breakdown */}
            <div className="admin-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
                모델별 매출 비중
              </h3>
              {(data.modelUsage ?? []).length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  데이터가 없습니다
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data.modelUsage.map((m) => (
                    <div key={m.model}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                          {m.model}
                        </span>
                        <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {m.revenue_share}%
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-panel)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${(m.credits_used / maxModelRevenue) * 100}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                              borderRadius: 3,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <span className="data-mono" style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 60, textAlign: "right" }}>
                          {m.calls.toLocaleString()}건
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Credit Transactions Table */}
          <div className="admin-card" style={{ marginTop: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                크레딧 거래 내역
              </h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>유저</th>
                  <th>유형</th>
                  <th>금액</th>
                  <th>잔액</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                      거래 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {tx.date}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                          {tx.user_email}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${TYPE_BADGES[tx.type] ?? "badge-gray"}`}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td>
                        <span
                          className="data-mono"
                          style={{
                            fontSize: 13,
                            color: tx.type === "topup" ? "var(--status-online)" : tx.type === "refund" ? "var(--badge-amber-text)" : "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {tx.type === "deduct" ? "" : "+"}{tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {tx.balance_after.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Top API Users */}
          <div className="admin-card" style={{ marginTop: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                API 사용량 상위 유저
              </h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>유저</th>
                  <th>총 사용량</th>
                  <th>호출 수</th>
                  <th>비율</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u, i) => {
                  const pct = data.totalApiRevenue > 0 ? Math.round((u.total_spend / data.totalApiRevenue) * 100) : 0;
                  return (
                    <tr key={u.user_email}>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: i < 3 ? "var(--accent-muted)" : "var(--surface-panel)",
                            color: i < 3 ? "var(--accent)" : "var(--text-muted)",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                          {u.user_email}
                        </span>
                      </td>
                      <td>
                        <span className="data-mono" style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                          {u.total_spend.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {u.call_count.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, maxWidth: 100, height: 4, borderRadius: 2, background: "var(--surface-panel)", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                          </div>
                          <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 32 }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
