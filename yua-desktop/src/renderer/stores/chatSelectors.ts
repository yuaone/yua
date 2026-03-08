import { useChatStore } from "./useChatStore";
import type { ChatMessageWithMeta } from "./useChatStore";

const EMPTY_MESSAGES: ChatMessageWithMeta[] = [];

export function useThreadMessages(threadId: number | null) {
  return useChatStore((s) => {
    if (threadId == null) return EMPTY_MESSAGES;
    return s.messagesByThread[threadId] ?? EMPTY_MESSAGES;
  });
}

export function useThreadHydrated(threadId: number | null) {
  return useChatStore((s) =>
    threadId != null && s.hydratedThreads.has(threadId)
  );
}
