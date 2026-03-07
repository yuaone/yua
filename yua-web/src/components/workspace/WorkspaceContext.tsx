"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import type {
  Tier,
  WsRole,
  Member,
  Invite,
  Caps,
  InviteLinkData,
  AuthFetchFn,
  ToastFn,
} from "./types";

/* ========================================
   Context value type
======================================== */

type ToastValue = { message: string; kind: "ok" | "warn" | "error" } | null;

export type WorkspaceCtxValue = {
  // Data
  tier: Tier;
  isBusiness: boolean;
  isEnterprise: boolean;
  myRole: WsRole | null;
  myUserId: number | null;
  workspaceName: string;
  workspaceId: string;
  caps: Caps;
  members: Member[];
  invites: Invite[];
  inviteLink: InviteLinkData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  authFetch: AuthFetchFn;

  // Toast
  toast: ToastValue;
  showToast: ToastFn;

  // Actions
  inviteMember: (email: string, role: string) => Promise<boolean>;
  removeMember: (userId: number) => Promise<boolean>;
  updateRole: (userId: number, role: string) => Promise<boolean>;
  revokeInvite: (inviteId: string) => Promise<boolean>;
  approveInvite: (inviteId: string) => Promise<boolean>;
  leaveWorkspace: () => Promise<string | null>;
  transferOwnership: (targetUserId: number) => Promise<boolean>;
  createInviteLink: (opts: {
    maxUses?: number;
    expiresAt?: number;
    role?: string;
  }) => Promise<boolean>;
  rotateInviteLink: (opts: {
    maxUses?: number;
    expiresAt?: number;
    role?: string;
  }) => Promise<boolean>;
};

/* ========================================
   Context + defaults
======================================== */

const WorkspaceCtx = createContext<WorkspaceCtxValue | null>(null);

/* ========================================
   Provider
======================================== */

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { profile, authFetch } = useAuth();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  // Derived identity
  const myUserId: number | null =
    profile?.user?.id != null ? Number(profile.user.id) : null;
  const myRole: WsRole | null = (profile?.role as WsRole) ?? null;
  const workspaceName: string = profile?.workspace?.name ?? "";
  const wsId: string = activeWorkspaceId ?? profile?.workspace?.id ?? "";

  // Core state
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<Tier>("free");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [caps, setCaps] = useState<Caps>({
    canInvite: false,
    canChangeRole: false,
    canRemoveMember: false,
  });
  const [inviteLink, setInviteLink] = useState<InviteLinkData | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastValue>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast: ToastFn = useCallback(
    (msg: string, kind: "ok" | "warn" | "error" = "ok") => {
      setToast({ message: msg, kind });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Derived tier flags
  const isBusiness = tier === "business" || tier === "enterprise";
  const isEnterprise = tier === "enterprise";

  /* ----------------------------------------
     Data loading
  ---------------------------------------- */

  const refresh = useCallback(async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/members");
      const data = await res.json();
      if (data?.ok) {
        setMembers(data.members ?? []);
        setInvites(data.invites ?? []);
        setCaps(data.caps ?? {});
        setTier((data?.plan?.tier ?? "free") as Tier);
      }
    } finally {
      setLoading(false);
    }
  }, [wsId, authFetch]);

  const refreshInviteLink = useCallback(async () => {
    if (!wsId) return;
    try {
      const res = await authFetch("/api/workspace/invite-link");
      const data = await res.json();
      if (data?.ok) {
        setInviteLink(data.link ?? null);
      }
    } catch {
      // non-critical — invite link may not exist yet
    }
  }, [wsId, authFetch]);

  // Initial load on workspace change
  useEffect(() => {
    if (!wsId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  // Load invite link when tier becomes business+
  useEffect(() => {
    if (!wsId) return;
    if (isBusiness) {
      refreshInviteLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId, isBusiness]);

  /* ----------------------------------------
     Actions
  ---------------------------------------- */

  const inviteMember = useCallback(
    async (email: string, role: string): Promise<boolean> => {
      if (!caps.canInvite) return false;
      const e = email.trim();
      if (!e) return false;
      setLoading(true);
      try {
        const res = await authFetch("/api/workspace/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: e, role }),
        });
        const data = await res.json();
        if (data?.ok) {
          setMembers(data.members ?? []);
          setInvites(data.invites ?? []);
          showToast("초대가 전송되었습니다.", "ok");
          return true;
        }
        showToast("초대에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canInvite, showToast],
  );

  const removeMemberAction = useCallback(
    async (userId: number): Promise<boolean> => {
      if (!caps.canRemoveMember) return false;
      setLoading(true);
      try {
        const res = await authFetch(`/api/workspace/members/${userId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data?.ok) {
          await refresh();
          showToast("멤버가 제거되었습니다.", "ok");
          return true;
        }
        showToast("멤버 제거에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canRemoveMember, refresh, showToast],
  );

  const updateRoleAction = useCallback(
    async (userId: number, role: string): Promise<boolean> => {
      if (!caps.canChangeRole) return false;
      setLoading(true);
      try {
        const res = await authFetch(`/api/workspace/members/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (data?.ok) {
          await refresh();
          showToast("역할이 변경되었습니다.", "ok");
          return true;
        }
        showToast("역할 변경에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canChangeRole, refresh, showToast],
  );

  const revokeInviteAction = useCallback(
    async (inviteId: string): Promise<boolean> => {
      if (!caps.canInvite) return false;
      setLoading(true);
      try {
        const res = await authFetch(
          `/api/workspace/invitations/${inviteId}/revoke`,
          { method: "POST" },
        );
        const data = await res.json();
        if (data?.ok) {
          await refresh();
          showToast("초대가 취소되었습니다.", "ok");
          return true;
        }
        showToast("초대 취소에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canInvite, refresh, showToast],
  );

  const approveInviteAction = useCallback(
    async (inviteId: string): Promise<boolean> => {
      if (!caps.canApprove) return false;
      setLoading(true);
      try {
        const res = await authFetch(
          `/api/workspace/invitations/${inviteId}/approve`,
          { method: "POST" },
        );
        const data = await res.json();
        if (data?.ok) {
          await refresh();
          showToast("승인되었습니다.", "ok");
          return true;
        }
        showToast("승인에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canApprove, refresh, showToast],
  );

  const leaveWorkspaceAction = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/leave", {
        method: "POST",
      });
      const data = await res.json();
      if (data?.ok && data?.nextWorkspaceId) {
        showToast("워크스페이스를 나갔습니다.", "ok");
        return data.nextWorkspaceId as string;
      }
      const msg =
        data?.error === "owner_must_transfer"
          ? "소유자는 먼저 소유권을 이전해야 합니다."
          : data?.error === "cannot_leave_personal"
            ? "개인 워크스페이스는 나갈 수 없습니다."
            : "워크스페이스 나가기에 실패했습니다.";
      showToast(msg, "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  const transferOwnershipAction = useCallback(
    async (targetUserId: number): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await authFetch("/api/workspace/owner/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        });
        const data = await res.json();
        if (data?.ok) {
          showToast("소유권이 이전되었습니다.", "ok");
          await refresh();
          return true;
        }
        const msg =
          data?.error === "owner_required"
            ? "소유자만 이전할 수 있습니다."
            : data?.error === "invalid_target"
              ? "대상 사용자가 올바르지 않습니다."
              : data?.error === "target_not_member"
                ? "대상 사용자가 멤버가 아닙니다."
                : data?.error === "cannot_transfer_self"
                  ? "본인에게는 이전할 수 없습니다."
                  : "소유권 이전에 실패했습니다.";
        showToast(msg, "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, refresh, showToast],
  );

  const createInviteLinkAction = useCallback(
    async (opts: {
      maxUses?: number;
      expiresAt?: number;
      role?: string;
    }): Promise<boolean> => {
      if (!caps.canInvite || !isBusiness) return false;
      setLoading(true);
      try {
        const res = await authFetch("/api/workspace/invite-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: opts.role,
            maxUses: opts.maxUses,
            expiresAt: opts.expiresAt,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          setInviteLink(data.link ?? null);
          showToast("초대 링크가 생성되었습니다.", "ok");
          return true;
        }
        showToast("초대 링크 생성에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canInvite, isBusiness, showToast],
  );

  const rotateInviteLinkAction = useCallback(
    async (opts: {
      maxUses?: number;
      expiresAt?: number;
      role?: string;
    }): Promise<boolean> => {
      if (!caps.canInvite || !isBusiness) return false;
      setLoading(true);
      try {
        const res = await authFetch("/api/workspace/invite-link/rotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: opts.role,
            maxUses: opts.maxUses,
            expiresAt: opts.expiresAt,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          setInviteLink(data.link ?? null);
          showToast("초대 링크가 재발급되었습니다.", "ok");
          return true;
        }
        showToast("초대 링크 재발급에 실패했습니다.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, caps.canInvite, isBusiness, showToast],
  );

  /* ----------------------------------------
     Memoised context value
  ---------------------------------------- */

  const value = useMemo<WorkspaceCtxValue>(
    () => ({
      tier,
      isBusiness,
      isEnterprise,
      myRole,
      myUserId,
      workspaceName,
      workspaceId: wsId,
      caps,
      members,
      invites,
      inviteLink,
      loading,
      refresh,
      authFetch,
      toast,
      showToast,
      // Actions
      inviteMember,
      removeMember: removeMemberAction,
      updateRole: updateRoleAction,
      revokeInvite: revokeInviteAction,
      approveInvite: approveInviteAction,
      leaveWorkspace: leaveWorkspaceAction,
      transferOwnership: transferOwnershipAction,
      createInviteLink: createInviteLinkAction,
      rotateInviteLink: rotateInviteLinkAction,
    }),
    [
      tier,
      isBusiness,
      isEnterprise,
      myRole,
      myUserId,
      workspaceName,
      wsId,
      caps,
      members,
      invites,
      inviteLink,
      loading,
      refresh,
      authFetch,
      toast,
      showToast,
      inviteMember,
      removeMemberAction,
      updateRoleAction,
      revokeInviteAction,
      approveInviteAction,
      leaveWorkspaceAction,
      transferOwnershipAction,
      createInviteLinkAction,
      rotateInviteLinkAction,
    ],
  );

  return (
    <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
  );
}

/* ========================================
   Hook
======================================== */

export function useWorkspaceCtx(): WorkspaceCtxValue {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) {
    throw new Error(
      "useWorkspaceCtx must be used inside <WorkspaceProvider>",
    );
  }
  return ctx;
}
