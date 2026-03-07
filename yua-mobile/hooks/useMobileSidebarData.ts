import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  autoTitleSidebarThread,
  bumpSidebarThread,
  createSidebarThread,
  deleteSidebarThread,
  fetchSidebarProjects,
  fetchSidebarThreads,
  moveSidebarThread,
  renameSidebarThread,
  toggleSidebarThreadPin,
} from "@/lib/api/sidebar.api";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";

const AUTO_TITLE_KEY = "yua:mobile:autoTitledThreads";

async function readAutoTitled(): Promise<Record<number, true>> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_TITLE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeAutoTitled(value: Record<number, true>) {
  try {
    await AsyncStorage.setItem(AUTO_TITLE_KEY, JSON.stringify(value));
  } catch {
    // swallow
  }
}

export function useMobileSidebarData() {
  const {
    activeProjectId,
    threads,
    addThread,
    setProjects,
    setThreads,
    updateThread,
    touchThread,
    renameThread: renameThreadLocal,
    togglePin: togglePinLocal,
    deleteThread: deleteThreadLocal,
    setLoadingProjects,
    setLoadingThreads,
  } = useMobileSidebarStore();

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const projects = await fetchSidebarProjects();
      setProjects(projects);
    } finally {
      setLoadingProjects(false);
    }
  }, [setLoadingProjects, setProjects]);

  const loadThreads = useCallback(
    async (force = false) => {
      if (!force && threads.length > 0) {
        return;
      }

      setLoadingThreads(true);
      try {
        const fetched = await fetchSidebarThreads();
        const serverById = new Map(fetched.map((thread) => [thread.id, thread]));
        const merged = threads.map((localThread) => serverById.get(localThread.id) ?? localThread);

        fetched.forEach((serverThread) => {
          if (!merged.some((thread) => thread.id === serverThread.id)) {
            merged.push(serverThread);
          }
        });

        setThreads(merged);
      } finally {
        setLoadingThreads(false);
      }
    },
    [setLoadingThreads, setThreads, threads]
  );

  const createNewThread = useCallback(
    async (projectIdOverride?: string | null): Promise<number | null> => {
      const targetProjectId = projectIdOverride ?? activeProjectId ?? null;
      const threadId = await createSidebarThread(targetProjectId);
      if (!threadId) return null;

      const now = Date.now();
      addThread({
        id: threadId,
        title: "New Chat",
        projectId: targetProjectId,
        createdAt: now,
        lastActiveAt: now,
        pinned: false,
        pinnedOrder: null,
        caps: null,
      });

      return threadId;
    },
    [activeProjectId, addThread]
  );

  const renameThread = useCallback(
    async (threadId: number, title: string) => {
      const next = title.trim();
      if (!next) return;
      renameThreadLocal(threadId, next);
      await renameSidebarThread(threadId, next);
    },
    [renameThreadLocal]
  );

  const togglePin = useCallback(
    async (threadId: number) => {
      togglePinLocal(threadId);
      const result = await toggleSidebarThreadPin(threadId);
      if (!result) return;
      updateThread(threadId, {
        pinned: result.pinned ?? undefined,
        pinnedOrder: result.pinnedOrder ?? undefined,
      });
    },
    [togglePinLocal, updateThread]
  );

  const deleteThread = useCallback(
    async (threadId: number) => {
      deleteThreadLocal(threadId);
      await deleteSidebarThread(threadId);
    },
    [deleteThreadLocal]
  );

  const bumpThread = useCallback(
    async (threadId: number) => {
      const ts = await bumpSidebarThread(threadId);
      if (ts) {
        touchThread(threadId, ts);
      }
      return ts;
    },
    [touchThread]
  );

  const moveThread = useCallback(
    async (threadId: number, projectId: string | null) => {
      const success = await moveSidebarThread(threadId, projectId);
      if (!success) return false;
      updateThread(threadId, { projectId });
      return true;
    },
    [updateThread]
  );

  const autoTitleThread = useCallback(
    async (threadId: number, seedText: string) => {
      const called = await readAutoTitled();
      if (called[threadId]) return;
      called[threadId] = true;
      await writeAutoTitled(called);

      const result = await autoTitleSidebarThread(threadId, seedText);
      if (result.ok && result.title) {
        updateThread(threadId, { title: result.title });
      }
    },
    [updateThread]
  );

  return {
    loadProjects,
    loadThreads,
    createNewThread,
    renameThread,
    togglePin,
    deleteThread,
    bumpThread,
    moveThread,
    autoTitleThread,
  };
}
