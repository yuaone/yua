"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Plus, Trash2, X } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import Toggle from "../Toggle";
import type { DomainItem } from "../types";

/* ─────────────────────────────────────────────
   DomainSection
───────────────────────────────────────────── */
export default function DomainSection() {
  const { isBusiness, authFetch, showToast } = useWorkspaceCtx();

  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form state
  const [newDomain, setNewDomain] = useState("");
  const [newAutoJoin, setNewAutoJoin] = useState(true);
  const [newRequiresApproval, setNewRequiresApproval] = useState(false);

  /* ── Load ────────────────────────────────── */
  const loadDomains = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/domains");
      const data = await res.json();
      if (data?.ok) {
        setDomains(data.domains ?? []);
      }
    } catch {
      showToast("Failed to load domains.", "error");
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    if (isBusiness) loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness]);

  /* ── Add ─────────────────────────────────── */
  const handleAdd = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: d,
          autoJoin: newAutoJoin,
          requiresApproval: newRequiresApproval,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast("Domain added.", "ok");
        setNewDomain("");
        await loadDomains();
      } else {
        showToast(data?.error ?? "Failed to add domain.", "error");
      }
    } catch {
      showToast("Failed to add domain.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Update toggles ─────────────────────── */
  const handleUpdate = async (
    id: string,
    autoJoin: boolean,
    requiresApproval: boolean,
  ) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/workspace/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoJoin, requiresApproval }),
      });
      const data = await res.json();
      if (data?.ok) {
        setDomains((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, autoJoin, requiresApproval } : item,
          ),
        );
        showToast("Domain updated.", "ok");
      } else {
        showToast(data?.error ?? "Failed to update domain.", "error");
      }
    } catch {
      showToast("Failed to update domain.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ──────────────────────────────── */
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/workspace/domains/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.ok) {
        setDomains((prev) => prev.filter((item) => item.id !== id));
        showToast("Domain removed.", "ok");
      } else {
        showToast(data?.error ?? "Failed to remove domain.", "error");
      }
    } catch {
      showToast("Failed to remove domain.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Gate ─────────────────────────────────── */
  if (!isBusiness) {
    return (
      <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Globe size={18} /> Domain Settings
        </h2>
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
          <Globe size={32} className="mb-2 opacity-40" />
          <p className="text-sm">
            Domain settings are available on Business and Enterprise plans.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Globe size={18} /> Domain Settings
      </h2>

      {/* Add form */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
          Add a domain
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newDomain.trim()}
            className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 justify-center"
          >
            <Plus size={14} /> Add Domain
          </button>
        </div>

        <div className="flex items-center gap-5 text-sm text-[var(--text-secondary)]">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <Toggle
              checked={newAutoJoin}
              onChange={setNewAutoJoin}
              disabled={loading}
            />
            Auto Join
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <Toggle
              checked={newRequiresApproval}
              onChange={setNewRequiresApproval}
              disabled={loading}
            />
            Requires Approval
          </label>
        </div>
      </div>

      {/* Domain list */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
          Current domains
        </p>

        {loading && domains.length === 0 ? (
          <div className="space-y-2">
            <div className="h-14 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
            <div className="h-14 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <Globe size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No domains registered yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white dark:bg-[#1b1b1b] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {d.domain}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Added {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Toggle
                      checked={d.autoJoin}
                      onChange={(v) => handleUpdate(d.id, v, d.requiresApproval)}
                      disabled={loading}
                    />
                    Auto Join
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Toggle
                      checked={d.requiresApproval}
                      onChange={(v) => handleUpdate(d.id, d.autoJoin, v)}
                      disabled={loading}
                    />
                    Approval
                  </label>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={loading}
                    className="text-red-500 hover:text-red-600 transition p-1 disabled:opacity-50"
                    title="Delete domain"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
