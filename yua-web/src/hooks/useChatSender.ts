"use client";

import { useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useThinkingProfile } from "@/hooks/src/hooks/useThinkingProfile";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
/**
 * 공용 Sender (PHASE 1 SSOT)
 *
 * 책임:
 * - user message 생성 (attachments-only 허용)
 * - stream / non-stream 분기
 *
 * ❌ Studio
 * ❌ routing
 * ❌ stage 판단
 */
export function useChatSender(sendStream: (args: any) => void) {
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const { profile } = useThinkingProfile();

  const send = useCallback(
    ({
      threadId,
      attachments = [],
      content,
      thinkingProfile,
      deepVariant,
      inputMethod,
    }: {
      threadId: number | null;
      content: string;
      attachments?: AttachmentMeta[];
      thinkingProfile?: ThinkingProfile;
      deepVariant?: "STANDARD" | "EXPANDED";
      inputMethod?: "keyboard" | "voice";
    }) => {
      console.log("[CHAT_SENDER_SEND]", {
        threadId,
        contentLength: content?.length ?? 0,
        attachmentsLength: attachments.length,
      });
      const trimmed = content.trim();
      const hasAttachments = attachments.length > 0;

      if (!threadId) {
        console.warn("[SEND] threadId is null — caller must create thread first");
        return;
      }

      if (trimmed || hasAttachments) {
        addUserMessage(
          trimmed,
          threadId,
          hasAttachments ? attachments : undefined
        );
      } else {
        return;
      }

      const resolvedThinkingProfile = thinkingProfile ?? profile;


      // 🔥 SSOT: ALWAYS STREAM
      sendStream({
        threadId,
        content: trimmed,
        attachments,
        thinkingProfile: resolvedThinkingProfile,
        deepVariant,
        meta: {
          ...(thinkingProfile
            ? {
                thinking: {
                  enabled: true,
                  profile: resolvedThinkingProfile,
                  deepVariant,
                },
              }
            : {}),
          ...(inputMethod === "voice" ? { inputMethod: "voice" } : {}),
        },
      });
    },
    [sendStream, addUserMessage]
  );

  return { send };
}
