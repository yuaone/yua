"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import {
  fetchMemorySummary,
  fetchMemoryList,
  updateMemory,
  deleteMemory,
  type MemoryRecord,
  type MemorySummary,
} from "@/lib/api/memory";

/* =========================
   Scope display config
========================= */
const SCOPE_LABELS: Record<string, { label: string; icon: string }> = {
  user_profile: { label: "프로필", icon: "\u{1F464}" },
  user_preference: { label: "선호 설정", icon: "\u{2699}\u{FE0F}" },
  user_research: { label: "리서치", icon: "\u{1F52C}" },
  project_architecture: { label: "프로젝트 구조", icon: "\u{1F3D7}\u{FE0F}" },
  project_decision: { label: "결정사항", icon: "\u{1F4CB}" },
  general_knowledge: { label: "일반 지식", icon: "\u{1F4DA}" },
};

function getScopeDisplay(scope: string) {
  return (
    SCOPE_LABELS[scope] ?? {
      label: scope.replace(/_/g, " "),
      icon: "\u{1F4C4}",
    }
  );
}

/* =========================
   Confidence helpers
========================= */
function confidenceColor(c: number): string {
  if (c >= 0.7) return "var(--confidence-high, #22c55e)";
  if (c >= 0.4) return "var(--confidence-mid, #eab308)";
  return "var(--confidence-low, #ef4444)";
}

function confidenceLabel(c: number): string {
  if (c >= 0.7) return "높음";
  if (c >= 0.4) return "보통";
  return "낮음";
}

/* =========================
   Time formatter
========================= */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

/* =========================
   MemoryPanel
========================= */
export default function MemoryPanel() {
  const { authFetch } = useAuth();

  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [memoriesByScope, setMemoriesByScope] = useState<
    Record<string, MemoryRecord[]>
  >({});
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set());
  const [loadingScopes, setLoadingScopes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* =========================
     Load summary
  ========================= */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMemorySummary(authFetch);
      setSummary(data);
    } catch {
      setError("메모리 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  /* =========================
     Toggle scope accordion
  ========================= */
  const toggleScope = useCallback(
    async (scope: string) => {
      const next = new Set(expandedScopes);
      if (next.has(scope)) {
        next.delete(scope);
        setExpandedScopes(next);
        return;
      }

      next.add(scope);
      setExpandedScopes(next);

      // Load memories for this scope if not cached
      if (!memoriesByScope[scope]) {
        setLoadingScopes((prev) => new Set(prev).add(scope));
        try {
          const list = await fetchMemoryList(authFetch, scope);
          setMemoriesByScope((prev) => ({ ...prev, [scope]: list }));
        } catch {
          // silent — scope will show empty
        } finally {
          setLoadingScopes((prev) => {
            const s = new Set(prev);
            s.delete(scope);
            return s;
          });
        }
      }
    },
    [expandedScopes, memoriesByScope, authFetch]
  );

  /* =========================
     Actions
  ========================= */
  const handleEdit = (mem: MemoryRecord) => {
    setEditingId(mem.id);
    setEditContent(mem.content);
  };

  const handleEditSave = async (mem: MemoryRecord) => {
    if (editContent.trim() === mem.content) {
      setEditingId(null);
      return;
    }
    try {
      await updateMemory(authFetch, mem.id, { content: editContent.trim() });
      // Update local state
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].map((m) =>
            m.id === mem.id ? { ...m, content: editContent.trim() } : m
          );
        }
        return updated;
      });
      setEditingId(null);
    } catch {
      // keep editing state on failure
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleToggleLock = async (mem: MemoryRecord) => {
    try {
      await updateMemory(authFetch, mem.id, { locked: !mem.locked });
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].map((m) =>
            m.id === mem.id ? { ...m, locked: !mem.locked } : m
          );
        }
        return updated;
      });
    } catch {
      // silent
    }
  };

  const handleDelete = async (mem: MemoryRecord) => {
    try {
      await deleteMemory(authFetch, mem.id);
      setMemoriesByScope((prev) => {
        const updated = { ...prev };
        for (const scope of Object.keys(updated)) {
          updated[scope] = updated[scope].filter((m) => m.id !== mem.id);
        }
        return updated;
      });
      setDeletingId(null);
      // Update summary counts
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scopes: prev.scopes.map((s) =>
            s.scope === mem.scope ? { ...s, count: Math.max(0, s.count - 1) } : s
          ),
        };
      });
    } catch {
      // silent
    }
  };

  /* =========================
     Loading skeleton
  ========================= */
  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded" style={{ background: "var(--line)" }} />
          <div className="h-4 w-full max-w-md animate-pulse rounded" style={{ background: "var(--wash)" }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-12 w-full animate-pulse rounded-lg" style={{ background: "var(--wash)" }} />
          </div>
        ))}
      </div>
    );
  }

  /* =========================
     Error state
  ========================= */
  if (error) {
    return (
      <div className="max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            메모리
          </h1>
        </header>
        <div
          className="flex flex-col items-center gap-4 rounded-xl p-8 text-center"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {error}
          </p>
          <button
            onClick={loadSummary}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-80"
            style={{
              background: "var(--sb-active-bg)",
              color: "var(--sb-active-ink)",
            }}
          >
            <RefreshCw size={14} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totalCount = summary?.scopes.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const lastUpdated = summary?.scopes
    .map((s) => s.last_updated)
    .filter(Boolean)
    .sort()
    .pop();

  /* =========================
     Render
  ========================= */
  return (
    <div className="max-w-2xl space-y-8">
      {/* ---- Header ---- */}
      <header>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            메모리
          </h1>
          <button
            onClick={() => {
              setMemoriesByScope({});
              loadSummary();
            }}
            className="rounded-md p-2 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          YUA가 대화에서 학습한 정보를 확인하고 관리할 수 있습니다.
        </p>

        {/* Summary stats */}
        <div
          className="mt-4 flex items-center gap-6 rounded-lg px-4 py-3 text-xs"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <div>
            <span style={{ color: "var(--text-muted)" }}>총 메모리</span>
            <span className="ml-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              {totalCount}개
            </span>
          </div>
          <div
            className="h-3 w-px"
            style={{ background: "var(--line)" }}
          />
          <div>
            <span style={{ color: "var(--text-muted)" }}>마지막 업데이트</span>
            <span className="ml-2 font-medium" style={{ color: "var(--text-primary)" }}>
              {lastUpdated ? relativeTime(lastUpdated) : "-"}
            </span>
          </div>
          <div
            className="h-3 w-px"
            style={{ background: "var(--line)" }}
          />
          <div>
            <span style={{ color: "var(--text-muted)" }}>스코프</span>
            <span className="ml-2 font-semibold" style={{ color: "var(--text-primary)" }}>
              {summary?.scopes.length ?? 0}개
            </span>
          </div>
        </div>
      </header>

      {/* ---- Empty state ---- */}
      {totalCount === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl p-10 text-center"
          style={{ background: "var(--wash)", border: "1px solid var(--line)" }}
        >
          <div className="text-3xl opacity-40">{"\u{1F9E0}"}</div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            저장된 메모리가 없습니다
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            대화를 하면 YUA가 자동으로 중요한 정보를 기억합니다.
          </p>
        </div>
      )}

      {/* ---- Scope groups ---- */}
      {summary?.scopes
        .filter((s) => s.count > 0)
        .map(({ scope, count, last_updated }) => {
          const { label, icon } = getScopeDisplay(scope);
          const isExpanded = expandedScopes.has(scope);
          const isLoading = loadingScopes.has(scope);
          const memories = memoriesByScope[scope] ?? [];

          return (
            <section key={scope}>
              {/* Scope header (accordion toggle) */}
              <button
                onClick={() => toggleScope(scope)}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition hover:opacity-80"
                style={{
                  background: "var(--wash)",
                  border: "1px solid var(--line)",
                  color: "var(--text-primary)",
                }}
              >
                <span className="text-base">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-normal"
                  style={{
                    background: "var(--line)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {count}
                </span>
                <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                  {relativeTime(last_updated)}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                ) : (
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-2 space-y-2 pl-2">
                  {isLoading && (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-20 w-full animate-pulse rounded-lg"
                          style={{ background: "var(--wash)" }}
                        />
                      ))}
                    </div>
                  )}

                  {!isLoading && memories.length === 0 && (
                    <div
                      className="rounded-lg px-4 py-6 text-center text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      이 스코프에 메모리가 없습니다.
                    </div>
                  )}

                  {!isLoading &&
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="rounded-lg p-3 transition"
                        style={{
                          background: "var(--wash)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {/* Content */}
                        {editingId === mem.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="w-full resize-none rounded-md px-3 py-2 text-sm outline-none"
                              style={{
                                background: "var(--card-bg)",
                                border: "1px solid var(--line)",
                                color: "var(--text-primary)",
                              }}
                            />
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleEditSave(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--confidence-high, #22c55e)" }}
                                title="저장"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--text-muted)" }}
                                title="취소"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {mem.content}
                          </p>
                        )}

                        {/* Meta row */}
                        {editingId !== mem.id && (
                          <div className="mt-2 flex items-center gap-3">
                            {/* Confidence bar */}
                            <div className="flex items-center gap-2">
                              <div
                                className="h-1 w-16 rounded-full overflow-hidden"
                                style={{ background: "var(--line)" }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.round(mem.confidence * 100)}%`,
                                    background: confidenceColor(mem.confidence),
                                  }}
                                />
                              </div>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {confidenceLabel(mem.confidence)} ({Math.round(mem.confidence * 100)}%)
                              </span>
                            </div>

                            <div className="flex-1" />

                            {/* Access info */}
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {mem.access_count > 0
                                ? `${mem.access_count}회 참조`
                                : "미참조"}
                            </span>

                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {relativeTime(mem.updated_at)}
                            </span>

                            {/* Action buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleToggleLock(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{
                                  color: mem.locked
                                    ? "var(--sb-active-ink)"
                                    : "var(--text-muted)",
                                }}
                                title={mem.locked ? "잠금 해제" : "잠금"}
                              >
                                {mem.locked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                              <button
                                onClick={() => handleEdit(mem)}
                                className="rounded-md p-1.5 transition hover:opacity-70"
                                style={{ color: "var(--text-muted)" }}
                                title="수정"
                              >
                                <Edit3 size={13} />
                              </button>

                              {deletingId === mem.id ? (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => handleDelete(mem)}
                                    className="rounded-md p-1.5 transition hover:opacity-70"
                                    style={{ color: "var(--confidence-low, #ef4444)" }}
                                    title="삭제 확인"
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="rounded-md p-1.5 transition hover:opacity-70"
                                    style={{ color: "var(--text-muted)" }}
                                    title="취소"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(mem.id)}
                                  className="rounded-md p-1.5 transition hover:opacity-70"
                                  style={{ color: "var(--text-muted)" }}
                                  title="삭제"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </section>
          );
        })}

      {/* ---- Cross-thread memories ---- */}
      {summary?.crossThreadMemories && summary.crossThreadMemories.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            크로스 스레드 메모리
          </h2>
          <div className="space-y-2">
            {summary.crossThreadMemories.map((ctm) => (
              <div
                key={ctm.id}
                className="rounded-lg p-3"
                style={{
                  background: "var(--wash)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: "var(--sb-active-bg)",
                      color: "var(--sb-active-ink)",
                    }}
                  >
                    {ctm.type}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {relativeTime(ctm.created_at)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {ctm.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Footer ---- */}
      <footer className="pt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        메모리는 대화 중 자동으로 업데이트됩니다. 잠금된 메모리는 자동 삭제되지 않습니다.
      </footer>
    </div>
  );
}
