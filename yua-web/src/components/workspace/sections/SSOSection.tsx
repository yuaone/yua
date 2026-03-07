"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Plus, Trash2, X } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import Toggle from "../Toggle";
import type { SsoProvider } from "../types";

/* ─────────────────────────────────────────────
   Provider display name map
───────────────────────────────────────────── */
const PROVIDER_LABELS: Record<string, string> = {
  okta: "Okta",
  azure_ad: "Azure AD",
  google_workspace: "Google Workspace",
};

/* ─────────────────────────────────────────────
   SSOSection
───────────────────────────────────────────── */
export default function SSOSection() {
  const { isEnterprise, authFetch, showToast } = useWorkspaceCtx();

  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form
  const [newProvider, setNewProvider] = useState("okta");
  const [newDomain, setNewDomain] = useState("");

  /* ── Load ────────────────────────────────── */
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/sso");
      const data = await res.json();
      if (data?.ok) {
        setProviders(data.providers ?? []);
      }
    } catch {
      showToast("Failed to load SSO providers.", "error");
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    if (isEnterprise) loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnterprise]);

  /* ── Connect ─────────────────────────────── */
  const handleConnect = async () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/workspace/sso/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: newProvider, domain: d }),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast("SSO provider connected.", "ok");
        setNewDomain("");
        await loadProviders();
      } else {
        showToast(data?.error ?? "Failed to connect SSO provider.", "error");
      }
    } catch {
      showToast("Failed to connect SSO provider.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Toggle enabled ──────────────────────── */
  const handleToggle = async (id: string, enabled: boolean) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/workspace/sso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data?.ok) {
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? { ...p, enabled } : p)),
        );
        showToast(
          enabled ? "SSO provider enabled." : "SSO provider disabled.",
          "ok",
        );
      } else {
        showToast(data?.error ?? "Failed to update SSO provider.", "error");
      }
    } catch {
      showToast("Failed to update SSO provider.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ──────────────────────────────── */
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/workspace/sso/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.ok) {
        setProviders((prev) => prev.filter((p) => p.id !== id));
        showToast("SSO provider removed.", "ok");
      } else {
        showToast(data?.error ?? "Failed to remove SSO provider.", "error");
      }
    } catch {
      showToast("Failed to remove SSO provider.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Gate ─────────────────────────────────── */
  if (!isEnterprise) {
    return (
      <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Shield size={18} /> SSO Settings
        </h2>
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
          <Shield size={32} className="mb-2 opacity-40" />
          <p className="text-sm">
            SSO settings are available on the Enterprise plan.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────── */
  return (
    <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Shield size={18} /> SSO Settings
      </h2>

      {/* Connect form */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
          Connect a provider
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value)}
            disabled={loading}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="okta">Okta</option>
            <option value="azure_ad">Azure AD</option>
            <option value="google_workspace">Google Workspace</option>
          </select>
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="company.com"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnect();
            }}
            className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !newDomain.trim()}
            className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5 justify-center"
          >
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      {/* Provider list */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
          Connected providers
        </p>

        {loading && providers.length === 0 ? (
          <div className="space-y-2">
            <div className="h-14 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
            <div className="h-14 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <Shield size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No SSO providers connected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white dark:bg-[#1b1b1b] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {PROVIDER_LABELS[p.provider] ?? p.provider}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {p.domain} &middot;{" "}
                    {p.enabled ? (
                      <span className="text-green-600 dark:text-green-400">
                        Enabled
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Disabled</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Toggle
                      checked={p.enabled}
                      onChange={(v) => handleToggle(p.id, v)}
                      disabled={loading}
                    />
                    {p.enabled ? "On" : "Off"}
                  </label>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={loading}
                    className="text-red-500 hover:text-red-600 transition p-1 disabled:opacity-50"
                    title="Remove provider"
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
