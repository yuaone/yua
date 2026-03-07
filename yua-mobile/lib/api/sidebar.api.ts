import { mobileApiJson, mobileAuthFetch } from "@/lib/api/mobileApiClient";
import type { MobileProject, MobileThread } from "@/types/sidebar";

type ThreadsResponse = {
  ok?: boolean;
  threads?: {
    id: number | string;
    title?: string;
    projectId?: string | null;
    createdAt?: number | string;
    lastActiveAt?: number | string;
    pinned?: boolean;
    pinnedOrder?: number | null;
    caps?: MobileThread["caps"];
  }[];
};

type ProjectsResponse = {
  ok?: boolean;
  projects?: { id: string; name: string; role?: string }[];
};

function toEpochMs(value: number | string | undefined): number {
  if (typeof value === "number") {
    if (value > 0 && value < 10_000_000_000) return value * 1000;
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return Date.now();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (parsed > 0 && parsed < 10_000_000_000) return parsed * 1000;
      return parsed;
    }

    const parsedDate = Date.parse(trimmed);
    return Number.isFinite(parsedDate) ? parsedDate : Date.now();
  }

  return Date.now();
}

export async function fetchSidebarProjects(): Promise<MobileProject[]> {
  try {
    const data = await mobileApiJson<ProjectsResponse>("/api/project/list");
    const rows = Array.isArray(data.projects) ? data.projects : [];
    return rows.map((project) => ({
      id: String(project.id),
      name: project.name ?? "Untitled",
      role: project.role,
    }));
  } catch {
    return [];
  }
}

export async function fetchSidebarThreads(projectId?: string | null): Promise<MobileThread[]> {
  try {
    const qs =
      projectId === undefined
        ? ""
        : projectId === null
          ? "?projectId=null"
          : `?projectId=${encodeURIComponent(projectId)}`;

    const data = await mobileApiJson<ThreadsResponse>(`/api/chat/thread${qs}`);
    const rows = Array.isArray(data.threads) ? data.threads : [];

    return rows.map((thread) => {
      const createdAt = toEpochMs(thread.createdAt);
      return {
        id: Number(thread.id),
        title: thread.title?.trim() || "New Chat",
        projectId: thread.projectId ?? null,
        createdAt,
        lastActiveAt: toEpochMs(thread.lastActiveAt ?? thread.createdAt),
        pinned: Boolean(thread.pinned),
        pinnedOrder: thread.pinnedOrder ?? null,
        caps: thread.caps ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function createSidebarThread(projectId: string | null): Promise<number | null> {
  try {
    const data = await mobileApiJson<{ ok?: boolean; threadId?: number | string }>("/api/chat/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    const id = data.threadId;
    const n = typeof id === "number" ? id : Number(id);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function renameSidebarThread(threadId: number, title: string): Promise<boolean> {
  try {
    const res = await mobileAuthFetch(`/api/chat/thread/${threadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function moveSidebarThread(
  threadId: number,
  projectId: string | null
): Promise<boolean> {
  try {
    const res = await mobileAuthFetch(`/api/chat/thread/${threadId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function toggleSidebarThreadPin(threadId: number): Promise<{ pinned?: boolean; pinnedOrder?: number | null } | null> {
  try {
    const data = await mobileApiJson<{ thread?: { pinned?: boolean; pinnedOrder?: number | null } }>(
      `/api/chat/thread/${threadId}/pin`,
      { method: "POST" }
    );
    return data.thread ?? null;
  } catch {
    return null;
  }
}

export async function deleteSidebarThread(threadId: number): Promise<boolean> {
  try {
    const res = await mobileAuthFetch(`/api/chat/thread/${threadId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function bumpSidebarThread(threadId: number): Promise<number | null> {
  try {
    const data = await mobileApiJson<{ ok?: boolean; lastActiveAt?: number }>(
      `/api/chat/thread/${threadId}/bump`,
      { method: "POST" }
    );
    const ts = data.lastActiveAt;
    if (typeof ts === "number") return ts;
    return Date.now();
  } catch {
    return null;
  }
}

export async function autoTitleSidebarThread(threadId: number, seed: string): Promise<{ ok?: boolean; title?: string }> {
  try {
    return await mobileApiJson<{ ok?: boolean; title?: string }>(
      `/api/chat/thread/${threadId}/auto-title`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed }),
      }
    );
  } catch {
    return { ok: false };
  }
}
