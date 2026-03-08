"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";
import PageHeader from "@/components/PageHeader";
import type { SupportKnowledgeEntry } from "yua-shared";

const CATEGORIES = ["general", "bug", "billing", "account", "feature"] as const;
const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  general: { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  bug: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  billing: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  account: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  feature: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
};

export default function KnowledgePage() {
  const [entries, setEntries] = useState<SupportKnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  // Editor state
  const [editing, setEditing] = useState<SupportKnowledgeEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: "general", question: "", answer: "" });
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async (p: number, category: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (category) params.set("category", category);

    const res = await adminFetch<{ entries: SupportKnowledgeEntry[]; total: number }>(
      `/admin/knowledge?${params}`
    );
    if (res.ok && res.data) {
      setEntries(res.data.entries);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries(page, catFilter);
  }, [page, catFilter, fetchEntries]);

  const handleCreate = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    const res = await adminFetch("/admin/knowledge", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setCreating(false);
      setForm({ category: "general", question: "", answer: "" });
      fetchEntries(page, catFilter);
    } else {
      alert(res.error ?? "생성 실패");
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await adminFetch(`/admin/knowledge/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        category: form.category,
        question: form.question,
        answer: form.answer,
      }),
    });
    if (res.ok) {
      setEditing(null);
      setForm({ category: "general", question: "", answer: "" });
      fetchEntries(page, catFilter);
    } else {
      alert(res.error ?? "수정 실패");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    const res = await adminFetch(`/admin/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchEntries(page, catFilter);
    } else {
      alert(res.error ?? "삭제 실패");
    }
  };

  const startEdit = (entry: SupportKnowledgeEntry) => {
    setEditing(entry);
    setCreating(false);
    setForm({ category: entry.category, question: entry.question, answer: entry.answer });
  };

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ category: "general", question: "", answer: "" });
  };

  const cancelForm = () => {
    setEditing(null);
    setCreating(false);
    setForm({ category: "general", question: "", answer: "" });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeader
        title="지식 베이스"
        actions={
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: "var(--btn-primary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            FAQ 추가
          </button>
        }
      />

      {/* Category Filter */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "var(--surface-panel)" }}>
        <button
          onClick={() => { setCatFilter(""); setPage(1); }}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: !catFilter ? "var(--surface-main)" : "transparent",
            color: !catFilter ? "var(--text-primary)" : "var(--text-muted)",
            boxShadow: !catFilter ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          전체
        </button>
        {CATEGORIES.map((c) => {
          const active = catFilter === c;
          const cc = CAT_COLORS[c];
          return (
            <button
              key={c}
              onClick={() => { setCatFilter(c); setPage(1); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: active ? "var(--surface-main)" : "transparent",
                color: active ? cc.color : "var(--text-muted)",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: cc.color }} />
              {c}
            </button>
          );
        })}
      </div>

      <div className="flex gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* Entry List */}
        <div className={`${creating || editing ? "flex-1 min-w-0" : "w-full"} flex flex-col`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="yua-admin-spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
              </svg>
              <span className="text-sm">등록된 FAQ가 없습니다</span>
              <button onClick={startCreate} className="text-xs font-medium mt-1" style={{ color: "var(--btn-primary)" }}>
                첫 FAQ를 추가해보세요
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 flex-1">
                {entries.map((entry) => {
                  const cc = CAT_COLORS[entry.category] ?? CAT_COLORS.general;
                  const isSelected = editing?.id === entry.id;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => startEdit(entry)}
                      className="group rounded-xl border px-4 py-3.5 cursor-pointer transition-all duration-150"
                      style={{
                        borderColor: isSelected ? "var(--text-muted)" : "var(--line)",
                        background: isSelected ? "var(--surface-panel)" : "var(--surface-main)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: cc.color, background: cc.bg }}
                            >
                              {entry.category}
                            </span>
                            {!entry.is_active && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                                비활성
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                            {entry.question}
                          </div>
                          <div className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
                            {entry.answer}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                          style={{ color: "var(--text-muted)" }}
                          title="삭제"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between mt-4 pt-4 border-t text-sm"
                  style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
                >
                  <span className="text-xs">{total.toLocaleString()}건</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: "var(--line)" }}
                    >
                      이전
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-30"
                      style={{ borderColor: "var(--line)" }}
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Editor Panel */}
        {(creating || editing) && (
          <div
            className="w-[440px] shrink-0 rounded-xl border overflow-hidden flex flex-col yua-admin-slide-in"
            style={{
              borderColor: "var(--line)",
              background: "var(--surface-panel)",
              maxHeight: "calc(100vh - 140px)",
            }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {creating ? "FAQ 추가" : "FAQ 수정"}
              </h3>
              <button
                onClick={cancelForm}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--line)]"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  카테고리
                </label>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((c) => {
                    const active = form.category === c;
                    const cc = CAT_COLORS[c];
                    return (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, category: c })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
                        style={{
                          borderColor: active ? cc.color + "60" : "var(--line)",
                          background: active ? cc.bg : "transparent",
                          color: active ? cc.color : "var(--text-muted)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cc.color }} />
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  질문
                </label>
                <input
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="자주 묻는 질문을 입력하세요"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface-main)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Answer */}
              <div>
                <label className="text-[11px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  답변
                </label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="답변 내용을 입력하세요"
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none"
                  style={{
                    borderColor: "var(--line)",
                    background: "var(--surface-main)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--line)" }}>
              <button
                onClick={cancelForm}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: "var(--line)", color: "var(--text-secondary)" }}
              >
                취소
              </button>
              <button
                onClick={creating ? handleCreate : handleUpdate}
                disabled={saving || !form.question.trim() || !form.answer.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "var(--btn-primary)" }}
              >
                {saving ? "저장 중..." : creating ? "추가" : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
