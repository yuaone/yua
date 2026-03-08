"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  plan_id: string;
  member_count: string;
  created_at: string;
  last_activity_at?: string;
}

const PLAN_BADGE: Record<string, string> = {
  pro: "badge-green",
  premium: "badge-amber",
  free: "badge-gray",
  enterprise: "badge-purple",
};

function getActivityLabel(dateStr?: string): { text: string; color: string } {
  if (!dateStr) return { text: "-", color: "var(--text-muted)" };
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return { text: "방금 전", color: "var(--status-online)" };
  if (hours < 24) return { text: `${Math.floor(hours)}시간 전`, color: "var(--text-secondary)" };
  const days = Math.floor(hours / 24);
  if (days < 7) return { text: `${days}일 전`, color: "var(--text-muted)" };
  return { text: `${Math.floor(days / 7)}주 전`, color: "var(--text-muted)" };
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (search) params.set("search", search);

    const res = await adminFetch<{ workspaces: Workspace[]; total: number }>(
      `/admin/workspaces?${params}`
    );
    if (res.ok && res.data) {
      setWorkspaces(res.data.workspaces);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "워크스페이스를 불러올 수 없습니다");
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const columns = [
    {
      key: "name",
      label: "워크스페이스",
      sortable: true,
      render: (row: Workspace) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: `linear-gradient(135deg, ${
                row.plan_id === "enterprise"
                  ? "#8b5cf6, #6d28d9"
                  : row.plan_id === "pro"
                    ? "#10b981, #059669"
                    : row.plan_id === "premium"
                      ? "#f59e0b, #d97706"
                      : "#6b7280, #4b5563"
              })`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {row.name}
            </div>
            <div className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              /{row.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "id",
      label: "ID",
      mono: true,
      sortable: true,
      width: "80px",
      render: (row: Workspace) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          #{row.id}
        </span>
      ),
    },
    {
      key: "plan_id",
      label: "플랜",
      sortable: true,
      render: (row: Workspace) => (
        <span className={`badge ${PLAN_BADGE[row.plan_id] ?? "badge-gray"}`}>
          {row.plan_id}
        </span>
      ),
    },
    {
      key: "member_count",
      label: "멤버",
      sortable: true,
      width: "90px",
      render: (row: Workspace) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            {row.member_count}
          </span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "생성일",
      sortable: true,
      render: (row: Workspace) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {new Date(row.created_at).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "last_activity_at",
      label: "마지막 활동",
      render: (row: Workspace) => {
        const activity = getActivityLabel(row.last_activity_at);
        return (
          <span style={{ fontSize: 12, color: activity.color }}>
            {activity.text}
          </span>
        );
      },
    },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="워크스페이스 관리"
        subtitle={`총 ${total.toLocaleString()}개 워크스페이스`}
      />

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
            placeholder="워크스페이스 이름 또는 slug 검색..."
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
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
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
        data={workspaces}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/workspaces/${row.id}`)}
        loading={loading}
      />
    </div>
  );
}
