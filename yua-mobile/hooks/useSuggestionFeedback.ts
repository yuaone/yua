"use client";

import { useCallback, useRef, useState } from "react";
import { useMobileChatStore } from "@/store/useMobileChatStore";

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");
function resolveApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/api/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/api${normalized}`;
}

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
  const [state, setState] = useState<FeedbackState>({ sent: false });
  const sendingRef = useRef(false);
  const { setFeedback } = useMobileChatStore();

  const sendFeedback = useCallback(async (payload: SendFeedbackPayload) => {
    await fetch(resolveApiUrl("/telemetry/suggestion/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, []);

  const submit = useCallback(
    async (payload: SendFeedbackPayload) => {
      if (state.sent) return;
      if (sendingRef.current) return;

      sendingRef.current = true;

      setState({
        sent: true,
        action: payload.action,
      });
      setFeedback(payload.suggestionId, payload.action);

      try {
        await sendFeedback(payload);
      } catch (error) {
        console.error("[SUGGESTION_FEEDBACK][FAILED]", error);
        setState((prev) => ({ ...prev, error: true }));
      } finally {
        sendingRef.current = false;
      }
    },
    [sendFeedback, setFeedback, state.sent]
  );

  return {
    submit,
    isLocked: state.sent,
    isUp: state.action === "UP",
    isDown: state.action === "DOWN",
    state,
  };
}
