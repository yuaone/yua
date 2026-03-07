// 🔥 YUA ONE Chat API Client — THREAD / MESSAGE (SSOT SAFE)

export type ThreadSummary = {
  id: number;
  title: string;
  createdAt: number;
  projectId?: string | null;
};

export type ListThreadsResponse = {
  ok: boolean;
  threads?: ThreadSummary[];
  error?: string;
};

export type CreateThreadResponse = {
  ok: boolean;
  threadId?: number;
  error?: string;
};

export type RenameThreadResponse = {
  ok: boolean;
  error?: string;
};

export type ChatMessageRow = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export function createChatAPI(authFetch: FetchLike) {
  if (!authFetch) {
    throw new Error("[ChatAPI] authFetch is required");
  }

  const f = authFetch;

  return {
    /* ---------------- Threads ---------------- */

    async listThreads(opts?: { projectId?: string }) {
      const qs =
        typeof opts?.projectId === "string"
          ? `?projectId=${encodeURIComponent(opts.projectId)}`
          : "";

      const res = await f(`/api/chat/thread${qs}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        return { ok: false };
      }

      return (await res.json()) as ListThreadsResponse;
    },

    async createThread(
      title: string,
      projectId?: string | null
    ): Promise<CreateThreadResponse> {
      const res = await f("/api/chat/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ title, projectId }),
      });

      if (!res.ok) {
        return { ok: false };
      }

      return (await res.json()) as CreateThreadResponse;
    },

    async renameThread(
      threadId: number,
      title: string
    ): Promise<RenameThreadResponse> {
      const res = await f(`/api/chat/thread/${threadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ title }),
      });

      if (!res.ok) {
        return { ok: false };
      }

      return (await res.json()) as RenameThreadResponse;
    },

    async deleteThread(threadId: number) {
      const res = await f(`/api/chat/thread/${threadId}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) {
        return { ok: false };
      }

      return res.json();
    },

    /* ---------------- Messages ---------------- */

    async listMessages(threadId: number) {
      if (!Number.isFinite(threadId)) {
        return { ok: false, messages: [] };
      }

      const res = await f(
        `/api/chat/message?threadId=${threadId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        return { ok: false, messages: [] };
      }

      return res.json();
    },

    async createMessage(params: {
      threadId: number;
      role: "user" | "assistant";
      content: string;
      model?: string;
    }) {
      const res = await f("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        return { ok: false };
      }

      return res.json();
    },
  };
}
