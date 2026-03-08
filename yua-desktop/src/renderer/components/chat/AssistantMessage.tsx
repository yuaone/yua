import { useMemo, useRef, useEffect, useState } from "react";
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
import type { AssistantThinkingMeta } from "@/stores/useChatStore";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";
import type { StudioSystemRef } from "yua-shared/chat/studio-types";
import { useChatStore } from "@/stores/useChatStore";
import { emojiMap } from "@/lib/thoughtStage";
import { useChatStream } from "@/hooks/useChatStream";
import StreamOverlay from "@/components/chat/StreamOverlay";

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
    drawerOpen?: boolean;
    thinkingProfile?: ThinkingProfile;
    thinking?: AssistantThinkingMeta;
    sources?: {
      id: string;
      label: string;
      url?: string;
      host?: string;
      preview?: string;
    }[];
    profile?: ThinkingProfile;
    thinkingSummary?: string;
    thinkingElapsedMs?: number;
    blocks?: UIBlock[];
    attachments?: AttachmentMeta[];
    thoughtStage?: ThoughtStage;
    suggestion?: SuggestionPayload;
    imageLoading?: boolean;
    isImageOnly?: boolean;
    studio?: StudioSystemRef;
    confidence?: number;
    persona?: "DEFAULT" | "KID";
    compareTable?: CompareTable;
    branchEmoji?: string;
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
   const header = `| Item | ${t.columns.map(c => c.title).join(" | ")} |`;
   const sep = `| --- | ${t.columns.map(() => "---").join(" | ")} |`;
   const rows = t.rows.map(r =>
     `| ${r.label} | ${t.columns.map(c => r.values[c.key] ?? "").join(" | ")} |`
   );

   const table = [header, sep, ...rows].join("\n");

   return t.caption
     ? `**${t.caption}**\n\n${table}`
     : table;
 }

/* =========================
   Component
========================= */

export default function AssistantMessage({ message }: Props) {

  // FINAL meta merge: keep drawerOpen/thinking live after finalize
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
  // finalized 전에는 최신 meta를 따라가고, finalized 순간 freeze
  useEffect(() => {
    if (!finalized) {
      metaRef.current = meta;
      return;
    }
    if (metaRef.current == null) metaRef.current = meta;
  }, [finalized, meta]);

  // FIX: Use targeted selector to avoid re-rendering on every message change.
  // Only subscribe to the active thread's messages (not the entire messagesByThread object).
  const activeThreadMessages = useChatStore((s) => {
    if (!s.activeThreadId) return null;
    return s.messagesByThread[s.activeThreadId] ?? null;
  });
  const fallbackSystemStudio = useMemo(() => {
    if (!activeThreadMessages) return undefined;
    const list = activeThreadMessages;
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;

    for (let i = idx + 1; i < list.length; i++) {
      const candidate = list[i];

      if (candidate.role === "system" && candidate.meta?.studio) {
        return candidate.meta.studio;
      }

      if (candidate.role === "assistant") break;
    }

    return undefined;
  }, [activeThreadMessages, id]);

  const effectiveStudio = meta?.studio ?? fallbackSystemStudio;

  // FIX: subscribe to individual session fields (not entire session object)
  const sessionMessageId = useStreamSessionStore((s) => s.session.messageId);
  const sessionThinkingProfile = useStreamSessionStore((s) => s.session.thinkingProfile);
  const sessionMode = useStreamSessionStore((s) => s.session.mode);
   const { requestAnswerUnlock } = useChatStream();

  // SSOT: session.messageId / message.id type mismatch guard
  const isActiveStreamingMessage =
    sessionMessageId != null && String(sessionMessageId) === String(id);

const stableMeta = finalized
  ? mergeFinalMetaForOverlay(metaRef.current ?? meta, meta)
  : meta;
const metaProfile = (stableMeta as any)?.thinkingProfile ?? (stableMeta as any)?.profile ?? null;
const effectiveProfile =
  (metaProfile ?? sessionThinkingProfile ?? sessionMode ?? "NORMAL") as ThinkingProfile;

  const markdownStreaming = streaming;


  // SSOT: Conversation Rhythm
  const rhythm = useMemo(() => {
    return decideRhythm({
      index: 0,
      isFirst: true,
      finalized,
      thoughtStage: meta?.thoughtStage,
      hasSuggestion: !!stableMeta?.suggestion,
    });
  }, [finalized, meta?.thoughtStage, stableMeta?.suggestion]);

  const trimmed = (typeof content === "string" ? content : "").trim();
  const markdownContent = content;
  const hasVisibleText = trimmed.length > 0;
  const sources = Array.isArray(stableMeta?.sources)
    ? stableMeta.sources
    : [];
  // SOURCES DEBUG log removed — was triggering on every stableMeta change
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




  // analysis: compute when text is available (not dependent on finalized)
  const analysis = useMemo(() => {
    if (!trimmed) return null;
    try {
      return analyzeAnswer(trimmed);
    } catch {
      return null;
    }
  }, [trimmed]);

  // closeSignal only meaningful when suggestion exists
  const closeSignal =
    stableMeta?.suggestion && analysis ? decideClose(analysis) : null;

  // SSOT FIX: only consume suggestion in footer after FINAL
  const footerSuggestion =
    finalized ? stableMeta?.suggestion : null;

  // closeText only shown when finalized (existing UX)
  const closeText =
    finalized && closeSignal?.show
      ? closeCopyMap[closeSignal.intent]?.[closeSignal.confidence]?.[0]
      : null;

  // SSOT: history should not render session-based overlay.
  // Only render overlay when meta.drawerOpen=true (user opened) or active streaming.
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
          - rendered at active message bubble position only
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
          - never collapse to empty tree
      ========================= */}
      <div className="relative text-gray-900 break-words">
        {/* =========================
            IMAGE INTENT
        ========================= */}
{hasImageStudioSection && (
      <ImageSectionBlock
        sectionId={sectionId}
        loading={meta?.imageLoading === true && !meta?.studio?.sectionId}
      />
)}

 <div
   className="assistant-content"
   data-answer-visible="1"
 >


             {/* SSOT: anchor for empty assistant */}
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
          - existing UX: only show footer block after finalize
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
