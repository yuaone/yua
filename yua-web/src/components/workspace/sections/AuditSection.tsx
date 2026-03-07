"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useWorkspaceCtx } from "../WorkspaceContext";
import type { AuditItem } from "../types";

/* ─────────────────────────────────────────────
   Method badge color
───────────────────────────────────────────── */
function methodColor(method?: string): string {
  switch (method?.toUpperCase()) {
    case "GET":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "POST":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "PATCH":
    case "PUT":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-[#f9fafb] text-[var(--text-muted)] dark:bg-white/5";
  }
}

/* ─────────────────────────────────────────────
   AuditSection
───────────────────────────────────────────── */
export default function AuditSection() {
  const { authFetch, showToast, workspaceId } = useWorkspaceCtx();

  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Search ──────────────────────────────── */
  const doSearch = useCallback(
    async (q: string) => {
      // Cancel in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await authFetch("/api/audit/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, workspaceId }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data?.ok) {
          setItems(data.items ?? []);
        } else {
          setItems([]);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        showToast("Failed to search audit logs.", "error");
      } finally {
        setLoading(false);
      }
    },
    [authFetch, showToast, workspaceId],
  );

  // Load on mount
  useEffect(() => {
    doSearch("");
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  /* ── Render ──────────────────────────────── */
  return (
    <div className="bg-white dark:bg-[#1b1b1b] border border-[var(--line)] rounded-xl p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <FileText size={18} /> Audit Log
      </h2>

      {/* Search input */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search audit logs..."
          className="w-full rounded-lg border border-[var(--line)] pl-9 pr-3 py-2 text-sm bg-transparent outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[var(--line)] border-t-[#111827] dark:border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          <div className="h-16 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
          <div className="h-16 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
          <div className="h-16 rounded-lg bg-[#f9fafb] dark:bg-white/5 animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
          <FileText size={32} className="mb-2 opacity-40" />
          <p className="text-sm">
            {query
              ? "No audit entries match your search."
              : "No audit entries yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--line)] px-4 py-3 hover:bg-[#f9fafb] dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Action text */}
                  <p className="text-sm text-[var(--text-primary)] break-words">
                    {item.meta?.text ?? "Action performed"}
                  </p>

                  {/* Meta line */}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {item.meta?.method && (
                      <span
                        className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${methodColor(item.meta.method)}`}
                      >
                        {item.meta.method.toUpperCase()}
                      </span>
                    )}
                    {item.meta?.route && (
                      <span className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[240px]">
                        {item.meta.route}
                      </span>
                    )}
                    {item.meta?.userId != null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        User #{item.meta.userId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-right">
                  {item.meta?.updatedAt && (
                    <p className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(item.meta.updatedAt).toLocaleString()}
                    </p>
                  )}
                  {item.score != null && item.score !== 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      score: {item.score.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
