"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarStore } from "@/store/useSidebarStore";
import {
  fetchProjects,
  fetchThreads,
  createThread,
  moveThreadToProject,
  bumpThread as bumpThreadApi,
  autoTitleThreadApi,
  fetchGroupedThreads,
} from "@/lib/api/sidebar.api";
import type { ID } from "yua-shared/types/common";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";

/**
 * Sidebar Data Layer (SSOT FINAL – UI ↔ Server Sync)
 * - Sidebar는 "목록 상태"만 책임
 * - Chat 흐름/제목 생성에는 직접 관여하지 않음
 *
 * ✅ 단, "자동 제목 1회" 트리거는 Stream DONE 이후 Chat Hook에서 호출한다.
 */

const AUTO_TITLE_LS_KEY = "yua:autoTitledThreads";

function readAutoTitled(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(AUTO_TITLE_LS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAutoTitled(next: Record<string, true>) {
  localStorage.setItem(AUTO_TITLE_LS_KEY, JSON.stringify(next));
}

function buildAutoTitleFromSeed(seed: string): string {
  if (!seed) return "New Chat";
  if (seed.trim() === "[IMAGE_INPUT]") return "이미지 분석…";

  const cleaned = seed
    .replace(/\n+/g, " ")
    .replace(/[`*_#>\[\]()<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "New Chat";

  // 질문/요청 의도 중심으로 1줄 뽑기
  const questionMatch = cleaned.match(
    /(.+?\?|.+?(하는 법|방법|차이|이유|원인|가능할까|어떻게))/i
  );

  let base =
    questionMatch?.[0] ??
    cleaned.slice(0, 40);

  base = base
    .replace(/^(혹시|일단|지금|그냥)\s+/i, "")
    .replace(/좀\s+/i, "")
    .trim();

  const MAX = 24;
  if (base.length > MAX) {
    const cut = base.slice(0, MAX);
    const lastSpace = cut.lastIndexOf(" ");
    base = lastSpace > 12 ? cut.slice(0, lastSpace) : cut;
    base = base.replace(/[.,]$/, "").trim() + "…";
  }

  return base || "New Chat";
}  

export function useSidebarData() {
  const { authFetch } = useAuth();

  const {
    setProjects,
    setThreads,
    setLoadingProjects,
    setLoadingThreads,
    activeProjectId,

    renameThreadLocal,
    togglePinLocal,
    deleteThreadLocal,
    updateThread,
    touchThread,
    addThread,
    setThreadGroups,
    setLoadingGroups,
    appendThreadsToGroup,
    // startEditingThread 는 createNewThread에서 즉시 호출하면 자동제목과 충돌하므로 사용 안 함
  } = useSidebarStore();

  /* =========================
     ✅ Bump Thread (optimistic)
  ========================= */
  const bumpThread = useCallback(
    async (threadId: number) => {
      if (!authFetch) return;

      // 1) 즉시 상단 이동
      touchThread(threadId, Date.now());

      // 2) 서버 확정
      const ts = await bumpThreadApi(authFetch, threadId);
      if (typeof ts === "number") {
        touchThread(threadId, ts);
      }
    },
    [authFetch, touchThread]
  );

    /* =========================
     Promote Thread → Project
  ========================= */
  const moveThread = useCallback(
    async (threadId: number, projectId: ID | null): Promise<boolean> => {
      if (!authFetch) return false;

      try {
        return await moveThreadToProject(authFetch, threadId, projectId);
      } catch (e) {
        console.error("[SIDEBAR][MOVE_THREAD][ERROR]", e);
        return false;
      }
    },
    [authFetch]
  );

  /* =========================
     Projects
  ========================= */
  const loadProjects = useCallback(async () => {
    if (!authFetch) return;

    const wsAtStart =
      useWorkspaceStore.getState().activeWorkspaceId ?? null;

    setLoadingProjects(true);
    try {
      const projects = await fetchProjects(authFetch);
       const wsNow =
        useWorkspaceStore.getState().activeWorkspaceId ?? null;
      if (wsNow !== wsAtStart) return;
      setProjects(projects);
    } catch (e) {
      console.error("[SIDEBAR][LOAD_PROJECTS][ERROR]", e);
    } finally {
      const wsNow =
        useWorkspaceStore.getState().activeWorkspaceId ?? null;
      if (wsNow === wsAtStart) setLoadingProjects(false);
    }
  }, [authFetch, setProjects, setLoadingProjects]);

  /* =========================
     Threads
  ========================= */
    const loadThreads = useCallback(
    async () => {
      if (!authFetch) return;
 const { threads } = useSidebarStore.getState();
 if (threads && threads.length > 0) {
   console.log("[SIDEBAR][loadThreads] skipped (already hydrated)");
   return;
 }

      console.log("[SIDEBAR][loadThreads] start");

  const wsAtStart =
        useWorkspaceStore.getState().activeWorkspaceId ?? null;

      setLoadingThreads(true);
      try {
        const threads = await fetchThreads(authFetch, undefined);
        console.log("[SIDEBAR][loadThreads] fetched", {
          count: threads.length,
          threads: threads.map((t) => ({ id: t.id, title: t.title })),
        });
           const wsNow =
          useWorkspaceStore.getState().activeWorkspaceId ?? null;
        if (wsNow !== wsAtStart) return;
 const current = useSidebarStore.getState().threads ?? [];
 const serverMap = new Map(threads.map(t => [t.id, t]));

 const merged = current.map(local => {
   const server = serverMap.get(local.id);
   if (!server) return local;

   return { ...server };
 });

 // 서버에만 있는 thread 추가
 threads.forEach(server => {
   if (!current.find(l => l.id === server.id)) {
     merged.push(server);
   }
 });

 setThreads(merged);
      } catch (e) {
        console.error("[SIDEBAR][LOAD_THREADS][ERROR]", e);
      } finally {
        const wsNow =
          useWorkspaceStore.getState().activeWorkspaceId ?? null;
        if (wsNow === wsAtStart) setLoadingThreads(false);
      }
    },
    [authFetch, setThreads, setLoadingThreads]
  );

  /* =========================
     Grouped Threads (all workspaces)
  ========================= */
  const loadGroupedThreads = useCallback(
    async () => {
      if (!authFetch) return;

      setLoadingGroups(true);
      try {
        const groups = await fetchGroupedThreads(authFetch, 15);
        setThreadGroups(groups);
      } catch (e) {
        console.error("[SIDEBAR][LOAD_GROUPED][ERROR]", e);
        // Fallback to single-workspace load
        await loadThreads();
      } finally {
        setLoadingGroups(false);
      }
    },
    [authFetch, setThreadGroups, setLoadingGroups, loadThreads]
  );

  /* =========================
     Create Thread
     - 서버 생성 → 목록 sync
     - 제목은 "첫 질문 + Stream DONE"에서 자동 생성 (ChatStream 책임)
     - ✅ 여기서 startEditingThread 즉시 호출 금지 (자동제목/애니메이션과 충돌)
  ========================= */
  const createNewThread = useCallback(
    async (projectIdOverride?: ID | null): Promise<number | null> => {
      if (!authFetch) return null;

      try {
        const targetProjectId = projectIdOverride ?? activeProjectId;
        console.log("[SIDEBAR][createNewThread] CALLED", {
          projectIdOverride,
          activeProjectId,
          targetProjectId,
        });
        const id = await createThread(authFetch, targetProjectId);
        const threadId = Number(id);
        if (!Number.isFinite(threadId)) return null;

        const now = Date.now();

        addThread({
          id: threadId,
          title: "New Chat",
          createdAt: now,
          lastActiveAt: now,
          projectId: targetProjectId ?? null,
          pinned: false,
          pinnedOrder: null,
          caps: null,
          workspaceId: useWorkspaceStore.getState().activeWorkspaceId ?? undefined,
        });
   

        return threadId;
      } catch (e) {
        console.error("[SIDEBAR][CREATE_THREAD][ERROR]", e);
        return null;
      }
    },
    [authFetch, activeProjectId, loadThreads, addThread]
  );

  /* =========================
     Rename Thread (Optimistic + Guard)
  ========================= */
  const renameThread = useCallback(
    async (threadId: number, title: string) => {
      if (!authFetch) return;

      const next = title.trim();
      if (!next) return;

      // optimistic
      renameThreadLocal(threadId, next);

      try {
        const res = await authFetch(`/api/chat/thread/${threadId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: next }),
        });

        if (!res.ok) {
          console.error("[SIDEBAR][RENAME][FAILED]", res.status);
        }
      } catch (e) {
        console.error("[SIDEBAR][RENAME][ERROR]", e);
      }
    },
    [authFetch, renameThreadLocal]
  );

  /* =========================
     ✅ Auto Title (SSOT)
     - Stream DONE 이후 1회만 호출
     - New Chat 상태에서만 덮어씀
     - 이미 user rename 되었으면 절대 덮어쓰기 금지
  ========================= */
  const autoTitleThread = useCallback(
    async (threadId: number, seedText: string) => {
      if (!authFetch) return;

      const optimisticTitle = buildAutoTitleFromSeed(seedText);
      if (!optimisticTitle || optimisticTitle === "New Chat") return;

      const called = readAutoTitled();
      if (called[threadId]) return;

      called[threadId] = true;
      writeAutoTitled(called);

      updateThread(threadId, {
        lastActiveAt: Date.now(),
      });
      const result = await autoTitleThreadApi(
        authFetch,
        threadId,
        seedText
      );

if (result.ok && result.title) {
  updateThread(threadId, { title: result.title });
} else if (result.ok && !result.title) {
  // Backend enqueued async LLM job — SSE is closed before title arrives.
  // Poll the thread list to pick up the generated title.
  const pollTitle = async (attempt: number) => {
    if (attempt > 2) return;
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const threads = await fetchThreads(authFetch, undefined);
      const t = threads.find((x) => x.id === threadId);
      if (t?.title && t.title !== "New Chat") {
        updateThread(threadId, { title: t.title });
      } else if (attempt < 2) {
        await pollTitle(attempt + 1);
      }
    } catch {}
  };
  void pollTitle(0);
}
    },
    [authFetch, updateThread]
  );

  /* =========================
     Toggle Pin (Optimistic + Server Authoritative)
  ========================= */
  const togglePin = useCallback(
    async (threadId: number) => {
      if (!authFetch) return;

      togglePinLocal(threadId);

      try {
        const res = await authFetch(`/api/chat/thread/${threadId}/pin`, {
          method: "POST",
        });

        if (!res.ok) {
          console.error("[SIDEBAR][PIN][FAILED]", res.status);
          return;
        }

        const data = await res.json();
        if (!data?.thread) return;

        updateThread(threadId, {
          pinned: data.thread.pinned,
          pinnedOrder: data.thread.pinnedOrder,
        });
      } catch (e) {
        console.error("[SIDEBAR][PIN][ERROR]", e);
      }
    },
    [authFetch, togglePinLocal, updateThread]
  );

  /* =========================
     Delete Thread
  ========================= */
  const deleteThread = useCallback(
    async (threadId: number) => {
      if (!authFetch) return;

      deleteThreadLocal(threadId);

      try {
        await authFetch(`/api/chat/thread/${threadId}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("[SIDEBAR][DELETE][ERROR]", e);
      }
    },
    [authFetch, deleteThreadLocal]
  );

  return {
    loadProjects,
    loadThreads,
    loadGroupedThreads,
    createNewThread,
    renameThread,
    togglePin,
    deleteThread,
    autoTitleThread,

    // ✅ ThreadContextMenu/Modal에서 호출 (caps 기반)
    moveThread,
    bumpThread,
  };
}
