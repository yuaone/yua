import type { APIClient } from "../../core/api-client";
import type { ChatThread } from "../../types/chat";

export class Threads {
  private readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async create(params?: {
    title?: string;
    projectId?: string;
  }): Promise<ChatThread> {
    const res = await this.client.post<{
      ok: boolean;
      threadId: number;
    }>("/api/chat/thread", params ?? {});

    return {
      id: res.threadId,
      title: params?.title ?? "",
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  async list(params?: {
    projectId?: string;
    limit?: number;
  }): Promise<{ data: ChatThread[]; has_more: boolean }> {
    const query = new URLSearchParams();
    if (params?.projectId) query.set("projectId", params.projectId);
    if (params?.limit) query.set("perGroup", String(params.limit));

    const qs = query.toString();
    const path = `/api/chat/thread${qs ? `?${qs}` : ""}`;

    const res = await this.client.get<{
      ok: boolean;
      threads: Array<{
        id: number;
        title: string;
        createdAt?: string;
        created_at?: number;
      }>;
    }>(path);

    return {
      data: (res.threads ?? []).map((t) => ({
        id: t.id,
        title: t.title ?? "",
        created_at: t.created_at ?? (t.createdAt ? new Date(t.createdAt).getTime() / 1000 : 0),
      })),
      has_more: false,
    };
  }

  async update(
    threadId: number,
    params: { title: string },
  ): Promise<{ ok: boolean }> {
    return this.client.put(`/api/chat/thread/${threadId}`, params);
  }

  async del(threadId: number): Promise<{ ok: boolean }> {
    return this.client.delete(`/api/chat/thread/${threadId}`);
  }
}
