"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";
import ChatMessageItem from "./ChatMessageItem";

export default function PlanMessages({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔒 스트리밍 중엔 무조건 바닥 follow
  useEffect(() => {
    if (!streaming) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto px-4 pt-10 pb-28"
    >
      <div className="mx-auto max-w-[720px]">
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} {...msg} />
        ))}
      </div>
    </div>
  );
}
