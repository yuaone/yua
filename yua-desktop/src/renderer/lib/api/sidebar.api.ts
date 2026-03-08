// src/renderer/lib/api/sidebar.api.ts

import type { ID } from "yua-shared/types/common";
import type { Project, Thread } from "@/stores/useSidebarStore";
import { listProjects } from "@/lib/api/project";

/**
 * AuthContext.authFetch signature
 */
type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * Robust epoch(ms) normalizer
 * - number: assume ms (if it looks like seconds, upscale)
 * - string:
 *   - "1700000000000" -> number
 *   - ISO date -> Date.parse
 */
function toEpochMs(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    // seconds -> ms (very common API mismatch)
    if (v > 0 && v < 10_000_000_000) return v * 1000;
    return v;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return Date.now();
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return Date.now();
      if (n > 0 && n < 10_000_000_000) return n * 1000;
      return n;
    }
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

export async function autoTitleThreadApi(
  authFetch: AuthFetch,
  threadId: number,
  seed: string
): Promise<{ ok: boolean; title?: string }> {
  const res = await authFetch(
    `/api/chat/thread/${threadId}/auto-title`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed }),
    }
  );

  if (!res.ok) return { ok: false };
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export async function fetchProjects(
  authFetch: AuthFetch
): Promise<Project[]> {
  return listProjects(authFetch);
}

export async function fetchThreads(
  authFetch: AuthFetch,
  projectId: ID | null | undefined
): Promise<Thread[]> {
  // SSOT query contract
  // undefined => all
  // null      => general only
  // string    => project only
  const qs =
    projectId === undefined
      ? ""
      : projectId === null
        ? `?projectId=null`
        : `?projectId=${encodeURIComponent(String(projectId))}`;
  const res = await authFetch(`/api/chat/thread${qs}`);

  if (!res.ok) throw new Error("스레드 로드 실패");

  const data = await res.json();
  if (!data?.ok) return [];

  return data.threads.map((t: any) => ({
    id: Number(t.id),
    title: t.title,
    createdAt: toEpochMs(t.createdAt),
     lastActiveAt: toEpochMs(t.lastActiveAt ?? t.updatedAt ?? t.lastMessageAt ?? t.createdAt),
    projectId: t.projectId ?? null,
    pinned: Boolean(t.pinned),
    pinnedOrder: t.pinnedOrder ?? null,
    caps: t.caps ?? null,
  }));
}

export type GroupedThreadsResponse = {
  workspace: { id: string; name: string; type: "personal" | "shared"; role: string };
  threads: Thread[];
  threadCount: number;
  hasMore: boolean;
  collapsed: boolean;
};

export async function fetchGroupedThreads(
  authFetch: AuthFetch,
  perGroup: number = 10
): Promise<GroupedThreadsResponse[]> {
  const res = await authFetch(`/api/chat/thread/grouped?perGroup=${perGroup}`);
  if (!res.ok) throw new Error("그룹 스레드 로드 실패");
  const data = await res.json();
  if (!data?.ok) return [];

  return (data.groups ?? []).map((g: any) => ({
    workspace: g.workspace,
    threads: (g.threads ?? []).map((t: any) => ({
      id: Number(t.id),
      title: t.title,
      createdAt: toEpochMs(t.createdAt),
      lastActiveAt: toEpochMs(t.lastActivityAt ?? t.lastActiveAt ?? t.createdAt),
      projectId: t.projectId ?? null,
      pinned: Boolean(t.pinned),
      pinnedOrder: t.pinnedOrder ?? null,
      caps: t.caps ?? null,
      workspaceId: g.workspace.id,
    })),
    threadCount: g.threadCount ?? 0,
    hasMore: Boolean(g.hasMore),
    collapsed: false,
  }));
}

export async function createThread(
  authFetch: AuthFetch,
  projectId: ID | null
): Promise<number | null> {
  const res = await authFetch("/api/chat/thread", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const id = data?.threadId;
  const n = typeof id === "number" ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

/**
 * Move thread (General <-> Project)
 * POST /api/chat/thread/:id/move  body: { projectId: string | null }
 */
export async function moveThreadToProject(
  authFetch: AuthFetch,
  threadId: number,
  projectId: ID | null
): Promise<boolean> {
  const res = await authFetch(`/api/chat/thread/${threadId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) return false;
  try {
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return true; // ok(200) but body parse failed = treat as success
  }
}
 /**
 * Bump thread (last_activity_at = NOW)
 * POST /api/chat/thread/:id/bump
 */
export async function bumpThread(
  authFetch: AuthFetch,
  threadId: number
): Promise<number | null> {
  const res = await authFetch(`/api/chat/thread/${threadId}/bump`, {
    method: "POST",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.ok) return null;
  const ts = data?.lastActiveAt;
  return typeof ts === "number" ? ts : Date.now();
}

/**
 * backward compat alias
 */
export async function promoteThreadToProject(
  authFetch: AuthFetch,
  threadId: number,
  projectId: ID
): Promise<boolean> {
  return moveThreadToProject(authFetch, threadId, projectId);
}
