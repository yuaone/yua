"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useThemePreference } from "@/hooks/useThemePreference";

type PersonalizationResponse = {
  allowNameCall: boolean;
  allowPersonalTone: boolean;
  displayName?: string | null;
};

export default function Personalization() {
  const [allowNameCall, setAllowNameCall] = useState(false);
  const [allowPersonalTone, setAllowPersonalTone] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { authFetch } = useAuth();
  const { mode, setMode, resolvedMode } = useThemePreference();

  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  /* =========================
   * Load (SSOT)
   * ========================= */
  useEffect(() => {
    authFetch("/api/workspace/me/personalization")
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data: PersonalizationResponse) => {
        setAllowNameCall(Boolean(data.allowNameCall));
        setAllowPersonalTone(Boolean(data.allowPersonalTone));
        setDisplayName(data.displayName ?? "");
      })
      .catch(() => {
        // personalization은 best-effort → silent
      })
      .finally(() => setLoading(false));
  }, []);

  /* =========================
   * Auto Save (Debounced)
   * ========================= */
  useEffect(() => {
    if (loading || !dirty) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      save();
    }, 600);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [allowNameCall, allowPersonalTone, displayName]);

  /* =========================
   * Save
   * ========================= */
  async function save() {
    setSaving(true);
    setDirty(false);

    try {
      await authFetch("/api/workspace/me/personalization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowNameCall,
          allowPersonalTone,
          displayName: displayName.trim() || null,
        }),
      });
    } catch {
      // silent fail (SSOT)
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-16 w-full animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      {/* ================= Header ================= */}
      <header>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">개인 맞춤 설정</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
          YUA의 말투와 호칭 방식을 설정합니다.
          성능이나 답변 정확도에는 영향을 주지 않습니다.
        </p>
      </header>

      {/* ================= Name ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">이름</h2>

        <input
          type="text"
          value={displayName}
          placeholder="이름 또는 닉네임"
          onChange={(e) => {
            setDisplayName(e.target.value);
            setDirty(true);
          }}
          onBlur={() => setDirty(true)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-[#1f1f1f] dark:border-[var(--line)] text-gray-900 dark:text-[var(--text-primary)] chat-input-caret"
        />

        <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">
          이름을 입력하면 YUA가 대화 중 사용할 수 있습니다.
        </p>
      </section>

      {/* ================= Theme ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">테마</h2>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "light", label: "라이트" },
              { id: "dark", label: "다크" },
              { id: "system", label: "시스템" },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white dark:bg-white dark:text-black dark:border-[var(--line)]"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[var(--line)] dark:text-[var(--text-secondary)] dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">
          시스템 모드일 때 현재는{" "}
          <span className="font-medium text-gray-700 dark:text-[var(--text-primary)]">
            {resolvedMode === "dark" ? "다크" : "라이트"}
          </span>{" "}
          입니다.
        </p>
      </section>

      {/* ================= Name Call ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">호칭 방식</h2>

        <label className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm dark:border-[var(--line)]">
          <div>
            <p className="font-medium text-[var(--text-primary)]">이름으로 불러도 돼요</p>
            <p className="text-gray-500 dark:text-[var(--text-secondary)] text-xs mt-1">
              첫 응답에서는 적용되지 않을 수 있습니다.
            </p>
          </div>

          <input
            type="checkbox"
            checked={allowNameCall}
            onChange={(e) => {
              setAllowNameCall(e.target.checked);
              setDirty(true);
            }}
            className="h-4 w-4"
          />
        </label>
      </section>

      {/* ================= Tone ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">말투</h2>

        <label className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm dark:border-[var(--line)]">
          <div>
            <p className="font-medium text-[var(--text-primary)]">조금 더 개인적인 말투</p>
            <p className="text-gray-500 dark:text-[var(--text-secondary)] text-xs mt-1">
              친근한 표현을 더 자주 사용할 수 있습니다.
            </p>
          </div>

          <input
            type="checkbox"
            checked={allowPersonalTone}
            onChange={(e) => {
              setAllowPersonalTone(e.target.checked);
              setDirty(true);
            }}
            className="h-4 w-4"
          />
        </label>
      </section>

      {/* ================= Footer ================= */}
      <footer className="flex items-center justify-between pt-4 text-xs text-gray-400">
        <span>
          {saving ? "저장 중…" : "변경 사항은 자동으로 저장됩니다."}
        </span>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
        >
          완료
        </button>
      </footer>
    </div>
  );
}
