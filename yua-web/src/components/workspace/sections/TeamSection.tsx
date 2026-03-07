"use client";

import { useCallback, useMemo, useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  Trash2,
  ShieldCheck,
  X,
  Mail,
  Clock,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import type { Member, Invite, WsRole } from "../types";

/* ========================================
   Constants
======================================== */

const ROLE_ORDER: Record<WsRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

const ROLE_BADGE: Record<WsRole, string> = {
  owner: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  member: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  viewer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  pending_approval: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  revoked: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

/* ========================================
   Inline confirm modal
======================================== */

function ConfirmModal(props: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { title, message, confirmLabel, danger, loading, onConfirm, onCancel } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle size={20} className={danger ? "text-red-500" : "text-yellow-500"} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium
                       hover:bg-gray-100 dark:hover:bg-white/5 transition-colors
                       disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity
                       disabled:opacity-50 ${
                         danger
                           ? "bg-red-600 text-white hover:opacity-90"
                           : "bg-[#111827] dark:bg-white text-white dark:text-[#111827] hover:opacity-90"
                       }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================
   Avatar circle
======================================== */

function Avatar({ name, size = 36 }: { name: string | null; size?: number }) {
  const letter = (name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full
                 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium"
      style={{ width: size, height: size }}
    >
      {letter}
    </div>
  );
}

/* ========================================
   TeamSection
======================================== */

export default function TeamSection() {
  const {
    myRole,
    myUserId,
    caps,
    members,
    invites,
    loading,
    inviteMember,
    removeMember,
    updateRole,
    revokeInvite,
  } = useWorkspaceCtx();

  // Invite form state
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");

  // Action menu open for member
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // Confirmation modal
  const [confirm, setConfirm] = useState<{
    type: "remove" | "role";
    member: Member;
    nextRole?: "admin" | "member" | "viewer";
  } | null>(null);

  const canManage = myRole === "owner" || myRole === "admin";

  /* ----------------------------------------
     Sorted members: owner > admin > member > viewer
  ---------------------------------------- */

  const sortedMembers = useMemo(() => {
    return [...members].sort(
      (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
    );
  }, [members]);

  /* ----------------------------------------
     Pending invites (exclude approval queue)
  ---------------------------------------- */

  const pendingInvites = useMemo(() => {
    return invites.filter(
      (inv) => inv.status === "pending" || inv.status === "approved",
    );
  }, [invites]);

  /* ----------------------------------------
     Handlers
  ---------------------------------------- */

  const handleInvite = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const ok = await inviteMember(trimmed, inviteRole);
    if (ok) {
      setEmail("");
    }
  }, [email, inviteRole, inviteMember]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInvite();
      }
    },
    [handleInvite],
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (!confirm || confirm.type !== "remove") return;
    await removeMember(confirm.member.userId);
    setConfirm(null);
  }, [confirm, removeMember]);

  const handleRoleConfirm = useCallback(async () => {
    if (!confirm || confirm.type !== "role" || !confirm.nextRole) return;
    await updateRole(confirm.member.userId, confirm.nextRole);
    setConfirm(null);
  }, [confirm, updateRole]);

  const handleRevoke = useCallback(
    async (inviteId: string) => {
      await revokeInvite(inviteId);
    },
    [revokeInvite],
  );

  return (
    <>
      <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>

        {/* ---- Invite form ---- */}
        {caps.canInvite && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
            <div className="relative flex-1">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Email address"
                className="w-full rounded-lg border border-[var(--line)] pl-9 pr-3 py-2 text-sm bg-transparent
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div className="relative">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                className="appearance-none rounded-lg border border-[var(--line)] px-3 py-2 pr-8 text-sm bg-transparent
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={!email.trim() || loading}
              className="inline-flex items-center justify-center gap-1.5
                         bg-[#111827] dark:bg-white text-white dark:text-[#111827]
                         rounded-lg px-4 py-2 text-sm font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:opacity-90 transition-opacity"
            >
              <UserPlus size={14} />
              Invite
            </button>
          </div>
        )}

        {/* ---- Member list ---- */}
        <div className="space-y-1">
          {sortedMembers.map((m) => {
            const isMe = m.userId === myUserId;
            const isOwner = m.role === "owner";
            const showActions = canManage && !isMe && !isOwner;

            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5
                           hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <Avatar name={m.name ?? m.email} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {m.name ?? m.email ?? "Unknown"}
                    </span>
                    {isMe && (
                      <span className="flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        You
                      </span>
                    )}
                  </div>
                  {m.email && m.name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {m.email}
                    </div>
                  )}
                </div>

                {/* Role badge */}
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ROLE_BADGE[m.role]}`}
                >
                  {m.role}
                </span>

                {/* Actions */}
                {showActions ? (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === m.userId ? null : m.userId)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg
                                 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      aria-label="Member actions"
                    >
                      <MoreHorizontal size={16} className="text-gray-400" />
                    </button>

                    {menuOpen === m.userId && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-50 w-44
                                        bg-white dark:bg-[#1b1b1b] border border-[var(--line)]
                                        rounded-lg shadow-lg py-1">
                          {/* Role change options */}
                          {caps.canChangeRole && (
                            <>
                              {(["admin", "member", "viewer"] as const)
                                .filter((r) => r !== m.role)
                                .map((r) => (
                                  <button
                                    key={r}
                                    onClick={() => {
                                      setMenuOpen(null);
                                      setConfirm({ type: "role", member: m, nextRole: r });
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm
                                               hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                                  >
                                    <ShieldCheck size={14} className="text-gray-400" />
                                    Set as {r}
                                  </button>
                                ))}
                              <div className="my-1 border-t border-[var(--line)]" />
                            </>
                          )}
                          {/* Remove */}
                          {caps.canRemoveMember && (
                            <button
                              onClick={() => {
                                setMenuOpen(null);
                                setConfirm({ type: "remove", member: m });
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600
                                         hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                              <Trash2 size={14} />
                              Remove member
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Spacer to align rows consistently */
                  <div className="w-8 flex-shrink-0" />
                )}
              </div>
            );
          })}

          {members.length === 0 && !loading && (
            <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
              No members yet.
            </div>
          )}
        </div>

        {/* ---- Pending invites ---- */}
        {pendingInvites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <Clock size={14} />
              Pending Invites ({pendingInvites.length})
            </h3>
            <div className="space-y-1">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 border border-dashed border-[var(--line)]"
                >
                  <Avatar name={inv.email} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{inv.email}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending
                    }`}
                  >
                    {inv.status.replace("_", " ")}
                  </span>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      ROLE_BADGE[inv.role] ?? ROLE_BADGE.member
                    }`}
                  >
                    {inv.role}
                  </span>
                  {caps.canInvite && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      disabled={loading}
                      className="flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg
                                 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors
                                 disabled:opacity-50"
                      aria-label="Revoke invite"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state overlay */}
        {loading && members.length === 0 && (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  <div className="h-3 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Confirmation modal ---- */}
      {confirm?.type === "remove" && (
        <ConfirmModal
          title="Remove Member"
          message={`Are you sure you want to remove ${confirm.member.name ?? confirm.member.email ?? "this member"} from the workspace? This action cannot be undone.`}
          confirmLabel="Remove"
          danger
          loading={loading}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "role" && confirm.nextRole && (
        <ConfirmModal
          title="Change Role"
          message={`Change ${confirm.member.name ?? confirm.member.email ?? "this member"}'s role to ${confirm.nextRole}?`}
          confirmLabel="Change Role"
          loading={loading}
          onConfirm={handleRoleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
