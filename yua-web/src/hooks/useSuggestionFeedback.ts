// hooks/useSuggestionFeedback.ts
"use client";

/**
 * YUA Suggestion Feedback Hook — SSOT FINAL
 * ----------------------------------------
 * ✔ UI-level telemetry only
 * ✔ optimistic + duplicate prevention
 * ✔ no global store pollution
 * ✔ streaming-safe
 * ✔ failure-tolerant (telemetry)
 */

import { useCallback, useRef, useState } from "react";

type FeedbackAction = "UP" | "DOWN";

type SendFeedbackPayload = {
  threadId: number;
  traceId: string;
  suggestionId: string;
  action: FeedbackAction;
};

type FeedbackState = {
  sent: boolean;
  action?: FeedbackAction;
  error?: boolean;
};

export function useSuggestionFeedback() {
  /**
   * 🔒 Local UI state
   * - message/suggestion 단위로만 사용
   * - global store ❌
   */
  const [state, setState] = useState<FeedbackState>({
    sent: false,
  });

  /**
   * 🔒 Hard lock (double click / race 방지)
   */
  const sendingRef = useRef(false);

  /* =========================
     Internal: send API
  ========================= */
  const sendFeedback = useCallback(
    async (payload: SendFeedbackPayload) => {
       await fetch("/api/telemetry/suggestion/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    []
  );

  /* =========================
     Public: submit
     - optimistic
     - duplicate safe
  ========================= */
  const submit = useCallback(
    async (payload: SendFeedbackPayload) => {
      // 🚫 중복 클릭 / 이미 보냄
      if (state.sent) return;
      if (sendingRef.current) return;

      sendingRef.current = true;

      // 🔥 optimistic UI lock
      setState({
        sent: true,
        action: payload.action,
      });

      try {
        await sendFeedback(payload);
      } catch (e) {
        console.error("[SUGGESTION_FEEDBACK][FAILED]", e);

        // ❗ telemetry 실패는 UI rollback 안 함
        setState((prev) => ({
          ...prev,
          error: true,
        }));
      } finally {
        sendingRef.current = false;
      }
    },
    [state.sent, sendFeedback]
  );

  /* =========================
     Helpers (UI)
  ========================= */

  const isLocked = state.sent;
  const isUp = state.action === "UP";
  const isDown = state.action === "DOWN";

  return {
    submit,

    // UI helpers
    isLocked,
    isUp,
    isDown,
    state,
  };
}
