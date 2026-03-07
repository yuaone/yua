"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import AssistantMessage from "./AssistantMessage";
import MessageActions from "./MessageActions";
import SystemMessageCard from "./SystemMessageCard";
import { useStudioContext } from "@/store/useStudioContext";
import type { ChatMessageWithMeta } from "@/store/useChatStore";
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
    // 🔒 fallback: assistant가 "사라지지 않게"
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }, [content]);

  // ✅ FIX: 스트리밍 시작 시점에 빈 문자열로 얼리지 말고,
  // FINAL 이후에만 "최종 content"를 1회 고정한다.
  useEffect(() => {
    if (finalized && safeContent.trim().length > 0) {
      if (frozenMarkdownRef.current == null) {
        // 🔒 FINAL 시 content가 비어 있으면 anchor 1글자라도 유지
        frozenMarkdownRef.current =
          safeContent && safeContent.length > 0
            ? safeContent
            : " ";
      }
    } else {
      // 새 스트림/재생성 대비: finalized 전에는 freeze 해제
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
    const isVoiceInput = meta?.inputMethod === "voice";
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
       음성 입력
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

  // 🔒 DOCUMENT는 Canvas 전용 SSOT — Chat에서 소비 금지
  if (meta.studio.assetType === "DOCUMENT") {
    return null;
  }
    return (
      <SystemMessageCard
        content={content}
        studio={meta.studio}
        onOpenStudio={(ref) => {
          openStudio({
            mode:
              ref.assetType === "IMAGE"
                ? "image"
                : ref.assetType === "VIDEO"
                ? "video"
                : "document",
            input: "",
            attachments: [],
            sectionId: ref.sectionId,
            threadId,
          });
        }}
      />
    );
  }

  /* =========================
     Assistant Message (Gemini Style)
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

       {/* 🔒 SSOT: MessageActions height 항상 확보 (스크롤 점프 방지) */}
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
      지원하지 않는 메시지 타입입니다.
    </div>
  );
}

/* =========================
   User Bubble
========================= */

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
          style={{
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial',
          }}
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
            transition-all
          "
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-500" />
              <span className="text-green-500">복사됨</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>복사</span>
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
    prev.meta === next.meta &&                 // ✅ ref-eq (바뀐 메시지만)
    prev.attachments === next.attachments &&   // ✅ ref-eq
    prev.threadId === next.threadId &&
    prev.traceId === next.traceId &&
    prev.createdAt === next.createdAt &&
    prev.isChained === next.isChained
  );
}

export default memo(ChatMessage, areEqual);
