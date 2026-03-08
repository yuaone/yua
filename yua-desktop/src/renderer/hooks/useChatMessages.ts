// src/renderer/hooks/useChatMessages.ts

import { useCallback } from "react";
import { useAuth } from "@/contexts/DesktopAuthContext";
import type { ListMessagesResponse } from "yua-shared/chat/chat-types";
import type { ChatMessage } from "yua-shared/chat/chat-types";

export function useChatMessages() {
  const { authFetch } = useAuth();

  const loadMessages = useCallback(
    async (threadId: number): Promise<ChatMessage[] | null> => {
      if (!authFetch) return null;
      if (!Number.isFinite(threadId) || threadId <= 0) return null;

      try {
        const res = await authFetch(
          `/api/chat/message?threadId=${threadId}`
        );
        if (!res.ok) {
          console.error("[LOAD MESSAGES FAILED]", res.status);
          return null;
        }

        const data = (await res.json()) as ListMessagesResponse;
        if (process.env.NODE_ENV === "development") {
          console.log("[API_MESSAGES_RAW]", data);
          console.log("[FRONT_FETCH_RESPONSE]", {
            threadId,
            ok: data?.ok,
            count: Array.isArray((data as any)?.messages)
              ? (data as any).messages.length
              : null,
            first: Array.isArray((data as any)?.messages) && (data as any).messages[0]
              ? {
                  id: (data as any).messages[0].id,
                  role: (data as any).messages[0].role,
                  traceId: (data as any).messages[0].traceId,
                  meta: (data as any).messages[0].meta ?? null,
                }
              : null,
          });
        }
        if (!data?.ok) return null;

        const list = Array.isArray(data.messages) ? data.messages : [];
        if (process.env.NODE_ENV === "development") {
          for (const m of list as any[]) {
            console.log("[HYDRATION_MESSAGE]", {
              id: m?.id,
              role: m?.role,
              meta: m?.meta ?? null,
            });
          }
        }
        return list;
      } catch (err) {
        console.error("[LOAD MESSAGES FAILED]", err);
        return null;
      }
    },
    [authFetch]
  );

  return { loadMessages };
}
