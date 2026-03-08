import type { APIClient } from "../../core/api-client";
import type { ChatMessage } from "../../types/chat";

export class Messages {
  private readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async list(
    threadId: number,
    params?: { limit?: number },
  ): Promise<{ data: ChatMessage[] }> {
    const query = new URLSearchParams();
    query.set("threadId", String(threadId));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await this.client.get<{
      ok: boolean;
      messages: ChatMessage[];
    }>(`/api/chat/message?${query.toString()}`);

    return { data: res.messages ?? [] };
  }

  async create(
    threadId: number,
    params: {
      role: "user";
      content: string;
      attachments?: { file_id: string }[];
    },
  ): Promise<{ ok: boolean; messageId?: string }> {
    return this.client.post("/api/chat/message", {
      threadId,
      role: params.role,
      content: params.content,
      files: params.attachments?.map((a) => a.file_id),
    });
  }
}
