"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMemoryDrawer } from "@/store/useMemoryDrawer";
import type { MemoryScope } from "yua-shared/memory/types";

const SCOPE_CONFIG: Record<MemoryScope, { label: string; bg: string; text: string }> = {
  user_profile:         { label: "프로필",       bg: "rgba(59,130,246,0.10)",  text: "#3b82f6" },
  user_preference:      { label: "선호 설정",    bg: "rgba(168,85,247,0.10)", text: "#a855f7" },
  user_research:        { label: "리서치",       bg: "rgba(245,158,11,0.10)", text: "#f59e0b" },
  project_architecture: { label: "프로젝트 구조", bg: "rgba(16,185,129,0.10)", text: "#10b981" },
  project_decision:     { label: "결정사항",      bg: "rgba(244,63,94,0.10)",  text: "#f43f5e" },
  general_knowledge:    { label: "일반 지식",     bg: "rgba(100,116,139,0.10)", text: "#64748b" },
};

interface MemoryItem {
  id: number;
  content: string;
  scope: MemoryScope;
  confidence?: number;
  locked?: boolean;
  updated_at?: string;
}

export function MemoryDrawer() {
  const { authFetch } = useAuth();
  const {
    open,
    scope,
    loading,
    closeDrawer,
    setScope,
    setLoading,
  } = useMemoryDrawer();

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authFetch) return;
    let aborted = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(`/api/memory/list?scope=${scope}&limit=30`);
        if (!res.ok) throw new Error("MEMORY_FETCH_FAILED");

        const data = await res.json();
        if (!data?.ok || !Array.isArray(data.memories)) {
          throw new Error("INVALID_MEMORY_RESPONSE");
        }

        if (!aborted) setItems(data.memories);
      } catch {
        if (!aborted) {
          setError("메모리를 불러오지 못했어요");
          setItems([]);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => { aborted = true; };
  }, [open, scope, authFetch, setLoading]);

  if (!open) return null;

  const allScopes: MemoryScope[] = [
    "general_knowledge",
    "user_profile",
    "user_preference",
    "user_research",
    "project_architecture",
    "project_decision",
  ];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={closeDrawer} />

      <aside
        className="w-[360px] max-sm:w-full h-full shadow-xl flex flex-col"
        style={{
          background: "var(--surface-panel, #fff)",
          borderLeft: "1px solid var(--line)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2
            className="text-[16px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            메모리
          </h2>
          <button
            onClick={closeDrawer}
            className="h-8 w-8 rounded-full flex items-center justify-center transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scope Chips */}
        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide">
          {allScopes.map((s) => {
            const cfg = SCOPE_CONFIG[s];
            const active = scope === s;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                style={{
                  background: active ? cfg.bg : "var(--wash)",
                  color: active ? cfg.text : "var(--text-secondary)",
                  border: `1px solid ${active ? cfg.text + "33" : "var(--line)"}`,
                }}
                aria-label={`${cfg.label} 필터`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              불러오는 중...
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div
              className="flex flex-col items-center gap-2 rounded-xl p-8 text-center"
              style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
            >
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                저장된 메모리가 없습니다
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                대화를 하면 YUA가 자동으로 중요한 정보를 기억합니다.
              </div>
            </div>
          )}

          {!loading &&
            items.map((m) => {
              const cfg = SCOPE_CONFIG[m.scope] ?? SCOPE_CONFIG.general_knowledge;
              return (
                <div
                  key={m.id}
                  className="rounded-lg p-3 transition-colors"
                  style={{
                    background: "var(--wash)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: cfg.bg, color: cfg.text }}
                    >
                      {cfg.label}
                    </span>
                    {m.locked && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        🔒
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {m.content}
                  </div>
                  {typeof m.confidence === "number" && (
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="h-1 w-16 rounded-full overflow-hidden"
                        style={{ background: "var(--line)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${m.confidence * 100}%`,
                            background:
                              m.confidence >= 0.7
                                ? "#22c55e"
                                : m.confidence >= 0.4
                                ? "#eab308"
                                : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {(m.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </aside>
    </div>
  );
}
