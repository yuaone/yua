"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserMinus, Crown, X } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";

/* ─────────────────────────────────────────────
   Inline confirmation dialog
───────────────────────────────────────────── */
function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[#f9fafb] dark:hover:bg-white/5 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DangerSection
───────────────────────────────────────────── */
export default function DangerSection() {
  const {
    myRole,
    myUserId,
    members,
    leaveWorkspace,
    transferOwnership,
    loading: ctxLoading,
    showToast,
  } = useWorkspaceCtx();

  const router = useRouter();
  const isOwner = myRole === "owner";

  // Confirm states
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Transfer target
  const [transferTarget, setTransferTarget] = useState<number | null>(null);

  // Eligible transfer targets: all members except the owner
  const transferCandidates = members.filter(
    (m) => m.userId !== myUserId && m.role !== "viewer",
  );

  /* ── Leave ───────────────────────────────── */
  const handleLeave = async () => {
    setActionLoading(true);
    try {
      const nextWsId = await leaveWorkspace();
      if (nextWsId) {
        setShowLeaveConfirm(false);
        router.push("/chat");
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Transfer ────────────────────────────── */
  const handleTransfer = async () => {
    if (transferTarget == null) {
      showToast("Please select a member to transfer ownership to.", "warn");
      return;
    }
    setActionLoading(true);
    try {
      const ok = await transferOwnership(transferTarget);
      if (ok) {
        setShowTransferConfirm(false);
        setTransferTarget(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Render ──────────────────────────────── */
  return (
    <>
      <div className="bg-white dark:bg-[#1b1b1b] border-2 border-red-300 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} /> Danger Zone
        </h2>

        <div className="space-y-4">
          {/* ── Leave Workspace ───────────────── */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 dark:border-red-900/50 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <UserMinus size={16} className="text-red-500 shrink-0" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Leave Workspace
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Leave this workspace permanently. You will lose access to all
                workspace data and conversations.
              </p>
              {isOwner && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  You must transfer ownership before leaving.
                </p>
              )}
            </div>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              disabled={isOwner || ctxLoading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Leave
            </button>
          </div>

          {/* ── Transfer Ownership ───────────── */}
          {isOwner && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 dark:border-red-900/50 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={16} className="text-red-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Transfer Ownership
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Transfer workspace ownership to another member. You will be
                  demoted to admin after transfer.
                </p>

                {/* Target selection */}
                <div className="mt-3">
                  <select
                    value={transferTarget ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTransferTarget(v ? Number(v) : null);
                    }}
                    disabled={ctxLoading}
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-full sm:w-auto min-w-[200px]"
                  >
                    <option value="">Select a member...</option>
                    {transferCandidates.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name ?? m.email ?? `User #${m.userId}`} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  if (transferTarget == null) {
                    showToast(
                      "Please select a member to transfer ownership to.",
                      "warn",
                    );
                    return;
                  }
                  setShowTransferConfirm(true);
                }}
                disabled={ctxLoading || transferTarget == null}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Transfer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm: Leave */}
      {showLeaveConfirm && (
        <ConfirmDialog
          title="Leave Workspace"
          description="Are you sure you want to leave this workspace? This action cannot be undone. You will lose access to all workspace data immediately."
          confirmLabel="Leave Workspace"
          onConfirm={handleLeave}
          onCancel={() => setShowLeaveConfirm(false)}
          loading={actionLoading}
        />
      )}

      {/* Confirm: Transfer */}
      {showTransferConfirm && transferTarget != null && (
        <ConfirmDialog
          title="Transfer Ownership"
          description={`Are you sure you want to transfer ownership to ${
            transferCandidates.find((m) => m.userId === transferTarget)?.name ??
            transferCandidates.find((m) => m.userId === transferTarget)?.email ??
            `User #${transferTarget}`
          }? You will be demoted to admin. This action cannot be undone.`}
          confirmLabel="Transfer Ownership"
          onConfirm={handleTransfer}
          onCancel={() => setShowTransferConfirm(false)}
          loading={actionLoading}
        />
      )}
    </>
  );
}
