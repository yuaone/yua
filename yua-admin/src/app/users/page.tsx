"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  plan_id: string;
  auth_provider: string;
  created_at: string;
  last_active_at?: string;
  status?: string;
}

const ROLE_BADGE: Record<string, string> = {
  admin: "badge-purple",
  moderator: "badge-blue",
  user: "badge-gray",
};

const PLAN_BADGE: Record<string, string> = {
  pro: "badge-green",
  premium: "badge-amber",
  free: "badge-gray",
  enterprise: "badge-purple",
};

const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

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

function getStatusInfo(user: User): { dot: string; label: string } {
  if (user.status === "banned") return { dot: "error", label: "차단" };
  if (user.status === "inactive") return { dot: "idle", label: "비활성" };
  // Default: active
  return { dot: "online", label: "활성" };
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (q) params.set("search", q);

    const res = await adminFetch<{ users: User[]; total: number }>(`/admin/users?${params}`);
    if (res.ok && res.data) {
      setUsers(res.data.users);
      setTotal(res.data.total);
    } else {
      setError(res.error ?? "유저 목록을 불러올 수 없습니다");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const columns = [
    {
      key: "user",
      label: "유저",
      render: (row: User) => {
        const initials = getInitials(row.name, row.email);
        const color = getAvatarColor(row.name || row.email);
        const status = getStatusInfo(row);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <div
                className="avatar-circle"
                style={{ background: color }}
              >
                {initials}
              </div>
              <span
                className={`status-dot ${status.dot}`}
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  border: "2px solid var(--surface-main)",
                }}
              />
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
      key: "id",
      label: "ID",
      mono: true,
      sortable: true,
      width: "80px",
      render: (row: User) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          #{row.id}
        </span>
      ),
    },
    {
      key: "role",
      label: "역할",
      sortable: true,
      render: (row: User) => (
        <span className={`badge ${ROLE_BADGE[row.role] ?? "badge-gray"}`}>
          {row.role}
        </span>
      ),
    },
    {
      key: "plan_id",
      label: "플랜",
      sortable: true,
      render: (row: User) => (
        <span className={`badge ${PLAN_BADGE[row.plan_id] ?? "badge-gray"}`}>
          {row.plan_id}
        </span>
      ),
    },
    {
      key: "auth_provider",
      label: "인증",
      render: (row: User) => (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {row.auth_provider === "google" ? "Google" : row.auth_provider === "email" ? "Email" : row.auth_provider}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "가입일",
      sortable: true,
      render: (row: User) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {new Date(row.created_at).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="유저 관리"
        subtitle={`총 ${total.toLocaleString()}명의 유저`}
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
            placeholder="이메일 또는 이름 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 32, width: "100%" }}
          />
        </div>

        <select
          className="admin-select"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">모든 역할</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>

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

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">모든 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
          <option value="banned">차단</option>
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
        data={users}
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
