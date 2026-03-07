"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useChatMessages } from "@/hooks/useChatMessages";
import Markdown from "@/components/common/Markdown";
import RewritePanel from "@/components/studio/document/RewritePanel";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";
import { useThreadMessages } from "@/store/chatSelectors";

/**
 * DocumentCanvas
 *
 * SSOT:
 * - DOCUMENT는 "메시지"가 아니라 "시스템 자산"
 * - system message(meta.studio)는 트리거일 뿐
 * - 실제 내용은 sectionId 기준으로 관리됨
 * - assistant content / 메시지 인접성에 절대 의존하지 않음
 */
export default function DocumentCanvas() {
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const hydrateMessages = useChatStore((s) => s.hydrateMessages);
  const { loadMessages } = useChatMessages();

  // 🔒 Canvas는 반드시 RAW thread messages를 본다
  const messages = useThreadMessages(activeThreadId);

  /**
   * 1️⃣ 최신 DOCUMENT system trigger 추출 (순수 파생값)
   */
  const activeDoc: StudioSystemRef | null = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m.role === "system" &&
        m.meta?.studio?.assetType === "DOCUMENT"
      ) {
        return m.meta.studio;
      }
    }
    return null;
  }, [messages]);

  /**
   * 2️⃣ Rewrite handler
   * - Rewrite는 DB 자산을 변경
   * - Canvas는 항상 re-hydrate로만 동기화
   */
  const handleRewrite = useCallback(
    async (instruction: string) => {
      if (!activeDoc || !activeThreadId) return;

      await fetch("/api/document/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: activeDoc.sectionId,
          instruction,
        }),
      });

      // 🔥 SSOT 복원: DB → Store
      const msgs = await loadMessages(activeThreadId);
      if (msgs) {
        hydrateMessages(activeThreadId, msgs);
      }
    },
    [activeDoc, activeThreadId, loadMessages, hydrateMessages]
  );

  /**
   * 3️⃣ Guard
   * - DOCUMENT 트리거가 없으면 Canvas는 존재하지 않음
   */
  if (!activeDoc) return null;

  /**
   * 4️⃣ 현재 단계의 최소 렌더
   * - 실제 문서 내용은 추후 section fetch / asset reader로 대체
   * - 지금은 구조 안정성이 목적
   */
  const placeholderContent = `📄 문서 섹션 #${activeDoc.sectionId} 이(가) 생성되었습니다.`;

  return (
    <div className="border-t bg-white">
      <div className="mx-auto max-w-[64rem] px-6 md:px-8 py-8 space-y-8">
        {/* =========================
           DOCUMENT PREVIEW
           (파생 자산 View)
        ========================= */}
        <div className="rounded-xl border bg-gray-50 px-6 py-6">
          <div className="mb-3 text-sm font-semibold text-gray-700">
            생성된 문서
          </div>

          <div className="markdown-body">
            <Markdown content={placeholderContent} streaming={false} />
          </div>
        </div>

        {/* =========================
           REWRITE PANEL
        ========================= */}
        <RewritePanel
          sectionId={String(activeDoc.sectionId)}
          onRewrite={handleRewrite}
        />
      </div>
    </div>
  );
}
