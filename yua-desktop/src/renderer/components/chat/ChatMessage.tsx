import { useEffect, useMemo, useRef, useState, memo } from "react";
import AssistantMessage from "./AssistantMessage";
import MessageActions from "./MessageActions";
import { useStudioContext } from "@/stores/useStudioContext";
import type { ChatMessageWithMeta } from "@/stores/useChatStore";
import { Check, Copy } from "lucide-react";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import ImagePanel from "@/components/chat/image/ImagePanel";
import FilePanel from "@/components/chat/file/FilePanel";
import AudioBubble from "@/components/chat/voice/AudioBubble";

/* =========================
   Types
========================= */

type Props = ChatMessageWithMeta & {
  isChained?: boolean;
};

/* =========================
   Component
========================= */

function ChatMessage({
  id,
  role,
  content,
  streaming = false,
  finalized,
  _finalizedAt,
  meta,
  attachments,
  threadId,
  traceId,
  createdAt,
  isChained = false,
}: Props) {
  const frozenMarkdownRef = useRef<string | null>(null);
  const { openStudio } = useStudioContext();

  const safeContent = useMemo(() => {
    if (typeof content === "string") return content;
    if (content == null) return "";
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }, [content]);

  // FIX: freeze content only after FINAL (not on stream start with empty string)
  useEffect(() => {
    if (finalized && safeContent.trim().length > 0) {
      if (frozenMarkdownRef.current == null) {
        frozenMarkdownRef.current =
          safeContent && safeContent.length > 0
            ? safeContent
            : " ";
      }
    } else {
      frozenMarkdownRef.current = null;
    }
  }, [finalized, safeContent]);

  const assistantMessage = useMemo(
    () => ({
      id,
      content: finalized
        ? (frozenMarkdownRef.current ?? safeContent)
        : safeContent,
      streaming: !finalized && streaming,
      finalized,
      createdAt: typeof createdAt === "number" ? createdAt : 0,
      finalizedAt: typeof _finalizedAt === "number" ? _finalizedAt : undefined,
      traceId: typeof traceId === "string" ? traceId : undefined,
      meta,
    }),
    [id, safeContent, streaming, finalized, meta, createdAt, _finalizedAt]
  );

  const hasImages =
    role === "user" &&
    attachments?.some((a) => a.kind === "image");

  const hasFiles =
    role === "user" &&
    attachments?.some((a) => a.kind === "file");

  const audioAttachments =
    role === "user"
      ? attachments?.filter((a) => a.kind === "audio") ?? []
      : [];

  /* =========================
     Image Panel (Message Header)
  ========================= */
  const imagePanel = hasImages ? (
    <div className="mb-3">
      <ImagePanel attachments={attachments ?? []} />
    </div>
  ) : null;

  const filePanel = hasFiles ? (
    <div className="mb-3">
      <FilePanel attachments={attachments ?? []} />
    </div>
  ) : null;

  const audioPanel = audioAttachments.length > 0 ? (
    <div className="mb-3 flex flex-wrap gap-2 justify-end">
      {audioAttachments.map((a) => (
        <AudioBubble
          key={a.id}
          url={a.fileUrl ?? a.url ?? ""}
          fileName={a.fileName}
        />
      ))}
    </div>
  ) : null;

  /* =========================
     User Message
  ========================= */
  if (role === "user") {
    const isVoiceInput = (meta as any)?.inputMethod === "voice";
    return (
      <div
        className="chat-message mb-5 flex flex-col items-end gap-2"
        data-created-at={createdAt}
      >
        {imagePanel}
        {filePanel}
        {audioPanel}
        {isVoiceInput && (
          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            Voice input
          </span>
        )}
        <UserBubble content={safeContent} />
      </div>
    );
  }

  /* =========================
     System Message
  ========================= */
  if (role === "system") {
    if (!meta?.studio) return null;

    // DOCUMENT is Canvas-only SSOT -- do not consume in Chat
    if (meta.studio.assetType === "DOCUMENT") {
      return null;
    }
    return (
      <div className="mt-2 mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {typeof content === "string" ? content : JSON.stringify(content)}
      </div>
    );
  }

  /* =========================
     Assistant Message
  ========================= */
  if (role === "assistant") {
    return (
      <div
        className="chat-message mt-1 mb-3"
        data-created-at={createdAt}
      >
        <div className="flex justify-start min-w-0">
          <div className="relative w-full min-w-0" data-assistant-root="true">
            <AssistantMessage message={assistantMessage} />
          </div>
        </div>

        {/* SSOT: MessageActions height always reserved (prevent scroll jump) */}
        <div
          className="mt-3 pl-3 max-md:pl-1 max-md:mt-2 min-h-[44px] max-md:min-h-[36px] flex items-start"
          data-ssot="message-actions-wrapper"
        >
          {finalized && !streaming && threadId != null && (
            <MessageActions
              messageId={id}
              content={safeContent}
              disabled={false}
              threadId={threadId}
              traceId={traceId}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-2 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      data-created-at={createdAt}
    >
      Unsupported message type.
    </div>
  );
}

/* =========================
   User Bubble
========================= */

// Stable style object — prevents re-allocation on every render
const USER_BUBBLE_FONT_STYLE = {
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial',
} as const;

function UserBubble({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let success = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        success = true;
      }
    } catch {}

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {}
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="chat-bubble group relative w-full max-w-[44rem] md:max-w-[50rem] max-md:max-w-full break-words">
      {/* Text */}
      {content && (
        <div
          className="
            rounded-2xl
            bg-gray-100 text-gray-900
            dark:bg-[#1f1f1f] dark:text-[var(--text-primary)]
            px-6 py-4
            max-md:px-4 max-md:py-3

            text-[16px] md:text-[18px]
            leading-[1.85]
            font-normal

            whitespace-pre-wrap break-words overflow-hidden
          "
          style={USER_BUBBLE_FONT_STYLE}
        >
          {content}
        </div>
      )}

      {/* Copy */}
      {content && (
        <button
          onClick={handleCopy}
          className="
            absolute -bottom-7 right-1
            flex items-center gap-1
            text-xs text-gray-400 dark:text-[var(--text-muted)]
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
          "
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.id === next.id &&
    prev.role === next.role &&
    prev.content === next.content &&
    prev.streaming === next.streaming &&
    prev.finalized === next.finalized &&
    prev._finalizedAt === next._finalizedAt &&
    prev.meta === next.meta &&
    prev.attachments === next.attachments &&
    prev.threadId === next.threadId &&
    prev.traceId === next.traceId &&
    prev.createdAt === next.createdAt &&
    prev.isChained === next.isChained
  );
}

export default memo(ChatMessage, areEqual);
