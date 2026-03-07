"use client";

import { create } from "zustand";
import { useAuth } from "@/contexts/AuthContext";

export type ThreadItem = {
  id: number;
  title: string;
  createdAt: number;
  pinned: boolean;
};

type ThreadState = {
  threads: ThreadItem[];
  activeThreadId: number | null;
  loading: boolean;

  loadThreads(): Promise<void>;
  createThread(title?: string): Promise<number | null>;
  setActiveThread(id: number): void;
  renameThread(id: number, title: string): Promise<void>;
  togglePin(id: number): Promise<void>;
};

const PIN_LS_KEY = "yua:pinnedThreads";

/* =========================
   🔒 AuthFetch Safe Getter
========================= */
function getAuthFetch(): ((...args: any[]) => Promise<Response>) | null {
  const anyAuth = useAuth as any;
  return anyAuth.getState?.()?.authFetch ?? null;
}

function readPinnedIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(PIN_LS_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function writePinnedIds(ids: number[]) {
  localStorage.setItem(PIN_LS_KEY, JSON.stringify(ids));
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  loading: false,

  async loadThreads() {
    set({ loading: true });
    try {
      const authFetch = getAuthFetch();
      if (!authFetch) return;

      const res = await authFetch("/api/chat/thread");
      if (!res.ok) return;

      const data = await res.json();
      if (!data?.ok || !Array.isArray(data?.threads)) return;

      const pinnedIds = readPinnedIds();

      set({
        threads: data.threads.map((t: any) => {
          const id = Number(t.id);
          return {
            id,
            title: String(t.title ?? "New Chat"),
            createdAt: Number(t.createdAt ?? Date.now()),
            pinned:
              typeof t.pinned === "boolean"
                ? t.pinned
                : pinnedIds.includes(id),
          };
        }),
      });
    } finally {
      set({ loading: false });
    }
  },

  async createThread(title = "New Chat") {
    const authFetch = getAuthFetch();
    if (!authFetch) return null;

    const res = await authFetch("/api/chat/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.ok) return null;

    const id = Number(data.threadId);
    if (!Number.isFinite(id) || id <= 0) return null;

    set({ activeThreadId: id });
    await get().loadThreads();

    return id;
  },

  setActiveThread(id) {
    set({ activeThreadId: id });
  },

  async renameThread(id, title) {
    const authFetch = getAuthFetch();
    if (!authFetch) return;

    const next = title.trim();
    if (!next) return;

    await authFetch(`/api/chat/thread/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });

    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === id ? { ...t, title: next } : t
      ),
    }));
  },

  async togglePin(id) {
    const pinnedIds = readPinnedIds();
    const isPinned = pinnedIds.includes(id);

    let next: number[];
    if (isPinned) {
      next = pinnedIds.filter((x) => x !== id);
    } else {
      if (pinnedIds.length >= 5) return;
      next = [...pinnedIds, id];
    }

    writePinnedIds(next);

    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === id ? { ...t, pinned: !t.pinned } : t
      ),
    }));

    // best-effort server sync
    try {
      const authFetch = getAuthFetch();
      if (!authFetch) return;

      await authFetch(`/api/chat/thread/${id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // ignore
    }
  },
}));
