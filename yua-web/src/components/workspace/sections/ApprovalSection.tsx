"use client";

import { useCallback, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";

/* ========================================
   Role badge colors (same as TeamSection)
======================================== */

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  member: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  viewer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
};

/* ========================================
   ApprovalSection (business+ only)
======================================== */

export default function ApprovalSection() {
  const {
    isBusiness,
    caps,
    invites,
    loading,
    approveInvite,
    revokeInvite,
  } = useWorkspaceCtx();

  /* ----------------------------------------
     Filter: only pending_approval invites
  ---------------------------------------- */

  const pendingApprovals = useMemo(() => {
    return invites.filter((inv) => inv.status === "pending_approval");
  }, [invites]);

  /* ----------------------------------------
     Handlers
  ---------------------------------------- */

  const handleApprove = useCallback(
    async (id: string) => {
      await approveInvite(id);
    },
    [approveInvite],
  );

  const handleReject = useCallback(
    async (id: string) => {
      await revokeInvite(id);
    },
    [revokeInvite],
  );

  /* ----------------------------------------
     Gate: business+ only
  ---------------------------------------- */

  if (!isBusiness) {
    return (
      <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck size={18} />
          Approval Queue
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Lock size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Approval queue is available on Business and Enterprise plans.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Upgrade to review and approve join requests.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck size={18} />
          Approval Queue
        </h2>
        {pendingApprovals.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
            {pendingApprovals.length} pending
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && pendingApprovals.length === 0 ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-8 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : pendingApprovals.length > 0 ? (
        <div className="space-y-2">
          {pendingApprovals.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3
                         rounded-lg border border-[var(--line)] px-4 py-3
                         hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{inv.email}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      ROLE_BADGE[inv.role] ?? ROLE_BADGE.member
                    }`}
                  >
                    {inv.role}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Clock size={11} />
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Right: actions */}
              {caps.canApprove && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(inv.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5
                               bg-[#111827] dark:bg-white text-white dark:text-[#111827]
                               rounded-lg px-3 py-1.5 text-sm font-medium
                               disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(inv.id)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5
                               bg-red-600 text-white
                               rounded-lg px-3 py-1.5 text-sm font-medium
                               disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Inbox size={36} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No pending approvals
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            When users request to join via domain or invite link, they will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
