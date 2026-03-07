"use client";

import { useEffect } from "react";
import { useMemoryIndicator } from "@/store/useMemoryIndicator";
import { Brain, Check, AlertCircle } from "lucide-react";

export function MemoryIndicator() {
  const { state, message, reset } = useMemoryIndicator();

  useEffect(() => {
    if (state === "saved" || state === "failed") {
      const t = setTimeout(reset, 3000);
      return () => clearTimeout(t);
    }
  }, [state, reset]);

  if (state === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        state === "pending"
          ? "메모리 저장 중"
          : state === "saved"
          ? "메모리 저장됨"
          : "메모리 저장 실패"
      }
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm transition-all animate-[fadeIn_0.2s_ease]",
        state === "pending"
          ? "memory-indicator-pending"
          : "",
      ].join(" ")}
      style={{
        background:
          state === "pending"
            ? "var(--wash)"
            : state === "saved"
            ? "rgba(34,197,94,0.08)"
            : "rgba(239,68,68,0.08)",
        border: `1px solid ${
          state === "pending"
            ? "var(--line)"
            : state === "saved"
            ? "rgba(34,197,94,0.2)"
            : "rgba(239,68,68,0.2)"
        }`,
        color:
          state === "pending"
            ? "var(--text-secondary)"
            : state === "saved"
            ? "#22c55e"
            : "#ef4444",
      }}
    >
      {state === "pending" && <Brain size={12} className="animate-pulse" />}
      {state === "saved" && <Check size={12} />}
      {state === "failed" && <AlertCircle size={12} />}
      <span>
        {state === "pending" && "기억하는 중..."}
        {state === "saved" && (message ?? "기억했어요")}
        {state === "failed" && (message ?? "저장 실패")}
      </span>
    </div>
  );
}
