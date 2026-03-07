"use client";

import { useCallback } from "react";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

import { useMobileChatStore } from "@/store/useMobileChatStore";

export function useMobileChatSender(
  sendStream: (args: {
    threadId: number;
    content: string;
    attachments?: AttachmentMeta[];
    thinkingProfile?: ThinkingProfile;
  }) => void
) {
  const { addUserMessage } = useMobileChatStore();

  const send = useCallback(
    ({
      threadId,
      content,
      attachments = [],
      thinkingProfile,
    }: {
      threadId: number | null;
      content: string;
      attachments?: AttachmentMeta[];
      thinkingProfile?: ThinkingProfile;
    }) => {
      const trimmed = content.trim();
      const hasAttachments = attachments.length > 0;

      if (!threadId) {
        console.warn("[MOBILE_SENDER] threadId is null");
        return;
      }

      if (!trimmed && !hasAttachments) return;

      addUserMessage(trimmed, threadId, hasAttachments ? attachments : undefined);

      sendStream({
        threadId,
        content: trimmed,
        attachments,
        thinkingProfile,
      });
    },
    [addUserMessage, sendStream]
  );

  return { send };
}
