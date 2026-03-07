"use client";

import { create } from "zustand";
import type { ChatMessage } from "@/types/chat";
import { createChatAPI } from "@/lib/chat-api";
import type { ThreadSummary } from "@/lib/chat-api";

const LAST_THREAD_KEY = "yua:lastThreadId";

/* client-safe id */
const genId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  projectId?: string | null;
};

type ChatState = {
  /* ---------- Auth ---------- */
  authFetch: AuthFetch | null;
  setAuthFetch: (fn: AuthFetch | null) => void;

  /* ---------- Threads ---------- */
  threads: Thread[];
  currentThreadId: string | null;
  threadsLoaded: boolean;

  loadThreads: (opts?: { projectId?: string }) => Promise<void>;
  hydrateThread: () => Promise<void>;
  newThread: (
    title?: string,
    projectId?: string | null
  ) => Promise<string | null>;
  switchThread: (id: string) => Promise<void>;
  updateThreadTitle: (title: string) => Promise<void>;

  /* ---------- Messages ---------- */
  messages: ChatMessage[];
  loadMessages: (threadId: string) => Promise<void>;

  addUserMessage: (content: string) => void;
  addAssistantMessage: () => string;
  patchAssistant: (id: string, delta: string) => void;
  finalizeAssistant: (id: string) => void;

  /* ---------- Stream ---------- */
  streaming: boolean;
  startStreaming: () => void;
  resetStreamState: () => void;

  /* ---------- Reset ---------- */
  reset: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  /* ---------- Base ---------- */
  threads: [],
  currentThreadId: null,
  threadsLoaded: false,
  messages: [],
  streaming: false,
  authFetch: null,

  /* ---------- Auth Inject ---------- */
  setAuthFetch: (authFetch) => {
    set({
      authFetch,
      threadsLoaded: false,
      threads: [],
      currentThreadId: null,
      messages: [],
    });

    // 🔥 핵심: auth 주입 직후 thread 로딩 트리거
    if (authFetch) {
      get().loadThreads();
    }
  },

  /* ---------- Threads ---------- */
  loadThreads: async (opts) => {
    const { authFetch } = get();
    if (!authFetch) return;

    const api = createChatAPI(authFetch);
    const r = await api.listThreads(opts);
    if (!r.ok) return;

    const rows: ThreadSummary[] = Array.isArray(r.threads)
      ? r.threads
      : [];

    set({
      threads: rows.map((t) => ({
        id: String(t.id),
        title: t.title,
        createdAt: t.createdAt,
        projectId: t.projectId ?? null,
      })),
      threadsLoaded: true,
    });
  },

  hydrateThread: async () => {
    const { threads, threadsLoaded, authFetch } = get();
    if (!authFetch || !threadsLoaded || threads.length === 0) return;

    const last = localStorage.getItem(LAST_THREAD_KEY);
    const next =
      threads.find((t) => t.id === last)?.id ??
      threads[0]?.id ??
      null;

    if (!next) return;

    set({ currentThreadId: next });
    localStorage.setItem(LAST_THREAD_KEY, next);

    await get().loadMessages(next);
  },

  newThread: async (title = "New Chat", projectId = null) => {
    const { authFetch } = get();
    if (!authFetch) return null;

    const api = createChatAPI(authFetch);
    const r = await api.createThread(title, projectId);
    if (!r.ok || !r.threadId) return null;

    const id = String(r.threadId);

    set((s) => ({
      threads: [
        {
          id,
          title,
          createdAt: Date.now(),
          projectId,
        },
        ...s.threads,
      ],
      currentThreadId: id,
      messages: [],
    }));

    localStorage.setItem(LAST_THREAD_KEY, id);
    return id;
  },

  switchThread: async (id) => {
    const { threads } = get();
    if (!threads.find((t) => t.id === id)) return;

    set({ currentThreadId: id, messages: [] });
    localStorage.setItem(LAST_THREAD_KEY, id);

    await get().loadMessages(id);
  },

  updateThreadTitle: async (title) => {
    const { currentThreadId, authFetch } = get();
    if (!currentThreadId || !authFetch) return;

    const api = createChatAPI(authFetch);
    await api.renameThread(Number(currentThreadId), title);

    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === currentThreadId ? { ...t, title } : t
      ),
    }));
  },

  /* ---------- Messages ---------- */
  loadMessages: async (threadId) => {
    const { authFetch } = get();
    if (!authFetch) return;

    const res = await authFetch(
      `/api/chat/message?threadId=${threadId}`,
      { method: "GET", cache: "no-store" }
    );

    if (!res.ok) return;

    const data = await res.json();
    if (!Array.isArray(data.messages)) return;

    set({
      messages: data.messages.map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        isStreaming: false,
        createdAt: new Date(m.createdAt).getTime(),
      })),
    });
  },

  addUserMessage: (content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: genId(),
          role: "user",
          content,
          createdAt: Date.now(),
        },
      ],
    })),

  addAssistantMessage: () => {
    const id = genId();
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id,
          role: "assistant",
          content: "",
          streamingText: "",
          isStreaming: true,
          createdAt: Date.now(),
        },
      ],
    }));
    return id;
  },

  patchAssistant: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              streamingText: (m.streamingText ?? "") + delta,
            }
          : m
      ),
    })),

  finalizeAssistant: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              content: m.content + (m.streamingText ?? ""),
              streamingText: undefined,
              isStreaming: false,
            }
          : m
      ),
    })),

  /* ---------- Stream ---------- */
  startStreaming: () => set({ streaming: true }),
  resetStreamState: () => set({ streaming: false }),

  /* ---------- Reset ---------- */
  reset: () => {
    localStorage.removeItem(LAST_THREAD_KEY);
    set({
      threads: [],
      currentThreadId: null,
      threadsLoaded: false,
      messages: [],
      streaming: false,
      authFetch: null,
    });
  },
}));
