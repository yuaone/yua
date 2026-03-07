"use client";

import { useCallback, useState } from "react";
import { X, Brain, FolderPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createProject, isPlanError } from "@/lib/api/project";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSafePush } from "@/lib/router/safePush";
import { useBillingGuard } from "@/hooks/useBillingGuard";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const push = useSafePush();
  const { status, authFetch } = useAuth();
  const { loadProjects } = useSidebarData();
  const { setActiveContext } = useSidebarStore();
  const { tier } = useBillingGuard();

  const [name, setName] = useState("");
  const [useMemory, setUseMemory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = tier === "pro" || tier === "business" || tier === "enterprise";

  const handleCreate = useCallback(async () => {
    if (status !== "authed" || !authFetch) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("프로젝트 이름을 입력해주세요");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const p = await createProject(authFetch, trimmed, {
        useMemory: isPro ? useMemory : false,
      });
      await loadProjects();
      setActiveContext(p.id, null);
      onClose();
      setName("");
      setUseMemory(false);
      push(`/project/${p.id}`);
    } catch (e) {
      if (isPlanError(e)) {
        setError("현재 플랜에서는 프로젝트 생성이 제한되어 있어요.");
        return;
      }
      setError("생성에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setCreating(false);
    }
  }, [status, authFetch, name, useMemory, isPro, loadProjects, setActiveContext, onClose, push]);

  const handleClose = () => {
    if (creating) return;
    onClose();
    setName("");
    setUseMemory(false);
    setError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--surface-panel, #fff)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 transition hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--wash)" }}
          >
            <FolderPlus size={20} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              새 프로젝트
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              프로젝트를 만들고 대화를 정리하세요
            </p>
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            프로젝트 이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") handleClose();
            }}
            placeholder="예: 웹앱 리뉴얼, 마케팅 전략"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
            style={{
              background: "var(--wash)",
              border: "1px solid var(--line)",
              color: "var(--text-primary)",
            }}
            disabled={creating}
            autoFocus
          />
        </div>

        {/* Memory Toggle Card */}
        <div
          className="mb-5 rounded-xl p-4 transition"
          style={{
            background: useMemory ? "var(--sb-active-bg, rgba(0,0,0,0.05))" : "var(--wash)",
            border: `1px solid ${useMemory ? "var(--sb-active-ink, #333)" : "var(--line)"}`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Brain
                size={18}
                style={{
                  color: useMemory
                    ? "var(--sb-active-ink, #333)"
                    : "var(--text-muted)",
                }}
              />
              <div className="min-w-0">
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  프로젝트 메모리
                </div>
                <div
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isPro
                    ? "대화 내용을 학습하여 프로젝트 맥락을 유지합니다"
                    : "Pro 플랜부터 사용 가능합니다"}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={useMemory}
              disabled={!isPro}
              onClick={() => setUseMemory((v) => !v)}
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: useMemory
                  ? "var(--sb-active-ink, #333)"
                  : "var(--line)",
              }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: useMemory ? "translateX(22px)" : "translateX(3px)",
                }}
              />
            </button>
          </div>

          {useMemory && isPro && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
              style={{
                background: "var(--surface-main, rgba(255,255,255,0.5))",
                color: "var(--text-secondary)",
              }}
            >
              YUA가 이 프로젝트의 대화에서 중요한 정보를 자동으로 기억하고, 다음 대화에 활용합니다.
              메모리는 설정에서 언제든 관리할 수 있어요.
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{
              background: "var(--wash)",
              color: "var(--text-secondary)",
              border: "1px solid var(--line)",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--text-primary, #111)",
              color: "var(--surface-main, #fff)",
            }}
          >
            {creating ? "생성 중..." : "프로젝트 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
