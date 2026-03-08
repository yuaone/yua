"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";

interface UserDetail {
  id: number;
  firebase_uid: string;
  email: string;
  name: string;
  role: string;
  auth_provider: string;
  plan_id: string;
  is_banned?: boolean;
  created_at: string;
  last_login_at: string;
}

interface Workspace {
  id: number;
  name: string;
  role: string;
  joined_at: string;
}

interface RecentThread {
  id: number;
  title: string;
  model: string;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  pro: "#3b82f6",
  enterprise: "#8b5cf6",
  team: "#10b981",
};

const ROLE_COLORS: Record<string, string> = {
  user: "#3b82f6",
  admin: "#ef4444",
  superadmin: "#8b5cf6",
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [threadCount, setThreadCount] = useState(0);
  const [recentThreads, setRecentThreads] = useState<RecentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => void;
    danger: boolean;
  }>({ show: false, title: "", message: "", action: () => {}, danger: false });

  useEffect(() => {
    adminFetch<{
      user: UserDetail;
      workspaces: Workspace[];
      threadCount: number;
      recentThreads?: RecentThread[];
    }>(`/admin/users/${userId}`).then((res) => {
      if (res.ok && res.data) {
        setUser(res.data.user);
        setWorkspaces(res.data.workspaces);
        setThreadCount(res.data.threadCount);
        setRecentThreads(res.data.recentThreads ?? []);
      } else {
        setError(res.error ?? "유저를 찾을 수 없습니다");
      }
      setLoading(false);
    });
  }, [userId]);

  const handleAction = async (action: "ban" | "unban" | "role", value?: string) => {
    setActionLoading(true);
    const body: Record<string, unknown> = {};
    if (action === "ban") body.is_banned = true;
    if (action === "unban") body.is_banned = false;
    if (action === "role" && value) body.role = value;

    const res = await adminFetch(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert(res.error ?? "작업 실패");
    }
    setActionLoading(false);
  };

  const confirmAction = (
    title: string,
    message: string,
    action: () => void,
    danger = false
  ) => {
    setConfirmModal({ show: true, title, message, action, danger });
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "-";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="yua-admin-spinner" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <>
        <PageHeader title="유저 상세" />
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

  const planColor = PLAN_COLORS[user.plan_id] ?? "#6b7280";
  const roleColor = ROLE_COLORS[user.role] ?? "#3b82f6";
  const isBanned = user.is_banned;

  return (
    <>
      <PageHeader
        title="유저 상세"
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

      {/* User Profile Card */}
      <div
        className="rounded-2xl border overflow-hidden mb-6"
        style={{ background: "var(--surface-panel)", borderColor: "var(--line)" }}
      >
        {/* Banner */}
        <div
          className="h-20 relative"
          style={{
            background: `linear-gradient(135deg, ${roleColor}30, ${planColor}20)`,
          }}
        >
          {isBanned && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" />
              </svg>
              정지됨
            </div>
          )}
        </div>

        <div className="px-6 pb-6 -mt-10 relative">
          <div className="flex items-end gap-4 mb-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white border-4 shrink-0"
              style={{
                background: `hsl(${(user.id * 137) % 360}, 50%, 45%)`,
                borderColor: "var(--surface-panel)",
              }}
            >
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="pb-1">
              <h2
                className="text-lg font-bold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {user.name || "(이름 없음)"}
              </h2>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {user.email}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <InfoCard
              label="역할"
              value={user.role}
              badge
              badgeColor={roleColor}
            />
            <InfoCard
              label="플랜"
              value={user.plan_id}
              badge
              badgeColor={planColor}
            />
            <InfoCard
              label="인증 방식"
              value={user.auth_provider}
            />
            <InfoCard
              label="스레드 수"
              value={threadCount.toLocaleString()}
            />
            <InfoCard
              label="Firebase UID"
              value={user.firebase_uid}
              mono
            />
            <InfoCard
              label="가입일"
              value={new Date(user.created_at).toLocaleDateString("ko-KR")}
            />
            <InfoCard
              label="마지막 로그인"
              value={user.last_login_at ? getTimeAgo(user.last_login_at) : "-"}
            />
            <InfoCard
              label="DB ID"
              value={String(user.id)}
              mono
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
            {isBanned ? (
              <button
                onClick={() =>
                  confirmAction(
                    "정지 해제",
                    `${user.name || user.email} 유저의 정지를 해제하시겠습니까?`,
                    () => handleAction("unban")
                  )
                }
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50"
                style={{
                  borderColor: "#10b981",
                  color: "#10b981",
                  background: "rgba(16,185,129,0.08)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                정지 해제
              </button>
            ) : (
              <button
                onClick={() =>
                  confirmAction(
                    "유저 정지",
                    `${user.name || user.email} 유저를 정지하시겠습니까? 이 유저는 서비스에 접근할 수 없게 됩니다.`,
                    () => handleAction("ban"),
                    true
                  )
                }
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" />
                </svg>
                정지
              </button>
            )}

            <div className="relative group">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    confirmAction(
                      "역할 변경",
                      `${user.name || user.email}의 역할을 "${e.target.value}"(으)로 변경하시겠습니까?`,
                      () => handleAction("role", e.target.value)
                    );
                    e.target.value = "";
                  }
                }}
                disabled={actionLoading}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium border cursor-pointer disabled:opacity-50"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-main)",
                  color: "var(--text-secondary)",
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  역할 변경
                </option>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="var(--text-muted)"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspaces */}
        <div>
          <h2
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
            </svg>
            워크스페이스 ({workspaces.length})
          </h2>
          {workspaces.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
            >
              <span className="text-sm">워크스페이스 없음</span>
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => router.push(`/workspaces/${ws.id}`)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 hover:border-[var(--text-muted)]"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface-panel)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        background: `hsl(${(ws.id * 67) % 360}, 50%, 45%)`,
                      }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {ws.name}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(ws.joined_at).toLocaleDateString("ko-KR")} 참여
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      color: ws.role === "owner" ? "#f59e0b" : ws.role === "admin" ? "#ef4444" : "#6b7280",
                      background: `${ws.role === "owner" ? "#f59e0b" : ws.role === "admin" ? "#ef4444" : "#6b7280"}15`,
                    }}
                  >
                    {ws.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Threads */}
        <div>
          <h2
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
            </svg>
            최근 활동 (최근 10개 스레드)
          </h2>
          {recentThreads.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}
            >
              <span className="text-sm">최근 활동 없음</span>
            </div>
          ) : (
            <div className="space-y-1">
              {recentThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => router.push(`/threads?id=${thread.id}`)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:bg-[var(--surface-panel)]"
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {thread.title || "(제목 없음)"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          color: "#8b5cf6",
                          background: "rgba(139,92,246,0.1)",
                        }}
                      >
                        {thread.model || "unknown"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] shrink-0 ml-3" style={{ color: "var(--text-muted)" }}>
                    {getTimeAgo(thread.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 yua-admin-slide-in"
            style={{
              background: "var(--surface-panel)",
              border: "1px solid var(--line)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: confirmModal.danger ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={confirmModal.danger ? "#ef4444" : "#3b82f6"}
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <h3
              className="text-base font-semibold text-center mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {confirmModal.title}
            </h3>
            <p
              className="text-sm text-center mb-6 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {confirmModal.message}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--text-secondary)",
                  background: "var(--surface-main)",
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  confirmModal.action();
                  setConfirmModal((prev) => ({ ...prev, show: false }));
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{
                  background: confirmModal.danger ? "#ef4444" : "#3b82f6",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoCard({
  label,
  value,
  badge,
  badgeColor,
  mono,
}: {
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: string;
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
      {badge && badgeColor ? (
        <span
          className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            color: badgeColor,
            background: `${badgeColor}15`,
          }}
        >
          {value}
        </span>
      ) : (
        <span
          className={`text-sm ${mono ? "font-mono text-xs" : ""}`}
          style={{ color: "var(--text-primary)" }}
        >
          {value || "-"}
        </span>
      )}
    </div>
  );
}
