"use client";

import PageHeader from "@/components/PageHeader";
import type { AdminRole, PermissionLevel } from "yua-shared";

/* ── 권한 매트릭스 (Section 4.2 SSOT) ── */
interface MatrixRow {
  resource: string;
  permissions: Record<AdminRole, PermissionLevel>;
}

const MATRIX: MatrixRow[] = [
  {
    resource: "IAM 관리",
    permissions: { superadmin: "RW", admin: "-", support_agent: "-", billing_manager: "-", viewer: "-" },
  },
  {
    resource: "유저 CRUD",
    permissions: { superadmin: "RW", admin: "RW", support_agent: "R", billing_manager: "-", viewer: "R" },
  },
  {
    resource: "매출 대시보드",
    permissions: { superadmin: "RW", admin: "R", support_agent: "-", billing_manager: "RW", viewer: "R" },
  },
  {
    resource: "티켓 관리",
    permissions: { superadmin: "RW", admin: "RW", support_agent: "RW", billing_manager: "-", viewer: "R" },
  },
  {
    resource: "시스템 설정",
    permissions: { superadmin: "RW", admin: "R", support_agent: "-", billing_manager: "-", viewer: "-" },
  },
  {
    resource: "모델 설정",
    permissions: { superadmin: "RW", admin: "RW", support_agent: "-", billing_manager: "-", viewer: "R" },
  },
  {
    resource: "감사 로그",
    permissions: { superadmin: "R", admin: "R", support_agent: "-", billing_manager: "-", viewer: "R" },
  },
];

const ROLES: { code: AdminRole; label: string; description: string }[] = [
  { code: "superadmin", label: "슈퍼어드민", description: "모든 권한 + IAM 관리 + 역할 부여" },
  { code: "admin", label: "관리자", description: "유저/워크스페이스 관리, 매출 조회" },
  { code: "support_agent", label: "서포트 에이전트", description: "티켓 관리, 유저 조회 (수정 불가)" },
  { code: "billing_manager", label: "빌링 매니저", description: "매출/결제/인보이스 관리" },
  { code: "viewer", label: "뷰어", description: "읽기 전용 (대시보드, 로그 조회)" },
];

const ROLE_BADGE: Record<AdminRole, string> = {
  superadmin: "badge-purple",
  admin: "badge-blue",
  support_agent: "badge-green",
  billing_manager: "badge-amber",
  viewer: "badge-gray",
};

function PermissionCell({ level }: { level: PermissionLevel }) {
  if (level === "RW") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--badge-green-text)",
          background: "var(--badge-green-bg, rgba(16,185,129,0.1))",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        RW
      </span>
    );
  }
  if (level === "R") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--badge-blue-text)",
          background: "var(--badge-blue-bg, rgba(59,130,246,0.1))",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        R
      </span>
    );
  }
  // "-"
  return (
    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>-</span>
  );
}

export default function IAMRolesPage() {
  return (
    <>
      <PageHeader
        title="역할 & 권한"
        subtitle="역할 체계 및 권한 매트릭스"
      />

      {/* ── 역할 카드 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 32 }}>
        {ROLES.map((role) => (
          <div
            key={role.code}
            className="admin-card"
            style={{ padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className={`badge ${ROLE_BADGE[role.code]}`}>
                {role.label}
              </span>
            </div>
            <div className="data-mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              {role.code}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {role.description}
            </div>
          </div>
        ))}
      </div>

      {/* ── 권한 매트릭스 테이블 ── */}
      <div className="admin-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            권한 매트릭스
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            각 역할별 리소스 접근 권한 (RW: 읽기/쓰기, R: 읽기 전용, -: 접근 불가)
          </p>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ minWidth: 140 }}>리소스</th>
              {ROLES.map((role) => (
                <th key={role.code} style={{ textAlign: "center", minWidth: 100 }}>
                  <span className={`badge ${ROLE_BADGE[role.code]}`} style={{ fontSize: 10 }}>
                    {role.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.resource}>
                <td>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                    {row.resource}
                  </span>
                </td>
                {ROLES.map((role) => (
                  <td key={role.code} style={{ textAlign: "center" }}>
                    <PermissionCell level={row.permissions[role.code]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
