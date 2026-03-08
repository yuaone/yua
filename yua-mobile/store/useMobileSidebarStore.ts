import { useMemo } from "react";
import { create } from "zustand";

import type { MobileProject, MobileThread, SidebarPanelMode } from "@/types/sidebar";

type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");

/* ==============================
   Helpers
============================== */

function sortThreads(threads: MobileThread[]): MobileThread[] {
  const pinned = threads
    .filter((thread) => thread.pinned)
    .sort((a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0));

  const normal = threads
    .filter((thread) => !thread.pinned)
    .sort((a, b) => {
      const aAt = a.lastActiveAt ?? a.createdAt;
      const bAt = b.lastActiveAt ?? b.createdAt;
      if (bAt !== aAt) return bAt - aAt;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

  return [...pinned, ...normal];
}

/* ==============================
   Types
============================== */

type SidebarState = {
  mode: SidebarPanelMode;
  activeProjectId: string | null;
  activeThreadId: number | null;
  editingThreadId: number | null;
  projects: MobileProject[];
  threads: MobileThread[];
  loadingProjects: boolean;
  loadingThreads: boolean;

  /* ---- Actions ---- */
  setMode: (mode: SidebarPanelMode) => void;
  setActiveContext: (projectId: string | null, threadId: number | null) => void;
  setActiveThreadId: (threadId: number | null) => void;
  setActiveProjectId: (projectId: string | null) => void;
  setAll: (value: { projects: MobileProject[]; threads: MobileThread[] }) => void;
  addThread: (thread: MobileThread) => void;
  renameThread: (threadId: number, title: string) => void;
  deleteThread: (threadId: number) => void;
  togglePin: (threadId: number) => void;
  updateThread: (threadId: number, patch: Partial<MobileThread>) => void;
  touchThread: (threadId: number, at?: number) => void;
  setProjects: (projects: MobileProject[]) => void;
  setThreads: (threads: MobileThread[]) => void;
  setThreadTitleIfEmpty: (threadId: number, title: string) => void;
  startEditingThread: (threadId: number) => void;
  stopEditingThread: () => void;
  setLoadingProjects: (value: boolean) => void;
  setLoadingThreads: (value: boolean) => void;
  resetSidebar: () => void;

  /* ---- Phase 3 extensions ---- */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  bumpThread: (threadId: number) => void;
  moveToProject: (threadId: number, projectId: number | null) => void;
  createProject: (name: string, authFetch: AuthFetchFn) => Promise<void>;
  pinThread: (threadId: number, authFetch: AuthFetchFn) => Promise<void>;
  deleteThreadRemote: (threadId: number, authFetch: AuthFetchFn) => Promise<void>;
};

/* ==============================
   Store
============================== */

export const useMobileSidebarStore = create<SidebarState>((set, get) => ({
  mode: "threads",
  activeProjectId: null,
  activeThreadId: null,
  editingThreadId: null,
  projects: [],
  threads: [],
  loadingProjects: false,
  loadingThreads: false,

  setMode(mode) {
    set({ mode });
  },

  setActiveContext(projectId, threadId) {
    set((state) => {
      if (threadId == null) {
        return { activeProjectId: projectId, activeThreadId: null };
      }

      const validThread = state.threads.find(
        (item) =>
          item.id === threadId &&
          String(item.projectId ?? "null") === String(projectId ?? "null")
      );

      if (!validThread) {
        return { activeProjectId: projectId, activeThreadId: null };
      }

      return { activeProjectId: projectId, activeThreadId: threadId };
    });
  },

  setActiveThreadId(threadId) {
    set((state) => {
      if (threadId == null) return { activeThreadId: null };
      const exists = state.threads.some((thread) => thread.id === threadId);
      if (!exists) return {};
      return { activeThreadId: threadId };
    });
  },

  setActiveProjectId(projectId) {
    set({ activeProjectId: projectId, activeThreadId: null });
  },

  setAll(value) {
    set((state) => {
      const sorted = sortThreads(value.threads);
      const activeThreadExists =
        state.activeThreadId != null && sorted.some((thread) => thread.id === state.activeThreadId);
      return {
        projects: value.projects,
        threads: sorted,
        activeThreadId: activeThreadExists ? state.activeThreadId : null,
      };
    });
  },

  addThread(thread) {
    set((state) => {
      const threads = sortThreads([thread, ...state.threads.filter((item) => item.id !== thread.id)]);
      return {
        threads,
        activeThreadId: thread.id,
        activeProjectId: thread.projectId,
        mode: "threads" as const,
      };
    });
  },

  renameThread(threadId, title) {
    set((state) => ({
      threads: state.threads.map((thread) =>
        thread.id === threadId ? { ...thread, title } : thread
      ),
    }));
  },

  togglePin(threadId) {
    set((state) => {
      const threads = state.threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              pinned: !thread.pinned,
              pinnedOrder: thread.pinned ? null : Date.now(),
            }
          : thread
      );
      return { threads: sortThreads(threads) };
    });
  },

  deleteThread(threadId) {
    set((state) => {
      const threads = state.threads.filter((thread) => thread.id !== threadId);
      return {
        threads,
        activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
      };
    });
  },

  updateThread(threadId, patch) {
    set((state) => ({
      threads: sortThreads(
        state.threads.map((thread) =>
          thread.id === threadId ? { ...thread, ...patch } : thread
        )
      ),
    }));
  },

  touchThread(threadId, at = Date.now()) {
    set((state) => ({
      threads: sortThreads(
        state.threads.map((thread) =>
          thread.id === threadId ? { ...thread, lastActiveAt: at } : thread
        )
      ),
    }));
  },

  setProjects(projects) {
    set({ projects });
  },

  setThreads(threads) {
    set((state) => {
      const sorted = sortThreads(threads);
      const activeThreadExists =
        state.activeThreadId != null && sorted.some((thread) => thread.id === state.activeThreadId);
      return {
        threads: sorted,
        activeThreadId: activeThreadExists ? state.activeThreadId : null,
      };
    });
  },

  setThreadTitleIfEmpty(threadId, title) {
    set((state) => ({
      threads: state.threads.map((thread) =>
        thread.id === threadId && (!thread.title || thread.title === "New Chat")
          ? { ...thread, title }
          : thread
      ),
    }));
  },

  startEditingThread(threadId) {
    set({ editingThreadId: threadId });
  },

  stopEditingThread() {
    set({ editingThreadId: null });
  },

  setLoadingProjects(value) {
    set({ loadingProjects: value });
  },

  setLoadingThreads(value) {
    set({ loadingThreads: value });
  },

  /* ---------- Phase 3 extensions ---------- */
  searchQuery: "",

  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  bumpThread(threadId) {
    set((state) => {
      const now = Date.now();
      const threads = state.threads.map((t) =>
        t.id === threadId ? { ...t, lastActiveAt: now } : t
      );
      return { threads: sortThreads(threads) };
    });
  },

  moveToProject(threadId, projectId) {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId
          ? { ...t, projectId: projectId != null ? String(projectId) : null }
          : t
      ),
    }));
  },

  async createProject(name, authFetch) {
    const res = await authFetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create project");
    const data = await res.json();
    const project: MobileProject = {
      id: data.id ?? data.projectId ?? String(Date.now()),
      name,
      role: "owner",
    };
    set((state) => ({ projects: [...state.projects, project] }));
  },

  async pinThread(threadId, authFetch) {
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread) return;
    const nextPinned = !thread.pinned;
    const res = await authFetch(`${API_BASE}/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: nextPinned }),
    });
    if (!res.ok) throw new Error("Failed to pin thread");
    set((state) => {
      const threads = state.threads.map((t) =>
        t.id === threadId
          ? { ...t, pinned: nextPinned, pinnedOrder: nextPinned ? Date.now() : null }
          : t
      );
      return { threads: sortThreads(threads) };
    });
  },

  async deleteThreadRemote(threadId, authFetch) {
    const res = await authFetch(`${API_BASE}/api/threads/${threadId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete thread");
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
    }));
  },

  resetSidebar() {
    set({
      mode: "threads",
      activeProjectId: null,
      activeThreadId: null,
      editingThreadId: null,
      projects: [],
      threads: [],
      loadingProjects: false,
      loadingThreads: false,
      searchQuery: "",
    });
  },
}));

/**
 * Selector: returns threads filtered by active project.
 * Use this instead of filtering manually in components.
 */
export function useVisibleThreads(): MobileThread[] {
  const threads = useMobileSidebarStore((s) => s.threads);
  const activeProjectId = useMobileSidebarStore((s) => s.activeProjectId);
  return useMemo(() => {
    const key = String(activeProjectId ?? "null");
    return threads.filter((t) => String(t.projectId ?? "null") === key);
  }, [threads, activeProjectId]);
}
