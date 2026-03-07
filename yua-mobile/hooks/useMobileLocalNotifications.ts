import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileStreamSessionStore } from "@/store/useMobileStreamSessionStore";
import {
  incrementBadgeCount,
  markMessageNotified,
  shouldNotifyForMessage,
} from "@/lib/notifications/notificationGuards";
import { initMobileNotifications, sendLocalChatNotification } from "@/lib/notifications/mobileNotifications";
import Constants from "expo-constants";
const DELAY_MS = 7000;

function buildPreview(text: string, maxLen = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "New assistant message.";
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized;
}

export function useMobileLocalNotifications() {
  const isExpoGo = Constants.appOwnership === "expo";
  const { findMessageById } = useMobileChatStore();
  const session = useMobileStreamSessionStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const handledRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isExpoGo) {
      initMobileNotifications().catch(() => {
        // ignore init failures
      });
    }
    const sub = AppState.addEventListener("change", (state) => {
      appStateRef.current = state;
      if (state === "active" && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      sub.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const messageId = session.messageId;
    if (!messageId) return;
    if (!session.done) return;
    if (session.doneReason !== "completed") return;
    if (appStateRef.current === "active") return;
    if (handledRef.current === messageId) return;

    handledRef.current = messageId;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (appStateRef.current === "active") return;

      const message = findMessageById(messageId);
      if (!message || message.role !== "assistant") return;

      const now = Date.now();
      const ok = await shouldNotifyForMessage({
        threadId: message.threadId,
        messageId: message.id,
        createdAt: message.createdAt,
        now,
      });
      if (!ok) return;

      const preview = buildPreview(message.content ?? "");
      const badge = await incrementBadgeCount();
      if (!isExpoGo) {
        await sendLocalChatNotification({
        title: "Yua 답변 완료",
        body: preview,
        badge,
        data: {
          type: "assistant_done",
          threadId: String(message.threadId),
          messageId: message.id,
          url: `/chat/${message.threadId}?messageId=${encodeURIComponent(message.id)}&fromPush=1`,
          preview,
          dedupeKey: `${message.threadId}:${message.id}`,
          sources: message.meta?.sources ?? [],
          compareTable: message.meta?.compareTable ?? null,
        },
        });
      }

      await markMessageNotified(message.threadId, message.id, now);
    }, DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findMessageById, session.done, session.doneReason, session.messageId, session.traceId]);
}
