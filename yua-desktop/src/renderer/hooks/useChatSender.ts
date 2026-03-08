import { useCallback } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { useThinkingProfile } from "@/hooks/useThinkingProfile";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

/**
 * Desktop Chat Sender (SSOT)
 *
 * Responsibilities:
 * - user message creation (attachments-only allowed)
 * - stream / non-stream branching
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
        console.warn("[SEND] threadId is null -- caller must create thread first");
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

      // SSOT: ALWAYS STREAM
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
    [sendStream, addUserMessage, profile]
  );

  return { send };
}
