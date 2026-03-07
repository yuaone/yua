"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link2,
  Copy,
  Check,
  RotateCw,
  Plus,
  ChevronDown,
  Lock,
  Calendar,
  Users,
  Tag,
} from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";

/* ========================================
   InviteLinksSection (business+ only)
======================================== */

export default function InviteLinksSection() {
  const {
    isBusiness,
    inviteLink,
    loading,
    caps,
    createInviteLink,
    rotateInviteLink,
  } = useWorkspaceCtx();

  // Options state
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync options when invite link loads/changes
  useEffect(() => {
    if (!inviteLink) return;
    setRole(inviteLink.role ?? "member");
    setMaxUses(inviteLink.maxUses != null ? String(inviteLink.maxUses) : "");
    setExpiresAt(
      inviteLink.expiresAt
        ? new Date(inviteLink.expiresAt).toISOString().slice(0, 10)
        : "",
    );
  }, [inviteLink?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup copy timer
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // Computed join URL
  const joinUrl = useMemo(() => {
    if (!inviteLink) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/${inviteLink.token}`;
  }, [inviteLink]);

  // Build options payload
  const buildOpts = useCallback(() => {
    return {
      role,
      maxUses: maxUses ? Number(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
    };
  }, [role, maxUses, expiresAt]);

  const handleCreate = useCallback(async () => {
    await createInviteLink(buildOpts());
  }, [createInviteLink, buildOpts]);

  const handleRotate = useCallback(async () => {
    await rotateInviteLink(buildOpts());
  }, [rotateInviteLink, buildOpts]);

  const handleCopy = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may not be available
    }
  }, [joinUrl]);

  /* ----------------------------------------
     Gate: business+ only
  ---------------------------------------- */

  if (!isBusiness) {
    return (
      <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link2 size={18} />
          Invite Links
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Lock size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Invite links are available on Business and Enterprise plans.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Upgrade your plan to share invite links with your team.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Link2 size={18} />
          Invite Links
        </h2>
        {inviteLink && caps.canInvite && (
          <button
            onClick={handleRotate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400
                       hover:text-gray-700 dark:hover:text-gray-200 transition-colors
                       disabled:opacity-50"
          >
            <RotateCw size={14} />
            Regenerate
          </button>
        )}
      </div>

      {/* ---- Options row ---- */}
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        {/* Role */}
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Tag size={12} />
            Assigned Role
          </span>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              disabled={loading}
              className="appearance-none w-full rounded-lg border border-[var(--line)] px-3 py-2 pr-8 text-sm bg-transparent
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40
                         disabled:opacity-50"
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
        </label>

        {/* Max uses */}
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Users size={12} />
            Max Uses
          </span>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
            disabled={loading}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40
                       disabled:opacity-50"
          />
        </label>

        {/* Expiry */}
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Calendar size={12} />
            Expires On
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40
                       disabled:opacity-50"
          />
        </label>
      </div>

      {/* ---- Link display or create button ---- */}
      {loading && !inviteLink ? (
        <div className="space-y-2">
          <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ) : inviteLink ? (
        <div className="space-y-3">
          {/* URL row */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={joinUrl}
              className="flex-1 rounded-lg border border-[var(--line)] bg-gray-50 dark:bg-[#141414]
                         px-3 py-2 text-sm font-mono text-gray-600 dark:text-gray-300 select-all"
            />
            <button
              onClick={handleCopy}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg
                         border border-[var(--line)] hover:bg-gray-100 dark:hover:bg-white/5
                         transition-colors"
              aria-label="Copy invite link"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Link metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Uses: {inviteLink.uses}
              {inviteLink.maxUses != null ? ` / ${inviteLink.maxUses}` : ""}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>
              {inviteLink.expiresAt
                ? `Expires: ${new Date(inviteLink.expiresAt).toLocaleDateString()}`
                : "No expiry"}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>Role: {inviteLink.role}</span>
          </div>
        </div>
      ) : (
        /* No link yet -> create button */
        caps.canInvite && (
          <button
            onClick={handleCreate}
            disabled={loading}
            className="inline-flex items-center gap-1.5
                       bg-[#111827] dark:bg-white text-white dark:text-[#111827]
                       rounded-lg px-4 py-2 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Create Invite Link
          </button>
        )
      )}
    </section>
  );
}
