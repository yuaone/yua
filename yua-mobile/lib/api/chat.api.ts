import { mobileApiJson } from "@/lib/api/mobileApiClient";
import type { ChatMessage, ListMessagesResponse } from "yua-shared/chat/chat-types";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type SendChatPayload = {
  threadId: number;
  message: string;
  attachments?: unknown[];
  stream?: boolean;
  thinkingProfile?: string;
};

export async function sendChatPrompt(payload: SendChatPayload): Promise<void> {
  await mobileApiJson("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

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

function mapChatMessage(message: ChatMessage): MobileChatMessage {
  const meta = (message.meta ?? {}) as Record<string, unknown>;
  const attachments = (meta.attachments as MobileChatMessage["attachments"]) ?? (message as any).attachments;
  return {
    id: String(message.id),
    threadId: Number(message.threadId),
    role: message.role,
    traceId: message.traceId,
    content: message.content ?? "",
    createdAt: toEpochMs(message.createdAt),
    streaming: false,
    finalized: true,
    meta: meta as any,
    attachments,
  };
}

export async function fetchChatMessages(threadId: number): Promise<MobileChatMessage[] | null> {
  if (!Number.isFinite(threadId) || threadId <= 0) return null;
  try {
    const data = await mobileApiJson<ListMessagesResponse>(`/api/chat/message?threadId=${threadId}`);
    if (!data?.ok) return null;
    const list = Array.isArray(data.messages) ? data.messages : [];
    return list.map(mapChatMessage);
  } catch {
    return null;
  }
}
