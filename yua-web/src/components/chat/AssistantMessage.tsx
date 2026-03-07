"use client";

import { useMemo, useRef, useEffect } from "react";
import Markdown from "@/components/common/Markdown";
import SuggestionBlock from "./blocks/SuggestionBlock";
import EmojiContextLine from "./blocks/EmojiContextLine";
import { analyzeAnswer } from "@/lib/answer/analyzeAnswer";
import { decideClose } from "@/lib/answer/decideClose";
import { closeCopyMap } from "@/lib/answer/closeCopy";
import type { ThoughtStage } from "@/lib/thoughtStage";
import type { SuggestionPayload } from "@/types/suggestion";
import ImageSectionBlock from "@/components/chat/image/ImageSectionBlock";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import type { SuggestionItem } from "@/types/suggestion";
import { decideRhythm } from "@/lib/conversationRhythm";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import type { AssistantThinkingMeta } from "@/store/useChatStore";
import { useStreamSessionStore } from "@/store/useStreamSessionStore";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";
import { useChatStore } from "@/store/useChatStore";
import { emojiMap } from "@/lib/thoughtStage";
import { useChatStream } from "@/hooks/useChatStream";
import StreamOverlay from "@/components/chat/StreamOverlay";
import { useState } from "react";
/* =========================
   Small UI
========================= */

function SummaryMenu() {
  return (
    <button
      className="absolute top-1 right-0 z-0 opacity-30 hover:opacity-80 transition text-[var(--text-muted)]"
      aria-label="summary menu"
      type="button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="12" cy="19" r="1.6" />
      </svg>
    </button>
  );
}

/* =========================
   Types
========================= */

type UIBlock =
  | { type: "markdown"; content: string }
  | { type: "section"; title: string }
  | { type: "divider" }
  | { type: "suggestions"; items: SuggestionItem[] };

type AssistantUIMessage = {
  id: string;
  role?: "assistant";
  content: string;
  streaming?: boolean;
  finalized?: boolean;
  createdAt?: number;
  finalizedAt?: number;
  traceId?: string;
  meta?: {
    drawerOpen?: boolean; // ✅ 추가 (영속 패널 상태)
    thinkingProfile?: ThinkingProfile;
    thinking?: AssistantThinkingMeta;
    // ✅ ADD
    sources?: {
      id: string;
      label: string;
      url?: string;
      host?: string;
      preview?: string; // hover tooltip용
    }[];
    profile?: ThinkingProfile; // (기존 호환)
    thinkingSummary?: string;
    thinkingElapsedMs?: number;
    blocks?: UIBlock[];
    attachments?: AttachmentMeta[];
    thoughtStage?: ThoughtStage;
    suggestion?: SuggestionPayload;
    imageLoading?: boolean;
    isImageOnly?: boolean;   // ✅ ADD (SSOT)
studio?: StudioSystemRef;
    confidence?: number;
    persona?: "DEFAULT" | "KID";
    compareTable?: CompareTable;
    branchEmoji?: string;   // 🔥 추가
  };
};

 type CompareTable = {
   caption?: string;
   columns: { key: string; title: string }[];
   rows: {
     label: string;
     values: Record<string, string>;
   }[];
 };

type Props = {
  message: AssistantUIMessage;
};

/* =========================
   Helpers
========================= */


function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="mt-10 mb-4 text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
      {title}
    </h3>
  );
}

function Divider() {
  return (
    <div
      className="
        my-10
        border-t border-[var(--line)]
      "
    />
  );
}

 function renderCompareTable(t: CompareTable): string {
   const header = `| 항목 | ${t.columns.map(c => c.title).join(" | ")} |`;
   const sep = `| --- | ${t.columns.map(() => "---").join(" | ")} |`;
   const rows = t.rows.map(r =>
     `| ${r.label} | ${t.columns.map(c => r.values[c.key] ?? "").join(" | ")} |`
   );

   const table = [header, sep, ...rows].join("\n");

   // 캡션이 있으면 위에 한 줄 붙임 (문단 충돌 방지 위해 공백 포함)
   return t.caption
     ? `**${t.caption}**\n\n${table}`
     : table;
 }

/* =========================
   Component
========================= */

export default function AssistantMessage({ message }: Props) {

  // ✅ FINAL 이후에도 일부 meta는 "live"로 따라가야 함 (drawerOpen 같은 UI state)
  // - 전체 meta를 live로 바꾸면 DOM '펑' 위험
  // - overlay/drawer에 필요한 최소 키만 live로 merge
  const mergeFinalMetaForOverlay = <T extends Record<string, any>>(
    frozen: T | undefined,
    live: T | undefined
  ): T | undefined => {
    if (!frozen) return live;
    if (!live) return frozen;
    return {
      ...frozen,
      drawerOpen: live.drawerOpen ?? frozen.drawerOpen,
      thinking: live.thinking ?? frozen.thinking,
    };
  };
  const {
    id,
    content,
    streaming = false,
    meta,
    finalized = false,
    createdAt,
    traceId,
  } = message;
  const metaRef = useRef<typeof meta>(meta);
  // ✅ finalized 전에는 최신 meta를 따라가고, finalized 순간 "그 시점 meta"를 freeze
  useEffect(() => {
    if (!finalized) {
      metaRef.current = meta;
      return;
    }
    if (metaRef.current == null) metaRef.current = meta;
  }, [finalized, meta]);

  const messagesByThread = useChatStore((s) => s.messagesByThread);
  const fallbackSystemStudio = useMemo(() => {
    for (const list of Object.values(messagesByThread)) {
      const idx = list.findIndex((m) => m.id === id);
      if (idx === -1) continue;

      // 🔥 idx 이후 전체 범위에서 첫 system studio 찾기
      for (let i = idx + 1; i < list.length; i++) {
        const candidate = list[i];

        if (candidate.role === "system" && candidate.meta?.studio) {
          return candidate.meta.studio;
        }

        // assistant가 다시 나오면 다른 블록 시작이므로 중단
        if (candidate.role === "assistant") break;
      }
    }

    return undefined;
  }, [messagesByThread, id]);

  const effectiveStudio = meta?.studio ?? fallbackSystemStudio;

 // 🔥 FIX: session 전체 구독 금지 (flush tick마다 전 메시지 리렌더 → selection 깨짐)
  const sessionMessageId = useStreamSessionStore((s) => s.session.messageId);
  const sessionThinkingProfile = useStreamSessionStore((s) => s.session.thinkingProfile);
  const sessionMode = useStreamSessionStore((s) => s.session.mode);
   const { requestAnswerUnlock } = useChatStream();

  // ✅ SSOT: session.messageId / message.id 타입 mismatch 방지
  const isActiveStreamingMessage =
    sessionMessageId != null && String(sessionMessageId) === String(id);

const stableMeta = finalized
  ? mergeFinalMetaForOverlay(metaRef.current ?? meta, meta)
  : meta;
const metaProfile = (stableMeta as any)?.thinkingProfile ?? (stableMeta as any)?.profile ?? null;
const effectiveProfile =
  (metaProfile ?? sessionThinkingProfile ?? sessionMode ?? "NORMAL") as ThinkingProfile;

  const markdownStreaming = streaming; 


  // 🔒 SSOT: Conversation Rhythm 결정 (Markdown 판단 금지)
  const rhythm = useMemo(() => {
    return decideRhythm({
      index: 0, // assistant message 내부는 항상 0
      isFirst: true,
      finalized,
      thoughtStage: meta?.thoughtStage,
      hasSuggestion: !!stableMeta?.suggestion,
    });
  }, [finalized, meta?.thoughtStage, stableMeta?.suggestion]);

  const trimmed = (typeof content === "string" ? content : "").trim();
  // 🔒 FINAL 전환에서도 Markdown 입력은 동일해야 한다.
  const markdownContent = content;
  const hasVisibleText = trimmed.length > 0;
  const sources = Array.isArray(stableMeta?.sources)
    ? stableMeta.sources
    : [];
  useEffect(() => {
  console.log("SOURCES DEBUG:", stableMeta?.sources);
}, [stableMeta]);
   const hasMarkdownTable = false;

    const isImageAsset =
   effectiveStudio?.assetType === "IMAGE" ||
   effectiveStudio?.assetType === "SEMANTIC_IMAGE" ||
   effectiveStudio?.assetType === "FACTUAL_VISUALIZATION" ||
   effectiveStudio?.assetType === "COMPOSITE_IMAGE";
const studioSectionIdRaw = effectiveStudio?.sectionId;

const numericSectionId: number =
  typeof studioSectionIdRaw === "string"
    ? Number(studioSectionIdRaw)
    : typeof studioSectionIdRaw === "number"
    ? studioSectionIdRaw
    : NaN;

const hasImageStudioSection =
  isImageAsset &&
  Number.isFinite(numericSectionId) &&
  numericSectionId > 0;

const sectionId: number = hasImageStudioSection
  ? numericSectionId
  : -1;



 const isImageIntent = hasImageStudioSection;




  // ✅ analysis는 "finalized에 종속"시키지 말고, 텍스트가 있을 때만 계산
  // (finalized가 false라도 content가 들어오면 화면은 나와야 함)
  const analysis = useMemo(() => {
    if (!trimmed) return null;
    try {
      return analyzeAnswer(trimmed);
    } catch {
      return null;
    }
  }, [trimmed]);

  // closeSignal은 suggestion이 있을 때만 의미가 있으니 그 조건 유지
  const closeSignal =
    stableMeta?.suggestion && analysis ? decideClose(analysis) : null;

      // 🔒 SSOT FIX:
  // FINAL 이후에만 suggestion을 footer에서 소비
  const footerSuggestion =
    finalized ? stableMeta?.suggestion : null;

  // closeText는 "finalized"일 때만 보여주는 기존 UX 유지
  const closeText =
    finalized && closeSignal?.show
      ? closeCopyMap[closeSignal.intent]?.[closeSignal.confidence]?.[0]
      : null;

  // ✅ SSOT: history에서는 session 기반 overlay 렌더 금지.
  // 오직 meta.drawerOpen=true(유저가 열어둔 상태)일 때만 overlay 렌더.
const isDeepMessage =
  stableMeta?.thinking?.thinkingProfile === "DEEP" ||
  stableMeta?.thinkingProfile === "DEEP";

const shouldRenderOverlay =
  isActiveStreamingMessage ||
  stableMeta?.drawerOpen === true ||
  (finalized && isDeepMessage);

  return (
    <div className="assistant-bubble relative z-0 min-w-0 w-full">
    {/* =========================
          STREAM OVERLAY (SSOT)
          - 오직 active message bubble 위치에서만 렌더
      ========================= */}
      <div
        className={`stream-overlay-collapse ${shouldRenderOverlay ? "stream-overlay-collapse--open" : ""}`}
        data-ssot="stream-overlay-anchor"
      >
        {shouldRenderOverlay && (
          <StreamOverlay
            onUnlock={requestAnswerUnlock}
            assistantMeta={stableMeta ?? null}
            assistantFinalized={Boolean(finalized)}
            assistantContent={typeof content === "string" ? content : ""}
            assistantMessageId={String(id)}
            assistantTraceId={typeof traceId === "string" ? traceId : null}
          />
        )}
      </div>


      {/* =========================
          MAIN ANSWER (ANCHOR)
          - 절대 빈 트리로 수렴하지 않게 anchor 유지
      ========================= */}
      <div className="relative text-gray-900 break-words">
        {/* =========================
            IMAGE INTENT
        ========================= */}
{hasImageStudioSection &&
  (() => {
    console.log("[RENDER_IMAGE_BLOCK]", sectionId);
    return (
      <ImageSectionBlock
        sectionId={sectionId}
        loading={meta?.imageLoading === true && !meta?.studio?.sectionId}
      />
    );
  })()}

 <div
   className="assistant-content"
   data-answer-visible="1"
 >
 

             {/* 🔒 SSOT: 텍스트가 비어도 트리가 빈 div로 수렴하지 않게 anchor 유지 */}
            {trimmed.length === 0 && (
              <div
                className="min-h-[1em]"
                data-ssot-anchor="empty-assistant"
              />
            )}

  <Markdown
    content={markdownContent}
    streaming={Boolean(streaming && !finalized)}
    rhythm={rhythm}
  branchEmoji={
    meta?.branchEmoji ??
    (meta?.thoughtStage
      ? emojiMap[meta.thoughtStage]
      : undefined)
  }
 sources={stableMeta?.sources ?? []}
  />
 {meta?.compareTable && finalized && (
   <div className="mt-6">
     <Markdown
       content={renderCompareTable(meta.compareTable)}
       streaming={false}
     />
   </div>
 )}
          </div>
      </div>

      {/* =========================
          THOUGHT CONTEXT
      ========================= */}
      {!streaming && !isImageIntent && meta?.thoughtStage && (
        <div className="mt-10 text-center text-sm">
          <EmojiContextLine
            stage={meta.thoughtStage}
            persona={meta.persona ?? "DEFAULT"}
            confidence={meta.confidence}
            seed={id}
            className="emoji-context"
          />
        </div>
      )}

      {/* =========================
          CLOSE + SUGGESTIONS
          - 기존 UX 유지: finalize 이후에만 하단 블록 표시
      ========================= */}
      {!streaming &&
        finalized &&
        !isImageIntent &&
        (closeText || footerSuggestion?.items?.length) && (
          <div className="mt-10 pt-6 border-t border-gray-100 text-[15px] text-gray-600 space-y-4">
            {stableMeta?.suggestion && closeText && (
              <div className="leading-relaxed">{closeText}</div>
            )}

            {footerSuggestion?.items?.length ? (
              <SuggestionBlock payload={footerSuggestion} />
            ) : null}
          </div>
        )}
    </div>
  );
}
