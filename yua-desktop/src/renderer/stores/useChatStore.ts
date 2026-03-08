// NOTE: messagesByThread is SSOT, messages is "current active thread view" cache kept in sync
import { create } from "zustand";
import type { ChatMessage } from "yua-shared/chat/chat-types";
import { useSidebarStore } from "./useSidebarStore";
import type { ThoughtStage } from "@/lib/thoughtStage";
import type { SuggestionPayload } from "@/types/suggestion";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";
import type { UIBlock } from "yua-shared/types/ui-block";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import type { ThinkingSummaryItem } from "./useStreamSessionStore";

/* ==============================
   Types
============================== */

export type StreamState =
  | "idle"
  | "connecting"
  | "analyzing"
  | "streaming";

export type AssistantThinkingMeta = {
  enabled?: boolean;
  profile?: ThinkingProfile;
  thinkingProfile?: ThinkingProfile | null;
  summaries?: ThinkingSummaryItem[];
  primarySummaryId?: string | null;
  thinkingElapsedMs?: number | null;
  summary?: string;
};

export type ChatMessageWithMeta = ChatMessage & {
  attachments?: AttachmentMeta[];
  finalized?: boolean;
  _finalizedAt?: number;
  meta?: {
    thinking?: AssistantThinkingMeta;
    drawerOpen?: boolean;
    drawerOpenReason?: "AUTO" | "USER_COMPLETE";
    performance?: {
      streamReadyAt?: number;
      ttftAt?: number;
    };
    blocks?: UIBlock[];
    studio?: StudioSystemRef;
    thoughtStage?: ThoughtStage;
    stageNarration?: string;
    suggestion?: SuggestionPayload;
    imageLoading?: boolean;
    isImageOnly?: boolean;
    actionPreview?: {
      kind: "SEARCHING" | "THINKING_HARD" | "VERIFYING" | "BRANCHING";
      frames: string[];
      cadenceMs?: number;
      confidence?: number;
    };
    inputMethod?: "voice" | "text" | "file";
  };
  traceId?: string;
  streaming?: boolean;
};

export type UIChatMessage = ChatMessageWithMeta & {
  role: "user" | "assistant" | "system";
};

type ChatState = {
  messages: ChatMessageWithMeta[];
  hydratedThreads: Set<number>;
  streamingLockedThreads: Set<number>;
  hasHydratedThread: (threadId: number) => boolean;
  activeThreadId: number | null;
  messagesByThread: Record<number, ChatMessageWithMeta[]>;
  setActiveThread: (threadId: number | null) => void;
  lockStreamingThread: (threadId: number) => void;
  unlockStreamingThread: (threadId: number) => void;
  resetForWorkspaceSwitch: () => void;
  patchAssistantMeta: (
    id: string,
    meta:
      | Partial<ChatMessageWithMeta["meta"]>
      | ((
          prev?: ChatMessageWithMeta["meta"]
        ) => Partial<ChatMessageWithMeta["meta"]>)
  ) => void;

  patchAssistantTraceId: (id: string, traceId: string) => void;

  replaceAssistantContent: (id: string, content: string) => void;

  feedbackByMessageId: Record<string, "UP" | "DOWN">;

  hydrateFeedback: (
    items: {
      suggestionId: string;
      action: "FOLLOW" | "DISMISS";
    }[]
  ) => void;

  streamState: StreamState;
  streaming: boolean;

  firstUserMessageSent: Record<number, boolean>;

  hydrateMessages: (threadId: number, messages: ChatMessage[]) => void;

  setMessages: (messages: ChatMessage[], threadId?: number) => void;
  addUserMessage: (
    content: string,
    threadId: number,
    attachments?: AttachmentMeta[]
  ) => void;

  addAssistantMessage: (
    threadId: number,
    traceId: string,
    thinkingMeta?: {
      enabled: boolean;
      profile: ThinkingProfile;
    }
  ) => string;

  patchAssistant: (
    id: string,
    delta: string,
    opts?: { streaming?: boolean }
  ) => void;
  finalizeAssistant: (id: string) => void;
  removeAssistantMessage: (id: string) => void;

  addSystemMessage: (args: {
    threadId: number;
    content: string;
    ref?: StudioSystemRef;
  }) => void;

  setStreamState: (state: StreamState) => void;
  resetStreamState: () => void;

  regenerateFromMessage: (messageId: string) => void;
  reset: () => void;
};

/* ==============================
   FINAL meta patch whitelist SSOT
============================== */

const POST_FINAL_META_WHITELIST = new Set<keyof NonNullable<ChatMessageWithMeta["meta"]>>([
  "suggestion",
  "studio",
  "imageLoading",
  "isImageOnly",
  "thoughtStage",
  "stageNarration",
  "thinking",
  "drawerOpen",
]);

function filterPostFinalMetaPatch(
  patch?: Partial<ChatMessageWithMeta["meta"]>
): Partial<ChatMessageWithMeta["meta"]> | null {
  if (!patch) return null;

  const allowed: Partial<ChatMessageWithMeta["meta"]> = {};

  for (const key of Object.keys(patch) as (keyof ChatMessageWithMeta["meta"])[]) {
    if (POST_FINAL_META_WHITELIST.has(key)) {
      // @ts-ignore
      allowed[key] = patch[key];
    }
  }

  return Object.keys(allowed).length > 0 ? allowed : null;
}

/* ==============================
   Store
============================== */

export const useChatStore = create<ChatState>((set, get) => ({
  hydratedThreads: new Set(),
  streamingLockedThreads: new Set(),
  messagesByThread: {},
  feedbackByMessageId: {},
  activeThreadId: null,
  messages: [],

  streamState: "idle",
  streaming: false,

  firstUserMessageSent: {},

  /* ---------- Feedback Hydration ---------- */
  hydrateFeedback(items) {
    set((state) => {
      const next = { ...state.feedbackByMessageId };

      for (const item of items) {
        if (!item?.suggestionId) continue;
        next[item.suggestionId] =
          item.action === "FOLLOW" ? "UP" : "DOWN";
      }

      return { feedbackByMessageId: next };
    });
  },

  /* ---------- Hydration ---------- */
  hydrateMessages(threadId, incoming) {
    console.log("[HYDRATE_MESSAGES]", {
      threadId,
      incomingLength: Array.isArray(incoming)
        ? incoming.length
        : null,
      existingLength:
        get().messagesByThread[threadId]?.length ?? 0,
    });

    const normalizeContent = (m: any): string => {
      const raw =
        m?.content ??
        m?.message ??
        m?.text ??
        m?.answer ??
        m?.body ??
        "";

      if (typeof raw === "string") return raw;
      if (raw == null) return "";

      try {
        return JSON.stringify(raw, null, 2);
      } catch {
        return String(raw);
      }
    };

    console.log("[STORE_INGEST][INCOMING]", {
      threadId,
      count: Array.isArray(incoming) ? incoming.length : null,
      first: Array.isArray(incoming) && incoming[0]
        ? {
            id: incoming[0]?.id,
            role: incoming[0]?.role,
            traceId: incoming[0]?.traceId,
            meta: incoming[0]?.meta ?? null,
          }
        : null,
    });

    const mapped = incoming.map((m: any) => {
      console.log("[HYDRATE_META_RAW]", {
        id: m?.id,
        typeofMeta: typeof m?.meta,
        rawMeta: m?.meta ?? null,
      });

      let meta =
        m.meta && typeof m.meta === "object"
          ? m.meta
          : undefined;

      console.log("[HYDRATE_META_MAPPED]", {
        id: m?.id,
        role: m?.role,
        meta: meta ?? null,
      });
      console.log("[HYDRATE][MESSAGE_META]", {
        id: m?.id,
        sectionId: m?.meta?.studio?.sectionId,
        traceId: m?.traceId,
      });

      const content = normalizeContent(m);

      if (m.role === "assistant") {
      }

      return {
        ...m,
        content,
        streaming: false,
        finalized:
          typeof m.finalized === "boolean"
            ? m.finalized
            : m.role === "assistant",
        _finalizedAt: m._finalizedAt,
        traceId: m.traceId ?? undefined,
        meta,
        attachments: Array.isArray(m.files)
          ? m.files.map((f: any) => ({
              id: String(f.id),
              fileName: f.fileName,
              mimeType: f.mimeType,
              kind: f.fileKind,
              fileUrl: f.fileUrl ?? f.url,
              sizeBytes: f.sizeBytes,
            }))
          : [],
      };
    });

    const isLocked = get().streamingLockedThreads.has(threadId);

    set((state) => {
      const prev = state.messagesByThread[threadId] ?? [];

      console.log("[HYDRATE_MERGE_IDS]", {
        threadId,
        prevIds: prev.map((m) => m.id),
        mappedIds: mapped.map((m) => m.id),
      });

      let mergedWithLocal = mapped;
      if (isLocked) {
        const mappedIds = new Set(mapped.map((m) => m.id));
        const localInFlight = prev.filter(
          (m) =>
            m.role === "assistant" &&
            !m.finalized &&
            !mappedIds.has(m.id)
        );
        mergedWithLocal = [...mapped, ...localInFlight];
      }

      const shouldSkipOverwrite =
        prev.length > 0 && mapped.length === 0;
      const nextByThread = {
        ...state.messagesByThread,
        [threadId]: shouldSkipOverwrite ? prev : mergedWithLocal,
      };
      const nextHydrated = new Set(state.hydratedThreads).add(threadId);

      return {
        messagesByThread: nextByThread,
        hydratedThreads: nextHydrated,
        messages:
          state.activeThreadId === threadId
            ? (nextByThread[threadId] ?? [])
            : state.messages,
      };
    });
  },

  hasHydratedThread(threadId: number) {
    return get().hydratedThreads.has(threadId);
  },

  setActiveThread(threadId) {
    console.log("[SET_ACTIVE_THREAD]", threadId);
    set((state) => ({
      activeThreadId: threadId,
      messages:
        threadId != null
          ? (state.messagesByThread[threadId] ?? [])
          : [],
    }));
  },

  lockStreamingThread(threadId) {
    if (!Number.isFinite(threadId)) return;
    set((state) => {
      const next = new Set(state.streamingLockedThreads);
      next.add(threadId);
      return { streamingLockedThreads: next };
    });
  },

  unlockStreamingThread(threadId) {
    if (!Number.isFinite(threadId)) return;
    set((state) => {
      const next = new Set(state.streamingLockedThreads);
      next.delete(threadId);
      return { streamingLockedThreads: next };
    });
  },

  resetForWorkspaceSwitch() {
    set(() => ({
      hydratedThreads: new Set(),
      activeThreadId: null,
      messages: [],
      messagesByThread: {},
      feedbackByMessageId: {},
      streamState: "idle",
      firstUserMessageSent: {},
    }));
  },

  /* ---------- Messages ---------- */
  setMessages(messages, threadId) {
    if (get().streaming) return;

    const tId = threadId;
    if (tId == null) return;

    const mapped = messages.map((m) => ({ ...m, streaming: false }));

    set((state) => ({
      messages: mapped,
      messagesByThread: {
        ...state.messagesByThread,
        [tId]: mapped,
      },
    }));
  },

  addUserMessage(content, threadId, attachments) {
    const msg: ChatMessageWithMeta = {
      id: `user-${Date.now()}`,
      threadId,
      role: "user",
      content: content || "",
      attachments: attachments ?? [],
      createdAt: Date.now(),
    };
    console.log("[STORE_MESSAGE_INSERT]", {
      id: msg.id,
      role: msg.role,
      meta: msg.meta ?? null,
    });

    useSidebarStore.getState().touchThread(threadId);

    set((state) => {
      const base = state.messagesByThread[threadId] ?? [];
      const next = [...base, msg];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: next,
        },
        messages:
          state.activeThreadId === threadId ? next : state.messages,
        firstUserMessageSent: {
          ...state.firstUserMessageSent,
          [threadId]: true,
        },
      };
    });
  },

  /* ---------- Assistant ---------- */
  addAssistantMessage(threadId, traceId, thinkingMeta) {
    const existing =
      get().messagesByThread[threadId]?.find(
        (m) => m.role === "assistant" && m.traceId === traceId
      );

    if (existing) {
      return existing.id;
    }

    useSidebarStore.getState().touchThread(threadId);

    const id = `assistant-${Date.now()}`;
    const tId = threadId ?? -1;
    const activeThreadId = get().activeThreadId;

    const msg: ChatMessageWithMeta = {
      id,
      threadId: tId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
      traceId,
      meta: thinkingMeta
        ? { thinking: thinkingMeta }
        : undefined,
    };
    console.log("[STORE_MESSAGE_INSERT]", {
      id: msg.id,
      role: msg.role,
      meta: msg.meta ?? null,
    });

    set((state) => {
      const base = state.messagesByThread[tId] ?? [];
      const next = [...base, msg];
      console.log("[APPEND_ASSISTANT]", {
        incomingThreadId: tId,
        activeThreadId,
        prevLength: base.length,
        nextLength: next.length,
      });
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [tId]: next,
        },
        messages:
          state.activeThreadId === tId ? next : state.messages,
      };
    });

    return id;
  },

  /* ---------- Assistant TraceId Patch (SSOT) ---------- */
  patchAssistantTraceId(id, traceId) {
    if (!id || !traceId) return;
    set((state) => {
      let targetThreadId: number | null = null;

      for (const [tid, list] of Object.entries(state.messagesByThread)) {
        if (list.some((m) => m.id === id)) {
          targetThreadId = Number(tid);
          break;
        }
      }
      if (targetThreadId == null) return {};

      const base = state.messagesByThread[targetThreadId] ?? [];
      let changed = false;
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;
        if (m.traceId === traceId) return m;
        changed = true;
        return { ...m, traceId };
      });
      if (!changed) return {};

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [targetThreadId]: nextMessages,
        },
        messages:
          state.activeThreadId === targetThreadId
            ? nextMessages
            : state.messages,
      };
    });
  },

  /* ---------- Assistant Meta Patch ---------- */
  patchAssistantMeta(id, meta) {
    set((state) => {
      const isFn = typeof meta === "function";
      let targetThreadId: number | null = null;

      for (const [tid, list] of Object.entries(state.messagesByThread)) {
        if (list.some((m) => m.id === id)) {
          targetThreadId = Number(tid);
          break;
        }
      }

      if (targetThreadId == null) return {};

      const base = state.messagesByThread[targetThreadId] ?? [];
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;

        const nextMeta = isFn ? meta(m.meta) : meta;

        if (m.finalized) {
          const allowed = filterPostFinalMetaPatch(nextMeta);
          if (!allowed) return m;

          return {
            ...m,
            meta: {
              ...(m.meta ?? {}),
              ...allowed,
            },
          };
        }

        return {
          ...m,
          meta: {
            ...(m.meta ?? {}),
            ...nextMeta,
          },
        };
      });

      if (targetThreadId == null) {
        return { messages: nextMessages };
      }

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [targetThreadId]: nextMessages,
        },
        messages:
          state.activeThreadId === targetThreadId
            ? nextMessages
            : state.messages,
      };
    });
  },

  patchAssistant(id, delta, opts) {
    console.log("[STORE_PATCH_ASSISTANT]", {
      id,
      delta,
      deltaLength: typeof delta === "string" ? delta.length : null,
      streaming: opts?.streaming,
    });
    set((state) => {
      let targetThreadId: number | null = null;

      for (const [tid, list] of Object.entries(state.messagesByThread)) {
        if (list.some((m) => m.id === id)) {
          targetThreadId = Number(tid);
          break;
        }
      }

      if (targetThreadId == null) return {};

      const base = state.messagesByThread[targetThreadId] ?? [];
      const nextMessages = base.map((m) => {
        if (m.id !== id) return m;

        if (m.finalized) {
          return m;
        }

        return {
          ...m,
          content: m.content + delta,
          streaming: opts?.streaming ?? m.streaming,
        };
      });

      if (targetThreadId == null) {
        return { messages: nextMessages };
      }

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [targetThreadId]: nextMessages,
        },
        messages:
          state.activeThreadId === targetThreadId
            ? nextMessages
            : state.messages,
      };
    });
  },

  replaceAssistantContent(id: string, content: string) {
    set((state) => {
      let targetThreadId: number | null = null;

      const nextByThread = { ...state.messagesByThread };

      for (const [tid, list] of Object.entries(state.messagesByThread)) {
        const next = list.map((m) => {
          if (m.id !== id) return m;
          if (m.finalized) return m;
          targetThreadId = Number(tid);
          return { ...m, content };
        });

        nextByThread[Number(tid)] = next;
      }

      if (targetThreadId == null) return {};

      return {
        messagesByThread: nextByThread,
        messages:
          state.activeThreadId === targetThreadId
            ? (nextByThread[targetThreadId] ?? [])
            : state.messages,
      };
    });
  },

  finalizeAssistant(id) {
    set((state) => {
      let targetThreadId: number | null = null;

      for (const [tid, list] of Object.entries(state.messagesByThread)) {
        if (list.some((m) => m.id === id)) {
          targetThreadId = Number(tid);
          break;
        }
      }

      if (targetThreadId == null) return {};

      const base = state.messagesByThread[targetThreadId] ?? [];
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

      if (targetThreadId == null) {
        return { messages: nextMessages };
      }

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [targetThreadId]: nextMessages,
        },
        messages:
          state.activeThreadId === targetThreadId
            ? nextMessages
            : state.messages,
      };
    });
  },

  removeAssistantMessage(id) {
    set((state) => {
      const nextByThread = { ...state.messagesByThread };

      for (const tid of Object.keys(nextByThread)) {
        nextByThread[Number(tid)] =
          nextByThread[Number(tid)].filter((m) => m.id !== id);
      }

      const activeTid = state.activeThreadId;
      return {
        messagesByThread: nextByThread,
        messages:
          activeTid != null
            ? (nextByThread[activeTid] ?? [])
            : [],
      };
    });
  },

  /* ---------- System ---------- */
  addSystemMessage({ threadId, content, ref }) {
    const msg: ChatMessageWithMeta = {
      id: `system-${Date.now()}`,
      threadId,
      role: "system",
      content,
      createdAt: Date.now(),
      meta: ref ? { studio: ref } : undefined,
    };

    set((state) => {
      const base = state.messagesByThread[threadId] ?? [];
      const next = [...base, msg];
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: next,
        },
        messages:
          state.activeThreadId === threadId ? next : state.messages,
      };
    });
  },

  /* ---------- Stream Control ---------- */
  setStreamState(state) {
    set({
      streamState: state,
      streaming: state === "streaming",
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
        streamState: "idle",
        streaming: false,
        messagesByThread: nextByThread,
        messages:
          state.activeThreadId != null
            ? (nextByThread[state.activeThreadId] ?? [])
            : [],
      };
    });
  },

  /* ---------- Regenerate ---------- */
  regenerateFromMessage(messageId) {
    const { messagesByThread } = get();

    for (const [tid, list] of Object.entries(messagesByThread)) {
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx === -1) continue;

      const target = list[idx];
      if (target.role !== "assistant") return;

      const trimmed = list.slice(0, idx);

      set((state) => ({
        streamState: "idle",
        messagesByThread: {
          ...messagesByThread,
          [Number(tid)]: trimmed,
        },
      }));
      return;
    }
  },

  /* =========================
     Reset (logout SSOT)
  ========================= */
  reset() {
    set({
      hydratedThreads: new Set(),
      messagesByThread: {},
      feedbackByMessageId: {},
      activeThreadId: null,
      messages: [],
      streamState: "idle",
      firstUserMessageSent: {},
    });
  },
}));

// =========================
// DEBUG: expose store to window (DEV ONLY)
// =========================
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  if (!Object.getOwnPropertyDescriptor(window, "__zustand_chat_store__")) {
    Object.defineProperty(window, "__zustand_chat_store__", {
      get: () => useChatStore.getState(),
      configurable: true,
    });
  }
}

/* ==============================
   Selector
============================== */

export const useUIMessages = () =>
  useChatStore((s) => {
    const tid = s.activeThreadId;
    const list =
      tid != null ? s.messagesByThread[tid] ?? [] : [];

    return list.filter(
      (m): m is UIChatMessage =>
        m.role === "user" ||
        m.role === "assistant" ||
        m.role === "system"
    );
  });
