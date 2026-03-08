"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";

interface CustomerStats {
  totalUsers: number;
  active7d: number;
  active30d: number;
  monthlyGrowth: Array<{ month: string; new_users: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
  authDistribution: Array<{ provider: string; count: number }>;
}

interface Customer {
  id: number;
  email: string;
  name: string;
  plan_id: string;
  role: string;
  auth_provider: string;
  credits: number;
  daily_usage: number;
  monthly_usage: number;
  created_at: string;
  updated_at: string;
}

const PLAN_BADGE: Record<string, string> = {
  premium: "badge-amber",
  developer: "badge-blue",
  developer_pro: "badge-purple",
  business: "badge-green",
  business_premium: "badge-green",
  enterprise: "badge-purple",
  free: "badge-gray",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "badge-purple",
  moderator: "badge-blue",
  user: "badge-gray",
};

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

const PLAN_COLORS: Record<string, string> = {
  free: "var(--badge-gray-text)",
  premium: "var(--badge-amber-text)",
  developer: "var(--badge-blue-text)",
  developer_pro: "var(--badge-purple-text)",
  business: "var(--badge-green-text)",
  enterprise: "#ef4444",
};

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string, email: string): string {
  if (name && name.length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function CustomersPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  // Fetch customer stats
  useEffect(() => {
    setStatsLoading(true);
    adminFetch<CustomerStats>("/admin/stats/customers").then((res) => {
      if (res.ok && res.data) setStats(res.data);
      setStatsLoading(false);
    });
  }, []);

  // Fetch customer list
  const fetchCustomers = useCallback(async (p: number, q: string, plan: string) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: String(limit),
      sort: "created_at",
      dir: "desc",
    });
    if (q) params.set("search", q);
    if (plan) params.set("plan", plan);

    const res = await adminFetch<{ customers: Customer[]; total: number }>(`/admin/customers?${params}`);
    if (res.ok && res.data) {
      setCustomers(res.data.customers);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "고객 목록을 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers(page, search, planFilter);
  }, [page, search, planFilter, fetchCustomers]);

  // Computed
  const paidUsers = stats?.planDistribution
    ?.filter((p) => p.plan !== "free")
    .reduce((sum, p) => sum + Number(p.count || 0), 0) ?? 0;

  // Monthly growth chart data
  const growthData = stats?.monthlyGrowth?.slice().reverse() ?? [];
  const maxGrowth = Math.max(...growthData.map((d) => Number(d.new_users || 0)), 1);

  // Plan distribution
  const planDist = stats?.planDistribution ?? [];
  const totalPlanUsers = planDist.reduce((s, p) => s + Number(p.count || 0), 0) || 1;

  const columns = [
    {
      key: "user",
      label: "고객",
      render: (row: Customer) => {
        const initials = getInitials(row.name, row.email);
        const color = getAvatarColor(row.name || row.email);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar-circle" style={{ background: color }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.3 }}>
                {row.name || "-"}
              </div>
              <div className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {row.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "plan_id",
      label: "플랜",
      sortable: true,
      render: (row: Customer) => (
        <span className={`badge ${PLAN_BADGE[row.plan_id] ?? "badge-gray"}`}>
          {row.plan_id || "free"}
        </span>
      ),
    },
    {
      key: "role",
      label: "역할",
      render: (row: Customer) => (
        <span className={`badge ${ROLE_BADGE[row.role] ?? "badge-gray"}`}>
          {row.role || "user"}
        </span>
      ),
    },
    {
      key: "credits",
      label: "크레딧",
      sortable: true,
      render: (row: Customer) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-primary)" }}>
          {Number(row.credits || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "monthly_usage",
      label: "월 사용량",
      sortable: true,
      render: (row: Customer) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {Number(row.monthly_usage || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "가입일",
      sortable: true,
      render: (row: Customer) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {new Date(row.created_at).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "최근 활동",
      sortable: true,
      render: (row: Customer) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {row.updated_at ? timeAgo(row.updated_at) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="고객 관리"
        subtitle={`총 ${(stats?.totalUsers ?? total).toLocaleString()}명의 고객`}
      />

      {/* Summary Cards */}
      {statsLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "30%" }} />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard
            label="총 유저"
            value={Number(stats.totalUsers)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="활성 (7일)"
            value={Number(stats.active7d)}
            pulse
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
            }
          />
          <StatCard
            label="활성 (30일)"
            value={Number(stats.active30d)}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <StatCard
            label="유료 유저"
            value={paidUsers}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* Charts Row: Monthly Growth + Plan Distribution */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Monthly Growth Chart */}
          <div className="admin-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
              월별 신규 가입
            </h3>
            {growthData.length === 0 ? (
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
                    height: 160,
                    padding: "0 0 8px 0",
                  }}
                >
                  {growthData.map((d, i) => {
                    const val = Number(d.new_users || 0);
                    const pct = (val / maxGrowth) * 100;
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
                        title={`${d.month}: ${val}명`}
                      >
                        <span className="data-mono" style={{ fontSize: 9, color: "var(--text-muted)" }}>
                          {val}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            maxWidth: 32,
                            minHeight: 4,
                            height: `${Math.max(pct, 3)}%`,
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
                  {growthData.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.month.slice(5)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Plan Distribution */}
          <div className="admin-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
              플랜 분포
            </h3>
            {planDist.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                데이터가 없습니다
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Stacked bar */}
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--surface-panel)" }}>
                  {planDist.map((p) => (
                    <div
                      key={p.plan}
                      style={{
                        width: `${(Number(p.count) / totalPlanUsers) * 100}%`,
                        background: PLAN_COLORS[p.plan] ?? "var(--accent)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                {planDist.map((p) => {
                  const count = Number(p.count);
                  return (
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
                          {p.plan}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {count.toLocaleString()}
                        </span>
                        <span className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          ({Math.round((count / totalPlanUsers) * 100)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="admin-input"
            placeholder="이메일 또는 이름 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 32, width: "100%" }}
          />
        </div>

        <select
          className="admin-select"
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
        >
          <option value="">모든 플랜</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="developer">Developer</option>
          <option value="developer_pro">Developer Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

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

      <DataTable
        columns={columns}
        data={customers}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/users/${row.id}`)}
        loading={loading}
      />
    </div>
  );
}
