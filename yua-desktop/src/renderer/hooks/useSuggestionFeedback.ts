/**
 * YUA Suggestion Feedback Hook — Desktop Port
 * ----------------------------------------
 * UI-level telemetry only, optimistic + duplicate prevention
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
  const [state, setState] = useState<FeedbackState>({
    sent: false,
  });

  const sendingRef = useRef(false);

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

  const submit = useCallback(
    async (payload: SendFeedbackPayload) => {
      if (state.sent) return;
      if (sendingRef.current) return;

      sendingRef.current = true;

      setState({
        sent: true,
        action: payload.action,
      });

      try {
        await sendFeedback(payload);
      } catch (e) {
        console.error("[SUGGESTION_FEEDBACK][FAILED]", e);
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

  const isLocked = state.sent;
  const isUp = state.action === "UP";
  const isDown = state.action === "DOWN";

  return {
    submit,
    isLocked,
    isUp,
    isDown,
    state,
  };
}
