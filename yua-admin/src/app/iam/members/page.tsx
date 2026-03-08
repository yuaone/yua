"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import type { AdminRole, AdminMemberStatus } from "yua-shared";

/* ── 타입 ── */
interface Member {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminMemberStatus;
  invited_by_name: string | null;
  created_at: string;
}

/* ── 상수 ── */
const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "슈퍼어드민",
  admin: "관리자",
  support_agent: "서포트",
  billing_manager: "빌링",
  viewer: "뷰어",
};

const ROLE_BADGE: Record<AdminRole, string> = {
  superadmin: "badge-purple",
  admin: "badge-blue",
  support_agent: "badge-green",
  billing_manager: "badge-amber",
  viewer: "badge-gray",
};

const STATUS_BADGE: Record<AdminMemberStatus, { cls: string; label: string }> = {
  active: { cls: "badge-green", label: "활성" },
  suspended: { cls: "badge-red", label: "정지" },
  invited: { cls: "badge-amber", label: "초대됨" },
};

const ALL_ROLES: AdminRole[] = ["superadmin", "admin", "support_agent", "billing_manager", "viewer"];

/* ── Mock 데이터 (TODO: adminFetch 연동) ── */
const MOCK_MEMBERS: Member[] = [
  { id: "1", email: "admin@yuaone.com", name: "김정원", role: "superadmin", status: "active", invited_by_name: null, created_at: "2025-01-15T09:00:00Z" },
  { id: "2", email: "ops@yuaone.com", name: "이서준", role: "admin", status: "active", invited_by_name: "김정원", created_at: "2025-03-10T14:30:00Z" },
  { id: "3", email: "support@yuaone.com", name: "박민지", role: "support_agent", status: "active", invited_by_name: "김정원", created_at: "2025-06-01T10:00:00Z" },
  { id: "4", email: "billing@yuaone.com", name: "최하늘", role: "billing_manager", status: "active", invited_by_name: "이서준", created_at: "2025-08-20T16:00:00Z" },
  { id: "5", email: "viewer@yuaone.com", name: "정수빈", role: "viewer", status: "invited", invited_by_name: "김정원", created_at: "2026-02-28T11:00:00Z" },
];

export default function IAMMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("viewer");
  const [roleChangeTarget, setRoleChangeTarget] = useState<string | null>(null);
  const limit = 20;

  const fetchMembers = useCallback(async (p: number, q: string, role: string) => {
    setLoading(true);
    // TODO: adminFetch<{ members: Member[]; total: number }>(`/admin/iam/members?page=${p}&limit=${limit}&search=${q}&role=${role}`)
    await new Promise((r) => setTimeout(r, 300)); // simulate network
    let filtered = [...MOCK_MEMBERS];
    if (q) {
      const lq = q.toLowerCase();
      filtered = filtered.filter((m) => m.email.toLowerCase().includes(lq) || m.name.toLowerCase().includes(lq));
    }
    if (role) filtered = filtered.filter((m) => m.role === role);
    setMembers(filtered);
    setTotal(filtered.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers(page, search, roleFilter);
  }, [page, search, roleFilter, fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    // TODO: adminFetch("/admin/iam/members/invite", { method: "POST", body: JSON.stringify({ email: inviteEmail, role: inviteRole }) })
    const newMember: Member = {
      id: String(Date.now()),
      email: inviteEmail.trim(),
      name: inviteEmail.split("@")[0],
      role: inviteRole,
      status: "invited",
      invited_by_name: "나",
      created_at: new Date().toISOString(),
    };
    setMembers((prev) => [newMember, ...prev]);
    setTotal((prev) => prev + 1);
    setInviteEmail("");
    setInviteRole("viewer");
    setShowInvite(false);
  };

  const handleRoleChange = async (memberId: string, newRole: AdminRole) => {
    // TODO: adminFetch(`/admin/iam/members/${memberId}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) })
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    setRoleChangeTarget(null);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("이 멤버를 삭제하시겠습니까?")) return;
    // TODO: adminFetch(`/admin/iam/members/${memberId}`, { method: "DELETE" })
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setTotal((prev) => prev - 1);
  };

  const columns = [
    {
      key: "name",
      label: "이름",
      render: (row: Member) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {row.name}
          </div>
          <div className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "역할",
      sortable: true,
      render: (row: Member) => (
        <div style={{ position: "relative" }}>
          {roleChangeTarget === row.id ? (
            <select
              className="admin-select"
              value={row.role}
              onChange={(e) => handleRoleChange(row.id, e.target.value as AdminRole)}
              onBlur={() => setRoleChangeTarget(null)}
              autoFocus
              style={{ fontSize: 12, padding: "4px 8px", minWidth: 120 }}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          ) : (
            <span
              className={`badge ${ROLE_BADGE[row.role]}`}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setRoleChangeTarget(row.id);
              }}
              title="클릭하여 역할 변경"
            >
              {ROLE_LABELS[row.role]}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "상태",
      sortable: true,
      render: (row: Member) => {
        const s = STATUS_BADGE[row.status];
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
      },
    },
    {
      key: "invited_by_name",
      label: "초대자",
      render: (row: Member) => (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {row.invited_by_name ?? "-"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "생성일",
      sortable: true,
      render: (row: Member) => (
        <span className="data-mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {new Date(row.created_at).toLocaleDateString("ko-KR")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "48px",
      render: (row: Member) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            borderRadius: 4,
          }}
          title="멤버 삭제"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="IAM 관리"
        subtitle={`총 ${total}명의 직원`}
        actions={
          <button
            className="admin-btn-primary"
            onClick={() => setShowInvite(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            직원 초대
          </button>
        }
      />

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
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
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={members}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        loading={loading}
      />

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowInvite(false)}
        >
          <div
            className="admin-card"
            style={{
              padding: 24,
              width: 420,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              직원 초대
            </h2>

            {/* Email */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              이메일
            </label>
            <input
              className="admin-input"
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
              autoFocus
            />

            {/* Role */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              역할
            </label>
            <select
              className="admin-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminRole)}
              style={{ width: "100%", marginBottom: 24 }}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "var(--surface-panel)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: inviteEmail.trim() ? "var(--accent)" : "var(--surface-active)",
                  color: inviteEmail.trim() ? "#fff" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 8,
                  cursor: inviteEmail.trim() ? "pointer" : "not-allowed",
                }}
              >
                초대 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
