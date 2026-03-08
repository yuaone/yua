import { useEffect, useMemo, useRef } from "react";

import { useMobileChatSender } from "@/features/chat/hooks/useMobileChatSender";
import { useMobileChatStreamSession } from "@/features/chat/hooks/useMobileChatStreamSession";
import { useMobileThinkingProfile } from "@/hooks/useMobileThinkingProfile";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";
import { applyStreamStateToAssistantMessage } from "@/features/chat/model/stream-event.mapper";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import {
  applyMobileActivity,
  endMobileStreamSession,
  resetMobileStreamSession,
  startMobileStreamSession,
} from "@/store/useMobileStreamSessionStore";
import type { ActivityOp } from "yua-shared/stream/activity";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

export function useMobileChatController(threadId: number | null) {
  const { state, isStreaming, sendPrompt, stopStream, session } = useMobileChatStreamSession();
  const ensureThread = useMobileChatStore((s) => s.ensureThread);
  const getMessages = useMobileChatStore((s) => s.getMessages);
  const setMessages = useMobileChatStore((s) => s.setMessages);
  const addAssistantMessage = useMobileChatStore((s) => s.addAssistantMessage);
  const setActiveAssistant = useMobileChatStore((s) => s.setActiveAssistant);
  const getActiveAssistant = useMobileChatStore((s) => s.getActiveAssistant);
  const patchAssistantMeta = useMobileChatStore((s) => s.patchAssistantMeta);
  const patchAssistantTraceId = useMobileChatStore((s) => s.patchAssistantTraceId);

  const lastActivityKeyRef = useRef<string>("");
  const lastPromptRef = useRef<{ content: string; attachments: AttachmentMeta[] } | null>(null);
  const sender = useMobileChatSender(sendPrompt);
  const { profile, enabled, disable } = useMobileThinkingProfile();

  // Stop any active stream when the user switches threads
  const prevThreadRef = useRef<number | null>(threadId);
  useEffect(() => {
    if (prevThreadRef.current !== threadId && isStreaming) {
      stopStream();
      resetMobileStreamSession();
    }
    prevThreadRef.current = threadId;
  }, [threadId, isStreaming, stopStream]);

  useEffect(() => {
    if (threadId == null) return;
    ensureThread(threadId);
  }, [ensureThread, threadId]);

  const messages = useMemo(() => {
    if (threadId == null) return [];
    return getMessages(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMessages, threadId, state.text, state.kind]);

  const send = async (text: string, attachments: AttachmentMeta[] = []) => {
    if (threadId == null) return false;

    const prompt = text.trim();
    if (!prompt && attachments.length === 0) return false;

    lastPromptRef.current = { content: prompt, attachments };

    resetMobileStreamSession();
    const effectiveProfile = enabled && profile === "DEEP" ? "DEEP" : "NORMAL";

    const assistantId = addAssistantMessage(threadId, null, {
      thinkingProfile: effectiveProfile,
    });

    startMobileStreamSession({
      messageId: assistantId,
      mode: effectiveProfile,
      traceId: null,
    });

    setActiveAssistant(threadId, assistantId);

    sender.send({
      threadId,
      content: prompt,
      attachments,
      thinkingProfile: effectiveProfile,
    });
    if (effectiveProfile === "DEEP") {
      disable();
    }
    return true;
  };

  const regenerate = async (assistantMessageId: string) => {
    if (threadId == null) return;
    if (isStreaming) return;

    const list = getMessages(threadId);
    const assistantIdx = list.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 0) return;

    const assistant = list[assistantIdx];
    if (assistant.role !== "assistant") return;

    let pairedUser: (typeof list)[number] | null = null;
    for (let i = assistantIdx - 1; i >= 0; i -= 1) {
      const m = list[i];
      if (m.role === "user") {
        pairedUser = m;
        break;
      }
    }
    if (!pairedUser) return;

    const prompt = String(pairedUser.content ?? "").trim();
    const attached = pairedUser.attachments ?? [];
    if (!prompt && attached.length === 0) return;

    lastPromptRef.current = { content: prompt, attachments: attached };

    const trimmed = list.slice(0, assistantIdx);
    setMessages(threadId, trimmed);

    resetMobileStreamSession();

    const effectiveProfile = enabled && profile === "DEEP" ? "DEEP" : "NORMAL";
    const assistantId = addAssistantMessage(threadId, null, {
      thinkingProfile: effectiveProfile,
    });

    startMobileStreamSession({
      messageId: assistantId,
      mode: effectiveProfile,
      traceId: null,
    });
    setActiveAssistant(threadId, assistantId);

    sender.send({
      threadId,
      content: prompt,
      attachments: attached,
      thinkingProfile: effectiveProfile,
    });
  };

  const retryLastSend = async () => {
    if (threadId == null) return;
    if (isStreaming) return;
    const last = lastPromptRef.current;
    if (!last) return;

    resetMobileStreamSession();
    const effectiveProfile = enabled && profile === "DEEP" ? "DEEP" : "NORMAL";

    const assistantId = addAssistantMessage(threadId, null, {
      thinkingProfile: effectiveProfile,
    });

    startMobileStreamSession({
      messageId: assistantId,
      mode: effectiveProfile,
      traceId: null,
    });
    setActiveAssistant(threadId, assistantId);

    sender.send({
      threadId,
      content: last.content,
      attachments: last.attachments,
      thinkingProfile: effectiveProfile,
    });
  };

  useEffect(() => {
    if (threadId == null) return;
    if (state.kind !== "READY") return;

    const assistantId = getActiveAssistant(threadId);
    if (assistantId) {
      startMobileStreamSession({
        messageId: assistantId,
        mode: state.thinkingProfile ?? "NORMAL",
        thinkingProfile: state.thinkingProfile ?? "NORMAL",
        traceId: state.traceId ?? null,
      });
      if (state.traceId) {
        patchAssistantTraceId(threadId, assistantId, state.traceId);
      }
    }
  }, [getActiveAssistant, patchAssistantTraceId, state.kind, state.thinkingProfile, state.traceId, threadId]);

  useEffect(() => {
    if (threadId == null) return;
    const assistantId = getActiveAssistant(threadId);
    const current = getMessages(threadId);
    const next = applyStreamStateToAssistantMessage(current, assistantId, state, session.streamSession);
    setMessages(threadId, next);

    if (assistantId && state.traceId) {
      patchAssistantMeta(assistantId, {
        thinkingProfile: state.thinkingProfile,
      });
    }

    if (session.streamSession.traceId && assistantId) {
      patchAssistantMeta(assistantId, {
        thinking: {
          thinkingProfile:
            session.streamSession.thinkingProfile ?? session.streamSession.mode,
          summaries: session.streamSession.summaries,
          primarySummaryId: session.streamSession.primarySummaryId,
          thinkingElapsedMs:
            session.streamSession.startedAt != null
              ? Math.max(0, Date.now() - session.streamSession.startedAt)
              : null,
        },
      });
    }

    if (state.activity.length === 0) {
      lastActivityKeyRef.current = "";
    }

    if (state.activity.length > 0) {
      const latest = state.activity[state.activity.length - 1];
      if (latest) {
        const activityKey = `${latest.id}|${latest.status ?? ""}|${latest.inlineSummary ?? ""}|${latest.body ?? ""}|${latest.title ?? ""}`;
        if (lastActivityKeyRef.current !== activityKey) {
          lastActivityKeyRef.current = activityKey;
          const exists = session.streamSession.chunks.some((chunk) => chunk.chunkId === latest.id);
          const op: ActivityOp = exists ? "PATCH" : "ADD";
          applyMobileActivity({
            op,
            item: latest,
          });
        }
      }
    }

    if (state.done) {
      setActiveAssistant(threadId, null);
      endMobileStreamSession();
    }
  }, [
    getActiveAssistant,
    getMessages,
    patchAssistantMeta,
    session.streamSession,
    setActiveAssistant,
    setMessages,
    state,
    threadId,
  ]);

  const openThinkByMessage = (message: MobileChatMessage) => {
    if (threadId == null) return;
    if (message.role !== "assistant") return;

    const current = getMessages(threadId);
    const targetOpen = !(message.meta?.drawerOpen ?? false);

    const next = current.map((entry) => {
      if (entry.role !== "assistant") return entry;
      if (entry.id === message.id) {
        return {
          ...entry,
          meta: {
            ...(entry.meta ?? {}),
            drawerOpen: targetOpen,
          },
        };
      }

      if (entry.meta?.drawerOpen) {
        return {
          ...entry,
          meta: {
            ...(entry.meta ?? {}),
            drawerOpen: false,
          },
        };
      }

      return entry;
    });

    setMessages(threadId, next);
  };

  const closeThinkDrawer = () => {
    if (threadId == null) return;
    const current = getMessages(threadId);
    const next = current.map((entry) => {
      if (entry.role !== "assistant") return entry;
      if (entry.meta?.drawerOpen !== true) return entry;
      return {
        ...entry,
        meta: {
          ...(entry.meta ?? {}),
          drawerOpen: false,
        },
      };
    });
    setMessages(threadId, next);
  };

  const activeThinkMessage = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "assistant" && entry.meta?.drawerOpen === true) ?? null,
    [messages]
  );

  return {
    messages,
    send,
    regenerate,
    retryLastSend,
    isStreaming,
    stopStream,
    streamState: state,
    streamSession: session.streamSession,
    openThinkByMessage,
    closeThinkDrawer,
    activeThinkMessage,
  };
}
