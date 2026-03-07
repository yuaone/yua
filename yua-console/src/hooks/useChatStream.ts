"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/store/useChatStore";
import { useMemoryIndicator } from "@/store/useMemoryIndicator";

// yua-shared (상대 경로)
import { StreamClient } from "../../../yua-shared/src/stream/stream-client";
import type { StreamPayload } from "../../../yua-shared/src/stream/types";

type SendPromptArgs = {
  threadId: number;
  content: string;
};

export function useChatStream() {
  const { authFetch, status } = useAuth();

  const {
    resetStreamState,
    addAssistantMessage,
    patchAssistant,
    finalizeAssistant,
    startStreaming,
  } = useChatStore();

  const {
    setPending: setMemoryPending,
    setSaved: setMemorySaved,
    setFailed: setMemoryFailed,
  } = useMemoryIndicator();

  const clientRef = useRef<StreamClient | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const readyCalledRef = useRef(false);
  
    const ensureAssistant = useCallback(() => {
    if (!assistantIdRef.current) {
      assistantIdRef.current = addAssistantMessage();
      setMemoryPending();
    }
  }, [addAssistantMessage, setMemoryPending]);

  /* ------------------------------
     STOP
  ------------------------------ */
  const stop = useCallback(() => {
  clientRef.current?.stop();
}, []);

  /* ------------------------------
     SEND PROMPT
  ------------------------------ */
  const sendPrompt = useCallback(
    async ({ threadId, content }: SendPromptArgs) => {
      if (status !== "authed" || !authFetch) return;
      if (!content.trim()) return;

      stop();
      startStreaming();

      readyCalledRef.current = false;

      clientRef.current = new StreamClient({
        authFetch,
        threadId,
        message: content,

        handlers: {
          /* ---------- READY ---------- */
          onReady() {
  // 🔒 READY 중복 가드 (절대 필수)
  if (readyCalledRef.current) return;
  readyCalledRef.current = true;

  console.log("[WEB][READY]");

  (async () => {
    await authFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        message: content,
        stream: true,
      }),
    });
  })();
},

          /* ---------- TOKEN ---------- */
          onToken(token: string) {
            ensureAssistant();
            if (!assistantIdRef.current) return;
            patchAssistant(assistantIdRef.current, token);
          },

          /* ---------- STAGE ---------- */
          onStage(stage: string, payload?: StreamPayload) {
            if (stage !== "system") {
               ensureAssistant();
            }
            if (payload?.topic === "memory.ack") {
              const narration = payload?.narration;

              if (typeof narration === "string") {
                setMemorySaved(narration);
              } else if (narration && typeof narration === "object") {
                // 🔒 SSOT: object narration → safe fallback only
                try {
                  setMemorySaved(
                    JSON.stringify(narration)
                  );
                } catch {
                  // 최후 방어: 아무 것도 저장하지 않음
                }
              }
            }  
          },

          /* ---------- DONE ---------- */
          onDone() {
            ensureAssistant();
            if (!assistantIdRef.current) return;
            finalizeAssistant(assistantIdRef.current);
            resetStreamState();
            clientRef.current = null;
          },

          /* ---------- ERROR ---------- */
          onError(error: unknown) {
            console.error("[WEB][STREAM][ERROR]", error);
            setMemoryFailed();
            resetStreamState();
            clientRef.current = null;
          },
        },
      });

      // SSE 연결 시작 (READY 대기)
      clientRef.current.start();
    },
    [
      status,
      authFetch,
      addAssistantMessage,
      patchAssistant,
      finalizeAssistant,
      startStreaming,
      resetStreamState,
      setMemoryPending,
      setMemorySaved,
      setMemoryFailed,
      stop,
      ensureAssistant,
    ]
  );

  return { sendPrompt, stop };
}
