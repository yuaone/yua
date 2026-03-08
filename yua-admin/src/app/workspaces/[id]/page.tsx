"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";

interface WorkspaceDetail {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  plan_id: string;
  created_at: string;
}

interface Member {
  user_id: number;
  email: string | null;
  name: string | null;
  role: string;
  joined_at: string;
}

interface UsageStats {
  threadCount?: number;
  messageCount?: number;
  storageUsedMB?: number;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  pro: "#3b82f6",
  enterprise: "#8b5cf6",
  team: "#10b981",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#f59e0b",
  admin: "#ef4444",
  member: "#3b82f6",
  viewer: "#6b7280",
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wsId = params.id as string;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [usage, setUsage] = useState<UsageStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<{
      workspace: WorkspaceDetail;
      members: Member[];
      usage?: UsageStats;
    }>(`/admin/workspaces/${wsId}`).then((res) => {
      if (res.ok && res.data) {
        setWorkspace(res.data.workspace);
        setMembers(res.data.members);
        setUsage(res.data.usage ?? {});
      } else {
        setError(res.error ?? "워크스페이스를 찾을 수 없습니다");
      }
      setLoading(false);
    });
  }, [wsId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="yua-admin-spinner" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <>
        <PageHeader title="워크스페이스 상세" />
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span className="text-sm text-red-500">{error}</span>
          <button
            onClick={() => router.back()}
            className="text-sm px-4 py-2 rounded-lg border mt-2"
            style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
          >
            뒤로 가기
          </button>
        </div>
      </>
    );
  }

  const planColor = PLAN_COLORS[workspace.plan_id] ?? "#6b7280";

  return (
    <>
      <PageHeader
        title="워크스페이스 상세"
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--surface-panel)]"
            style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            뒤로
          </button>
        }
      />

      {/* Workspace Header Card */}
      <div
        className="rounded-2xl border overflow-hidden mb-6"
        style={{ background: "var(--surface-panel)", borderColor: "var(--line)" }}
      >
        {/* Banner */}
        <div
          className="h-16 relative"
          style={{
            background: `linear-gradient(135deg, ${planColor}30, ${planColor}10)`,
          }}
        />

        <div className="px-6 pb-6 -mt-8 relative">
          <div className="flex items-end gap-4 mb-5">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white border-4 shrink-0"
              style={{
                background: `hsl(${(workspace.id * 67) % 360}, 50%, 45%)`,
                borderColor: "var(--surface-panel)",
              }}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-bold leading-tight truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {workspace.name}
                </h2>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: planColor,
                    background: `${planColor}15`,
                  }}
                >
                  {workspace.plan_id}
                </span>
              </div>
              <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                /{workspace.slug}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCard label="ID" value={String(workspace.id)} mono />
            <InfoCard label="Slug" value={workspace.slug} mono />
            <InfoCard label="Owner ID" value={String(workspace.owner_id)} mono />
            <InfoCard
              label="생성일"
              value={new Date(workspace.created_at).toLocaleDateString("ko-KR")}
            />
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <UsageCard
          label="총 스레드"
          value={usage.threadCount ?? "-"}
          icon="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
          color="#3b82f6"
        />
        <UsageCard
          label="총 메시지"
          value={usage.messageCount ?? "-"}
          icon="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
          color="#10b981"
        />
        <UsageCard
          label="스토리지"
          value={usage.storageUsedMB != null ? `${usage.storageUsedMB} MB` : "-"}
          icon="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"
          color="#8b5cf6"
        />
      </div>

      {/* Members */}
      <h2
        className="text-sm font-semibold mb-3 flex items-center gap-2"
        style={{ color: "var(--text-primary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        멤버 ({members.length})
      </h2>

      {members.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity={0.3} className="mx-auto mb-2">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span className="text-sm">멤버 없음</span>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const roleColor = ROLE_COLORS[m.role] ?? "#6b7280";
            const isOwner = m.user_id === workspace.owner_id;

            return (
              <div
                key={m.user_id}
                onClick={() => router.push(`/users/${m.user_id}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 hover:border-[var(--text-muted)]"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-panel)",
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{
                    background: `hsl(${(m.user_id * 137) % 360}, 50%, 45%)`,
                  }}
                >
                  {(m.name || m.email || "?").charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {m.name ?? "(이름 없음)"}
                    </span>
                    {isOwner && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" aria-label="소유자">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.email ?? "-"}
                  </span>
                </div>

                {/* Role badge */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: roleColor,
                    background: `${roleColor}15`,
                  }}
                >
                  {m.role}
                </span>

                {/* Join date */}
                <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(m.joined_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function InfoCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span
        className="block text-[10px] uppercase tracking-wider mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className={`text-sm ${mono ? "font-mono text-xs" : ""}`}
        style={{ color: "var(--text-primary)" }}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function UsageCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex items-start gap-3"
      style={{
        background: "var(--surface-panel)",
        borderColor: "var(--line)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
          <path d={icon} />
        </svg>
      </div>
      <div>
        <span className="block text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <span
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>
    </div>
  );
}
