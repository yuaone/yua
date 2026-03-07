"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Users, Crown, Sparkles, Building2, Shield, Save } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import type { Tier } from "../types";

/* ========================================
   Tier badge config
======================================== */

const TIER_CONFIG: Record<Tier, { label: string; color: string; icon: typeof Crown }> = {
  free: {
    label: "Free",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Users,
  },
  pro: {
    label: "Pro",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    icon: Crown,
  },
  business: {
    label: "Business",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    icon: Building2,
  },
  enterprise: {
    label: "Enterprise",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    icon: Shield,
  },
};

/* ========================================
   GeneralSection
======================================== */

export default function GeneralSection() {
  const {
    tier,
    myRole,
    workspaceName,
    workspaceId,
    members,
    loading,
    authFetch,
    showToast,
  } = useWorkspaceCtx();

  const [name, setName] = useState(workspaceName);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const canEdit = myRole === "owner" || myRole === "admin";
  const isDirty = name.trim() !== workspaceName;

  // Sync when workspaceName changes externally
  useEffect(() => {
    setName(workspaceName);
  }, [workspaceName]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspaceName) return;

    setSaving(true);
    try {
      // TODO: PATCH /api/workspace endpoint may not exist yet.
      // When the backend is ready, this call will update the workspace name.
      const res = await authFetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast("Workspace name updated.", "ok");
      } else {
        showToast(data?.error ?? "Failed to update workspace name.", "error");
      }
    } catch {
      showToast("Failed to update workspace name.", "error");
    } finally {
      setSaving(false);
    }
  }, [name, workspaceName, authFetch, showToast]);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(workspaceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may not be available
    }
  }, [workspaceId]);

  const tierCfg = TIER_CONFIG[tier];
  const TierIcon = tierCfg.icon;

  return (
    <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">General</h2>

      {/* Workspace name */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="ws-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Workspace Name
          </label>
          <div className="flex items-center gap-2">
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || loading}
              placeholder="My Workspace"
              className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={!isDirty || saving || loading}
                className="inline-flex items-center gap-1.5
                           bg-[#111827] dark:bg-white text-white dark:text-[#111827]
                           rounded-lg px-4 py-2 text-sm font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:opacity-90 transition-opacity"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Tier + member count row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tier badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tierCfg.color}`}
          >
            <TierIcon size={13} />
            {tierCfg.label}
          </div>

          {/* Member count */}
          <div className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Users size={14} />
            {members.length} member{members.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Workspace ID */}
        <div>
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Workspace ID
          </span>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-[var(--line)] bg-gray-50 dark:bg-[#141414] px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono truncate select-all">
              {workspaceId}
            </code>
            <button
              onClick={handleCopyId}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)]
                         hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Copy workspace ID"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
