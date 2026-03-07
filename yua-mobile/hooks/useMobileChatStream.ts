import { useCallback, useMemo, useRef, useState } from "react";

import { createMobileStreamClient } from "@/adapters/stream/createMobileStreamClient";
import { sendChatPrompt } from "@/lib/api/chat.api";
import { normalizeSuggestionPayload } from "@/lib/suggestion/normalizeSuggestionPayload";
import {
  createInitialStreamState,
  reduceStreamState,
  type StreamUIState,
  StreamUIStateKind,
} from "yua-shared/stream/stream-reducer";
import type { StreamClientHandlers, StreamEventKind, StreamPayload } from "yua-shared/stream/types";
import type { ActivityEventPayload } from "yua-shared/stream/activity";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import { setMobileStreamDoneReason } from "@/store/useMobileStreamSessionStore";

type StartMobileStreamArgs = {
  threadId: number;
  debug?: boolean;
};

type SendPromptArgs = {
  threadId: number;
  content: string;
  attachments?: AttachmentMeta[];
  thinkingProfile?: ThinkingProfile;
  debug?: boolean;
};

export function useMobileChatStream() {
  const [state, setState] = useState<StreamUIState>(() => createInitialStreamState());
  const [doneReason, setDoneReason] = useState<string | null>(null);
  const clientRef = useRef<ReturnType<typeof createMobileStreamClient> | null>(null);
  const pendingPromptRef = useRef<SendPromptArgs | null>(null);

  const applyEvent = useCallback((kind: StreamEventKind, payload?: StreamPayload) => {
    setState((prev) =>
      reduceStreamState(prev, {
        kind,
        payload,
        nowMs: Date.now(),
      })
    );
  }, []);

  const stopStream = useCallback(() => {
    try {
      clientRef.current?.stop();
    } catch {
      // no-op
    } finally {
      clientRef.current = null;
    }
  }, []);

  const startStream = useCallback(async ({ threadId, debug = false }: StartMobileStreamArgs) => {
    stopStream();
    setState(createInitialStreamState({ kind: StreamUIStateKind.CONNECTING, threadId }));

    const handlers: StreamClientHandlers = {
      onReady: async (payload?: StreamPayload) => {
        applyEvent("ready", payload);

        const pending = pendingPromptRef.current;
        if (!pending || pending.threadId !== threadId) return;

        try {
          await sendChatPrompt({
            threadId: pending.threadId,
            message: pending.content,
            attachments: pending.attachments ?? [],
            stream: true,
            thinkingProfile: pending.thinkingProfile,
          } as any);
          pendingPromptRef.current = null;
        } catch (error) {
          console.error("[MOBILE_STREAM][SEND_PROMPT_FAILED]", error);
          pendingPromptRef.current = null;
          stopStream();
        }
      },
      onToken: (token: string, payload?: StreamPayload) => applyEvent("token", { ...payload, token }),
      onStage: (_stage, payload) => applyEvent("stage", payload),
      onActivity: (activity: ActivityEventPayload, payload?: StreamPayload) =>
        applyEvent("activity", { ...payload, activity }),
      onReasoningBlock: (_block, payload) => applyEvent("reasoning_block", payload),
      onReasoningDone: () => applyEvent("reasoning_done"),
      onSuggestion: (payload) => {
        const normalized = normalizeSuggestionPayload(payload.suggestion);
        if (!normalized) return;
        applyEvent("suggestion", { ...payload, suggestion: normalized });
      },
      onFinal: (payload) => applyEvent("final", payload),
      onDone: (payload) => {
        const reason = (payload?.meta as { reason?: string } | undefined)?.reason ?? null;
        setDoneReason(reason);
        setMobileStreamDoneReason(reason);
        applyEvent("done", payload);
        clientRef.current = null;
      },
      onError: () => {
        setState((prev) => ({
          ...prev,
          kind: StreamUIStateKind.ERROR,
          error: "STREAM_ERROR",
        }));
        clientRef.current = null;
      },
    };

    const client = createMobileStreamClient({
      threadId,
      handlers,
      debug,
    });
    clientRef.current = client;

    await client.start();
  }, [applyEvent, stopStream]);

  const sendPrompt = useCallback(
    ({ threadId, content, attachments = [], thinkingProfile, debug = false }: SendPromptArgs) => {
      const trimmed = content.trim();
      if (!trimmed && attachments.length === 0) return;

      setDoneReason(null);
      pendingPromptRef.current = {
        threadId,
        content: trimmed,
        attachments,
        thinkingProfile,
        debug,
      };

      setState(createInitialStreamState({ kind: StreamUIStateKind.CONNECTING, threadId }));
      void startStream({ threadId, debug });
    },
    [startStream]
  );

  const isStreaming = useMemo(
    () => state.kind !== "IDLE" && !state.done,
    [state.done, state.kind]
  );

  return {
    state,
    isStreaming,
    doneReason,
    sendPrompt,
    startStream,
    stopStream,
  };
}
