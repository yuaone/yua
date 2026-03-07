  "use client";

  import { create } from "zustand";
  import type { ID } from "yua-shared/types/common";

  /* =========================
    Types
  ========================= */

  export type Project = {
    id: ID;
    name: string;
    role?: "owner" | "editor" | "viewer" | string;
  };

  export type ThreadCaps = {
    canRead: boolean;
    canWrite: boolean;
    canRename: boolean;
    canDelete: boolean;
    canPin: boolean;
    canMove: boolean;
  };

  export type Thread = {
    id: number;
    title: string;
    createdAt: number;
    lastActiveAt?: number;
    projectId: string | null;
    pinned?: boolean;
    pinnedOrder?: number | null;
    caps?: ThreadCaps | null;
    workspaceId?: string;
  };

  export type WorkspaceInfo = {
    id: string;
    name: string;
    type: "personal" | "shared";
    role: string;
  };

  export type WorkspaceThreadGroup = {
    workspace: WorkspaceInfo;
    threads: Thread[];
    threadCount: number;
    hasMore: boolean;
    collapsed: boolean;
  };

  type SidebarState = {
    /* ================= Core ================= */
    activeProjectId: ID | null;
    activeThreadId: number | null;

    projects: Project[];
    threads: Thread[];

    /* ================= UI ================= */
    editingThreadId: number | null;

    /* ================= Loading ================= */
    loadingProjects: boolean;
    loadingThreads: boolean;

    /* ================= Grouped Threads ================= */
    threadGroups: WorkspaceThreadGroup[];
    loadingGroups: boolean;

    setThreadGroups(groups: WorkspaceThreadGroup[]): void;
    toggleGroupCollapse(workspaceId: string): void;
    appendThreadsToGroup(workspaceId: string, threads: Thread[], hasMore: boolean): void;
    setLoadingGroups(v: boolean): void;

    /* ================= Project ================= */
    setProjects(projects: Project[]): void;
    setActiveProject(projectId: ID | null): void;
    setActiveContext(projectId: ID | null, threadId: number | null): void;

    /* ================= Thread ================= */
    setThreads(threads: Thread[]): void;
    setActiveThread(threadId: number | null): void;
    addThread(thread: Thread): void;
    renameThreadLocal(threadId: number, title: string): void;
    togglePinLocal(threadId: number): void;
    deleteThreadLocal(threadId: number): void;

    updateThread(threadId: number, patch: Partial<Thread>): void;
    touchThread(threadId: number, at?: number): void;

    /**
     * 🔥 자동 제목 생성용
     * - title 이 기본값일 때만 변경
     * - 첫 질문 이후 1회만 사용
     */
    setThreadTitleIfEmpty(threadId: number, title: string): void;

    /* ================= Editing ================= */
    startEditingThread(threadId: number): void;
    stopEditingThread(): void;

    /* ================= Loading ================= */
    setLoadingProjects(v: boolean): void;
    setLoadingThreads(v: boolean): void;

    /* ================= Reset ================= */
    reset(): void;
  };

  /* =========================
    Helpers (SSOT)
  ========================= */

  function sortThreads(threads: Thread[]): Thread[] {
    const pinned = threads
      .filter((t) => t.pinned)
      .sort(
        (a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0)
      );

    const normal = threads
      .filter((t) => !t.pinned)
      .sort((a, b) => {
        const aAct = (a.lastActiveAt ?? a.createdAt ?? 0);
        const bAct = (b.lastActiveAt ?? b.createdAt ?? 0);
        if (bAct !== aAct) return bAct - aAct;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });

    return [...pinned, ...normal];
  }

  function isEmptyTitle(title: string) {
    const t = title.trim();
    return (
      t === "" ||
      t === "새 채팅" ||
      t === "New Chat"
    );
  }

  /* =========================
    Store (SSOT FINAL)
  ========================= */

  export const useSidebarStore = create<SidebarState>((set, get) => ({
    /* ================= Core ================= */
    activeProjectId: null,
    activeThreadId: null,

    projects: [],
    threads: [],

    /* ================= UI ================= */
    editingThreadId: null,

    /* ================= Loading ================= */
    loadingProjects: false,
    loadingThreads: false,

    /* ================= Grouped Threads ================= */
    threadGroups: [],
    loadingGroups: false,

    setThreadGroups(groups) {
      // Also derive flat threads[] from all groups for backward compat
      const allThreads: Thread[] = [];
      for (const g of groups) {
        for (const t of g.threads) {
          allThreads.push({ ...t, workspaceId: g.workspace.id });
        }
      }
      const sorted = sortThreads(allThreads);
      set((s) => ({
        threadGroups: groups,
        threads: sorted,
        activeThreadId: s.activeThreadId != null && sorted.some(t => t.id === s.activeThreadId) ? s.activeThreadId : s.activeThreadId,
      }));
    },

    toggleGroupCollapse(workspaceId) {
      set((s) => ({
        threadGroups: s.threadGroups.map(g =>
          g.workspace.id === workspaceId ? { ...g, collapsed: !g.collapsed } : g
        ),
      }));
    },

    appendThreadsToGroup(workspaceId, newThreads, hasMore) {
      set((s) => {
        const groups = s.threadGroups.map(g => {
          if (g.workspace.id !== workspaceId) return g;
          const existingIds = new Set(g.threads.map(t => t.id));
          const unique = newThreads.filter(t => !existingIds.has(t.id));
          return { ...g, threads: [...g.threads, ...unique], hasMore };
        });
        // Re-derive flat threads
        const allThreads: Thread[] = [];
        for (const g of groups) {
          for (const t of g.threads) {
            allThreads.push({ ...t, workspaceId: g.workspace.id });
          }
        }
        return { threadGroups: groups, threads: sortThreads(allThreads) };
      });
    },

    setLoadingGroups(v) {
      set({ loadingGroups: v });
    },

    /* ================= Project ================= */
    setProjects(projects) {
      set({ projects });
    },

    // legacy alias (외부 호환)
    setActiveProject(projectId) {
      get().setActiveContext(projectId, null);
    },

    // ✅ SSOT: project + thread 컨텍스트를 한 번에 고정
    setActiveContext(projectId, threadId) {
      set((s) => {
        // threadId가 주어졌으면, 그 thread가 해당 project에 속하는지 검증
        if (threadId != null) {
          const ok = s.threads.some(
            (t) =>
              t.id === threadId &&
              String(t.projectId ?? "null") === String(projectId ?? "null")
          );
          return {
            activeProjectId: projectId,
            activeThreadId: ok ? threadId : null,
            editingThreadId: null,
          };
        }

        // threadId가 null이면: overview 컨텍스트로 이동 (thread 선택 해제)
        return {
          activeProjectId: projectId,
          activeThreadId: null,
          editingThreadId: null,
        };
      });
    },


    /* ================= Thread ================= */

    setThreads(threads) {
      const sorted = sortThreads(threads);
      console.log("[SIDEBAR][setThreads] incoming", {
        count: threads.length,
        threads: threads.map((t) => ({ id: t.id, title: t.title })),
      });

      // ✅ 서버 기준 threads가 갱신될 때, activeThreadId가 목록에서 사라졌으면만 null 처리
      set((s) => {
     const merged = sorted.map((incoming) => {
       return incoming; // 🔥 서버 값 그대로 신뢰
     });
        console.log("[SIDEBAR][setThreads] prev", {
          count: s.threads.length,
          threads: s.threads.map((t) => ({ id: t.id, title: t.title })),
        });
        const stillExists =
          s.activeThreadId != null &&
          merged.some((t) => t.id === s.activeThreadId);
        const next = {
          threads: sorted,
          activeThreadId: stillExists ? s.activeThreadId : null,
        };
        console.log("[SIDEBAR][setThreads] next", {
          count: next.threads.length,
          threads: next.threads.map((t) => ({ id: t.id, title: t.title })),
          activeThreadId: next.activeThreadId,
        });
        return {
          threads: merged,
          activeThreadId: stillExists ? s.activeThreadId : null,
        };
      });
    },

   addThread(thread) {
      console.log("[SIDEBAR][addThread] incoming", {
        id: thread.id,
        title: thread.title,
      });
      set((s) => {
        const newThreads = sortThreads([...s.threads, thread]);
        // Also add to matching workspace group if threadGroups exist
        const groups = s.threadGroups.length > 0 ? s.threadGroups.map(g => {
          if (thread.workspaceId && g.workspace.id === thread.workspaceId) {
            return { ...g, threads: sortThreads([...g.threads, thread]), threadCount: g.threadCount + 1 };
          }
          return g;
        }) : s.threadGroups;
        return { threads: newThreads, threadGroups: groups };
      });
      const s = get();
      console.log("[SIDEBAR][addThread] next", {
        count: s.threads.length,
        threads: s.threads.map((t) => ({ id: t.id, title: t.title })),
      });
    },


    setActiveThread(threadId: number | null) {
  set((s) => {
    if (threadId != null) {
      const ts = Date.now();
      return {
        activeThreadId: threadId,
        editingThreadId: null,
        threads: sortThreads(
          s.threads.map((t) =>
            t.id === threadId
              ? { ...t, lastActiveAt: ts }
              : t
          )
        ),
      };
    }

    return {
      activeThreadId: null,
      editingThreadId: null,
    };
  });
    },

    /* ---------- Local Mutations ---------- */

    renameThreadLocal(threadId, title) {
      const next = title.trim();
      if (!next) return;

      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId ? { ...t, title: next } : t
        ),
        editingThreadId: null,
      }));
    },

    togglePinLocal(threadId) {
      set((s) => {
        const next = s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                pinned: !t.pinned,
                pinnedOrder: !t.pinned
                  ? Date.now()
                  : null,
              }
            : t
        );

        return {
          threads: sortThreads(next),
        };
      });
    },

    deleteThreadLocal(threadId) {
      set((s) => {
        const next = s.threads.filter(
          (t) => t.id !== threadId
        );

        const groups = s.threadGroups.map(g => ({
          ...g,
          threads: g.threads.filter(t => t.id !== threadId),
          threadCount: g.threads.some(t => t.id === threadId) ? g.threadCount - 1 : g.threadCount,
        }));

        return {
          threads: next,
          threadGroups: groups,
          activeThreadId:
            s.activeThreadId === threadId
              ? null
              : s.activeThreadId,
          editingThreadId:
            s.editingThreadId === threadId
              ? null
              : s.editingThreadId,
        };
      });
    },

    /* ---------- Server-authoritative Patch ---------- */

    updateThread(threadId, patch) {
      console.log("[SIDEBAR][updateThread] incoming", {
        threadId,
        patch,
      });
      set((s) => ({
        threads: sortThreads(
          s.threads.map((t) =>
            t.id === threadId ? { ...t, ...patch } : t
          )
        ),
        threadGroups: s.threadGroups.map(g => ({
          ...g,
          threads: sortThreads(
            g.threads.map(t =>
              t.id === threadId ? { ...t, ...patch } : t
            )
          ),
        })),
      }));
      const s = get();
      console.log("[SIDEBAR][updateThread] next", {
        count: s.threads.length,
        threads: s.threads.map((t) => ({ id: t.id, title: t.title })),
      });
    },

        touchThread(threadId, at) {
      const ts = Number.isFinite(at as any) ? (at as number) : Date.now();
      set((s) => ({
        threads: sortThreads(
          s.threads.map((t) =>
            t.id === threadId
              ? { ...t, lastActiveAt: ts }
              : t
          )
        ),
      }));
    },

    /* =========================
      🔥 Auto Title (NEW)
    ========================= */

    setThreadTitleIfEmpty(threadId, title) {
      const next = title.trim();
      if (!next) return;

      set((s) => {
        const target = s.threads.find(
          (t) => t.id === threadId
        );
        if (!target) return {};

        if (!isEmptyTitle(target.title)) {
          return {};
        }

        return {
          threads: sortThreads(
            s.threads.map((t) =>
              t.id === threadId
                ? { ...t, title: next }
                : t
            )
          ),
        };
      });
    },

    /* ================= Editing ================= */

    startEditingThread(threadId: number) {
      set({ editingThreadId: threadId });
    },

    stopEditingThread() {
      set({ editingThreadId: null });
    },

    /* ================= Loading ================= */

    setLoadingProjects(v) {
      set({ loadingProjects: v });
    },

    setLoadingThreads(v) {
      set({ loadingThreads: v });
    },

    /* ================= Reset ================= */

    reset() {
      console.log("[SIDEBAR][reset] prev", {
        count: get().threads.length,
        threads: get().threads.map((t) => ({ id: t.id, title: t.title })),
        activeThreadId: get().activeThreadId,
        activeProjectId: get().activeProjectId,
      });
      set({
        activeProjectId: null,
        activeThreadId: null,
        projects: [],
        threads: [],
        threadGroups: [],
        editingThreadId: null,
        loadingProjects: false,
        loadingThreads: false,
        loadingGroups: false,
      });
      console.log("[SIDEBAR][reset] next", {
        count: get().threads.length,
        threads: get().threads.map((t) => ({ id: t.id, title: t.title })),
        activeThreadId: get().activeThreadId,
        activeProjectId: get().activeProjectId,
      });
    },
  }));
