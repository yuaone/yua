import { create } from "zustand";

import type { MobileChatMessage, MobileChatMessageMeta } from "@/features/chat/model/chat-message.types";

/* ==============================
   Types
============================== */

export type MobileStreamState =
  | "idle"
  | "connecting"
  | "analyzing"
  | "streaming";

type ChatState = {
  messagesByThread: Record<number, MobileChatMessage[]>;
  activeAssistantByThread: Record<number, string | null>;
  feedbackByMessageId: Record<string, "UP" | "DOWN">;
  hydratedThreads: Set<number>;

  streaming: boolean;
  streamState: MobileStreamState;

  /* ---- Queries ---- */
  getMessages: (threadId: number) => MobileChatMessage[];
  findMessageById: (messageId: string) => MobileChatMessage | null;
  getActiveAssistant: (threadId: number) => string | null;
  hasHydratedThread: (threadId: number) => boolean;

  /* ---- Hydration ---- */
  hydrateMessages: (threadId: number, messages: MobileChatMessage[]) => void;

  /* ---- Thread setup ---- */
  ensureThread: (threadId: number) => void;

  /* ---- Message CRUD ---- */
  setMessages: (threadId: number, messages: MobileChatMessage[]) => void;
  appendMessages: (threadId: number, messages: MobileChatMessage[]) => void;
  addUserMessage: (
    content: string,
    threadId: number,
    attachments?: MobileChatMessage["attachments"]
  ) => void;
  addAssistantMessage: (
    threadId: number,
    traceId: string | null,
    thinkingMeta?: MobileChatMessageMeta["thinking"]
  ) => string;

  /* ---- Assistant mutations ---- */
  patchAssistant: (
    id: string,
    delta: string,
    opts?: { streaming?: boolean }
  ) => void;
  finalizeAssistant: (id: string) => void;
  patchAssistantMeta: (
    id: string,
    meta: Partial<MobileChatMessageMeta> | ((prev?: MobileChatMessageMeta) => Partial<MobileChatMessageMeta>)
  ) => void;
  patchAssistantTraceId: (threadId: number, messageId: string, traceId: string) => void;
  setActiveAssistant: (threadId: number, messageId: string | null) => void;

  /* ---- Feedback ---- */
  setFeedback: (messageId: string, action: "UP" | "DOWN") => void;

  /* ---- Stream control ---- */
  setStreamState: (state: MobileStreamState) => void;
  resetStreamState: () => void;

  /* ---- Reset ---- */
  reset: () => void;
};

/* ==============================
   Helpers
============================== */

function findThreadIdForMessage(
  messagesByThread: Record<number, MobileChatMessage[]>,
  messageId: string
): number | null {
  for (const [tid, list] of Object.entries(messagesByThread)) {
    if (list.some((m) => m.id === messageId)) return Number(tid);
  }
  return null;
}

/* ==============================
   Store
============================== */

export const useMobileChatStore = create<ChatState>((set, get) => ({
  messagesByThread: {},
  activeAssistantByThread: {},
  feedbackByMessageId: {},
  hydratedThreads: new Set(),

  streaming: false,
  streamState: "idle",

  /* ---------- Queries ---------- */
  getMessages(threadId) {
    return get().messagesByThread[threadId] ?? [];
  },

  findMessageById(messageId) {
    for (const list of Object.values(get().messagesByThread)) {
      const hit = list.find((m) => m.id === messageId);
      if (hit) return hit;
    }
    return null;
  },

  getActiveAssistant(threadId) {
    return get().activeAssistantByThread[threadId] ?? null;
  },

  hasHydratedThread(threadId) {
    return get().hydratedThreads.has(threadId);
  },

  /* ---------- Hydration ---------- */
  hydrateMessages(threadId, incoming) {
    set((state) => {
      const prev = state.messagesByThread[threadId] ?? [];

      // Guard: never overwrite existing messages with empty array
      // (race condition / failed fetch protection)
      if (prev.length > 0 && incoming.length === 0) {
        return {
          hydratedThreads: new Set(state.hydratedThreads).add(threadId),
        };
      }

      const mapped = incoming.map((m) => ({
        ...m,
        streaming: false,
        finalized:
          typeof m.finalized === "boolean"
            ? m.finalized
            : m.role === "assistant",
      }));

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: mapped,
        },
        hydratedThreads: new Set(state.hydratedThreads).add(threadId),
      };
    });
  },

  /* ---------- Thread setup ---------- */
  ensureThread(threadId) {
    if (get().messagesByThread[threadId]) return;
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [
          {
            id: `welcome-${threadId}`,
            threadId,
            role: "assistant",
            content: "Welcome to mobile chat.",
            createdAt: Date.now(),
            streaming: false,
            finalized: true,
          },
        ],
      },
    }));
  },

  /* ---------- Message CRUD ---------- */
  setMessages(threadId, messages) {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: messages,
      },
    }));
  },

  appendMessages(threadId, messages) {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), ...messages],
      },
    }));
  },

  addUserMessage(content, threadId, attachments) {
    const now = Date.now();
    const msg: MobileChatMessage = {
      id: `user-${threadId}-${now}`,
      threadId,
      role: "user",
      content,
      createdAt: now,
      finalized: true,
      attachments,
    };

    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), msg],
      },
    }));
  },

  addAssistantMessage(threadId, traceId, thinkingMeta) {
    const existing = get().messagesByThread[threadId]?.find(
      (m) => m.role === "assistant" && traceId && m.traceId === traceId
    );
    if (existing) return existing.id;

    const id = `assistant-${Date.now()}`;
    const msg: MobileChatMessage = {
      id,
      threadId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      finalized: false,
      traceId: traceId ?? undefined,
      meta: thinkingMeta ? { thinking: thinkingMeta } : undefined,
    };

    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), msg],
      },
    }));
    return id;
  },

  /* ---------- Assistant mutations ---------- */
  patchAssistant(id, delta, opts) {
    set((state) => {
      const tid = findThreadIdForMessage(state.messagesByThread, id);
      if (tid == null) return {};

      const base = state.messagesByThread[tid] ?? [];
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;
        // FINAL SSOT: finalized message is immutable
        if (m.finalized) return m;
        return {
          ...m,
          content: m.content + delta,
          streaming: opts?.streaming ?? m.streaming,
        };
      });

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [tid]: nextMessages,
        },
      };
    });
  },

  finalizeAssistant(id) {
    set((state) => {
      const tid = findThreadIdForMessage(state.messagesByThread, id);
      if (tid == null) return {};

      const base = state.messagesByThread[tid] ?? [];
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;
        return {
          ...m,
          streaming: false,
          finalized: true,
          _finalizedAt: m._finalizedAt ?? Date.now(),
          content: m.content,
          meta: m.meta,
        };
      });

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [tid]: nextMessages,
        },
      };
    });
  },

  patchAssistantMeta(id, meta) {
    set((state) => {
      const isFn = typeof meta === "function";
      const tid = findThreadIdForMessage(state.messagesByThread, id);
      if (tid == null) return {};

      const base = state.messagesByThread[tid] ?? [];
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;

        const nextMeta = isFn ? (meta as (prev?: MobileChatMessageMeta) => Partial<MobileChatMessageMeta>)(m.meta) : meta;

        return {
          ...m,
          meta: {
            ...(m.meta ?? {}),
            ...nextMeta,
          },
        };
      });

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [tid]: nextMessages,
        },
      };
    });
  },

  patchAssistantTraceId(threadId, messageId, traceId) {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: (state.messagesByThread[threadId] ?? []).map((m) =>
          m.id === messageId ? { ...m, traceId } : m
        ),
      },
    }));
  },

  setActiveAssistant(threadId, messageId) {
    set((state) => ({
      activeAssistantByThread: {
        ...state.activeAssistantByThread,
        [threadId]: messageId,
      },
    }));
  },

  /* ---------- Feedback ---------- */
  setFeedback(messageId, action) {
    set((state) => ({
      feedbackByMessageId: {
        ...state.feedbackByMessageId,
        [messageId]: action,
      },
    }));
  },

  /* ---------- Stream control ---------- */
  setStreamState(streamState) {
    set({
      streamState,
      streaming: streamState === "streaming",
    });
  },

  resetStreamState() {
    set((state) => {
      const nextByThread = { ...state.messagesByThread };
      for (const tid of Object.keys(nextByThread)) {
        nextByThread[Number(tid)] = nextByThread[Number(tid)].map((m) =>
          m.role === "assistant" && m.streaming && !m.finalized
            ? { ...m, streaming: false }
            : m
        );
      }

      return {
        streamState: "idle" as const,
        streaming: false,
        messagesByThread: nextByThread,
      };
    });
  },

  /* ---------- Reset ---------- */
  reset() {
    set({
      messagesByThread: {},
      activeAssistantByThread: {},
      feedbackByMessageId: {},
      hydratedThreads: new Set(),
      streaming: false,
      streamState: "idle",
    });
  },
}));
