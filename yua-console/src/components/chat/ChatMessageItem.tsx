"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChatMessage } from "@/types/chat";
import ChatFilePreview from "./ChatFilePreview";
import MarkdownRenderer from "./MarkdownRenderer";
import { Copy, Check } from "lucide-react";

import { useChatStore } from "@/store/useChatStore";
import { useTimelineStore } from "@/store/useTimelineStore";

export default function ChatMessageItem({
  id,
  role,
  content,
  streamingText,
  isStreaming,
  model,
  files = [],
}: ChatMessage & { model?: string }) {
  const { currentThreadId } = useChatStore((s) => ({
    currentThreadId: s.currentThreadId,
  }));

  const { open } = useTimelineStore();
  const [copied, setCopied] = useState(false);

  const isUser = role === "user";
  const isSpineAssistant = role === "assistant" && model === "spine";

  /* text source 고정 */
  const visibleText = useMemo(() => {
    if (role !== "assistant") return content;
    return isStreaming ? streamingText ?? "" : content;
  }, [role, isStreaming, streamingText, content]);

  const copyAll = useCallback(async () => {
    if (!visibleText) return;
    await navigator.clipboard.writeText(visibleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 700);
  }, [visibleText]);

  return (
    <div
      className={`w-full flex my-8 ${
        isUser ? "justify-end" : "justify-center"
      }`}
    >
      <div
        className={`relative w-full ${
          isUser
            ? "max-w-[72%] px-5 py-4 rounded-2xl bg-zinc-200"
            : "max-w-[720px] px-5 pt-8 pb-6"
        }`}
      >
        {/* Copy (DONE only) */}
        {!isUser && !isStreaming && visibleText && (
          <div className="absolute top-2 right-2">
            <button
              onClick={copyAll}
              className="p-1 rounded-md hover:bg-black/10"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {/* Files (DONE only) */}
        {!isStreaming && files.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {files.map((f) => (
              <ChatFilePreview key={f.id} file={f} />
            ))}
          </div>
        )}

        {/* MESSAGE BODY — DOM 절대 고정 */}
        <div className="w-full">
          {isStreaming ? (
            <div className="text-[15px] leading-[1.7] whitespace-pre-wrap">
              {visibleText}
            </div>
          ) : (
            <MarkdownRenderer text={content} />
          )}
        </div>

        {/* Timeline (DONE only) */}
        {isSpineAssistant && !isStreaming && (
          <button
            onClick={() => open(String(currentThreadId), String(id))}
            className="mt-6 text-xs text-black/60 hover:text-black"
          >
            View Timeline →
          </button>
        )}
      </div>
    </div>
  );
}
