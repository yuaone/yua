"use client";

import { useState } from "react";
import type { ChatMessageWithMeta } from "@/store/useChatStore";
import SystemMessageCard from "./SystemMessageCard";

type Props = {
  messages: ChatMessageWithMeta[];
};

export default function SystemMessageGroup({ messages }: Props) {
  const [open, setOpen] = useState(false);

  if (messages.length === 0) return null;

  const latest = messages[messages.length - 1];
  const previous = messages.slice(0, -1);

  // 🔒 meta 방어
  if (!latest.meta?.studio) return null;

  return (
    <div className="my-2">
      {/* 대표 카드 */}
      <SystemMessageCard
        content={latest.content}
        studio={latest.meta.studio}
      />

      {previous.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-gray-500 hover:underline"
          >
            {open
              ? "이전 기록 숨기기"
              : `이전 기록 ${previous.length}개 보기`}
          </button>

          {open && (
            <div className="mt-2 space-y-2 pl-4 border-l">
              {previous.map((m) =>
                m.meta?.studio ? (
                  <SystemMessageCard
                    key={m.id}
                    content={m.content}
                    studio={m.meta.studio}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
