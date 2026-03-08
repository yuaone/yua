import React, { useEffect, useMemo, useState, useRef } from "react";
import { getThinkingContract } from "yua-shared/types/thinkingProfile";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import type { ThinkingSummaryItem } from "@/stores/useStreamSessionStore";
import type { AssistantThinkingMeta } from "@/stores/useChatStore";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";
import type { OverlayChunk } from "@/stores/useStreamSessionStore";
import { ActivityKind } from "yua-shared/stream/activity";
import { StreamStage } from "yua-shared/stream/stream-stage";
import { useChatStore } from "@/stores/useChatStore";

type Props = {
  label: string | null;
  elapsedMs: number;
  profile?: ThinkingProfile | null;
  deepVariant?: "STANDARD" | "EXPANDED";
  modelId?: string | null;
  inlineSummary?: string | null;
  onUnlock?: () => void;

  finalized: boolean;
  hasText?: boolean;
  thinkingActive: boolean;
  thinkingCompleted: boolean;
  summaries?: ThinkingSummaryItem[];
  metaThinking?: AssistantThinkingMeta | null;
  drawerOpenReason?: "AUTO" | "USER_COMPLETE";
  onOpen?: () => void;
};

/* ==================================================
  Utils
================================================== */

function formatActivityDuration(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/* ==================================================
  Component
================================================== */

export default function ThinkingPanel({
  label,
  elapsedMs,
  profile = null,
  deepVariant = "STANDARD",
  modelId = null,
  inlineSummary = null,
  onUnlock,
  finalized,
  hasText = false,
  thinkingActive,
  thinkingCompleted,
  summaries,
  metaThinking = null,
  onOpen,
}: Props) {
  const { session } = useStreamSessionStore();

  /* --------------------------------------------------
    Profile / Contract
  -------------------------------------------------- */

  const effectiveProfile: ThinkingProfile =
    (profile ?? (session.thinkingProfile as any) ??
    (summaries?.length ? "DEEP" : "NORMAL")) as ThinkingProfile;

  const contract = getThinkingContract(effectiveProfile);
  const isDeep = effectiveProfile === "DEEP";

  const reasoningKinds: Set<ActivityKind> = new Set([
    ActivityKind.ANALYZING_INPUT,
    ActivityKind.ANALYZING_IMAGE,
    ActivityKind.PLANNING,
    ActivityKind.RESEARCHING,
    ActivityKind.RANKING_RESULTS,
    ActivityKind.FINALIZING,
    ActivityKind.IMAGE_ANALYSIS,
    ActivityKind.IMAGE_GENERATION,
    ActivityKind.PREPARING_STUDIO,
    ActivityKind.REASONING_SUMMARY,
    ActivityKind.QUANT_ANALYSIS,
  ]);

  const isReasoningKind = (kind: unknown): kind is ActivityKind =>
    reasoningKinds.has(kind as ActivityKind);

  /* --------------------------------------------------
    Session Derived Values
  -------------------------------------------------- */

  const hasReasoningBlocks = session.chunks.some(
    (c) => isReasoningKind(c.kind)
  );

  const hasActivityChunk = session.chunks.some(
    (c) =>
      isReasoningKind(c.kind) ||
      c.kind === ActivityKind.SEARCHING ||
      c.kind === ActivityKind.TOOL
  );

  const searchQueries = Array.from(
    new Set(
      session.chunks
        .filter(
          (c) => c.metaTool === "SEARCH" || c.kind === ActivityKind.SEARCHING
        )
        .map((c) => c.meta?.query)
        .filter(Boolean)
    )
  );

  const activeReasoningChunk = session.chunks
    .filter((c) => isReasoningKind(c.kind))
    .slice(-1)[0];

  const answerStarted =
    session.firstAnswerTokenAt != null || hasText || finalized;

  const metaSummaries = Array.isArray(metaThinking?.summaries)
    ? metaThinking?.summaries
    : null;
  const metaSummariesLen = metaSummaries ? metaSummaries.length : 0;
  const metaHasHistory =
    Boolean(metaThinking) &&
    (metaThinking?.thinkingProfile === "DEEP" || metaSummariesLen > 0);

  const shouldRender =
    finalized ||
    hasText ||
    session.stage === StreamStage.THINKING ||
    session.thinking?.active === true ||
    session.finalized ||
    hasReasoningBlocks ||
    metaHasHistory ||
    session.chunks.length > 0 ||
    (summaries?.length ?? 0) > 0;

  /* --------------------------------------------------
    Primary Body (Memo stabilization)
  -------------------------------------------------- */

  const primaryBody = useMemo(() => {
    return (
      activeReasoningChunk?.body?.trim() ??
      inlineSummary?.trim() ??
      ""
    );
  }, [activeReasoningChunk, inlineSummary]);

  /* --------------------------------------------------
    Hooks
  -------------------------------------------------- */

  const latestReasoningChunk = session.chunks
    .filter((c) => isReasoningKind(c.kind))
    .slice(-1)[0] ?? null;
  const [displayText, setDisplayText] = useState("");
  const typingRef = useRef<number | null>(null);
  const lastChunkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!latestReasoningChunk) return;

    const chunkId = latestReasoningChunk.chunkId;
    const title = latestReasoningChunk.title?.trim() ?? "";
    const body = latestReasoningChunk.body?.trim() ?? "";
    const inline = latestReasoningChunk.inline?.trim() ?? "";

    let raw = inline.length > 0 ? inline : body;
    // Strip title from start of body/inline to prevent title being typed inline
    if (title && raw.startsWith(title)) {
      raw = raw.slice(title.length).replace(/^[\s\n::\-]+/, "");
    }
    const source = raw.replace(/\s+/g, " ").trim();
    if (!source) return;

    // New chunk detected -> reset
    if (lastChunkIdRef.current !== chunkId) {
      lastChunkIdRef.current = chunkId;
      setDisplayText("");
    }

    // Stop existing typing
    if (typingRef.current) {
      clearInterval(typingRef.current);
    }

    const totalLength = source.length;

    const typeNext = () => {
      setDisplayText((prev) => {
        const nextLength = prev.length + 1;

        if (nextLength > totalLength) {
          return prev;
        }

        const progress = nextLength / totalLength;

        let delay = 42;

        if (nextLength <= 10) {
          delay = 28;
        }
        else if (progress > 0.85) {
          delay = 72;
        }
        const nextChar = source[nextLength - 1];

        if (nextChar === ".") {
          delay = 280;
        }
        typingRef.current = window.setTimeout(typeNext, delay);

        return source.slice(0, nextLength);
      });
    };

    typingRef.current = window.setTimeout(typeNext, 36);

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [latestReasoningChunk?.body, latestReasoningChunk?.inline, latestReasoningChunk?.chunkId]);

  const nowTs = Date.now();
  const skeletonVisible =
    session.minSkeletonUntil &&
    nowTs < session.minSkeletonUntil;

  const hasReasoningSignal =
    Boolean(latestReasoningChunk) ||
    session.thinking.active ||
    skeletonVisible;

  /* --------------------------------------------------
    UI Values
  -------------------------------------------------- */

  const activeChunk =
    session.activeChunkId
      ? session.chunks.find(
          (c) => c.chunkId === session.activeChunkId
        )
      : null;

  const hasReasoningDelta = Boolean(latestReasoningChunk);

  const imageActivityTitle =
    session.imageAnalyzing === true && !hasReasoningDelta
      ? "이미지 분석중"
      : null;

  const hasReasoning = Boolean(latestReasoningChunk);

  const title = null; // inline title not shown
  const activityLabel =
    typeof (contract.ui as any)?.activityLabel === "string"
      ? (contract.ui as any).activityLabel
      : "활동";
  const displayTitle =
    finalized
      ? "활동 완료"
      : activityLabel;

  const effectiveStarted =
    session.serverStartedAt ??
    session.startedAt ??
    Date.now();

  const [liveNow, setLiveNow] = useState(Date.now());
  // title swap trigger (key remount based)
  const [titleKey, setTitleKey] = useState(displayTitle);

  useEffect(() => {
    setTitleKey(displayTitle);
  }, [displayTitle]);

  const shouldFreezeTimer =
    finalized ||
    hasText ||
    session.finalized ||
    session.hasText ||
    Boolean(session.firstAnswerTokenAt);

  useEffect(() => {
    if (shouldFreezeTimer) return;
    const id = setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [shouldFreezeTimer]);

  const runningMs = Math.max(0, liveNow - effectiveStarted);
  const frozenMs =
    elapsedMs > 0
      ? elapsedMs
      : (session.firstThinkingAt != null && session.firstAnswerTokenAt != null)
        ? Math.max(0, session.firstAnswerTokenAt - session.firstThinkingAt)
        : 0;

  const activityTime = formatActivityDuration(
    shouldFreezeTimer ? frozenMs : runningMs
  );

  const openDrawer = () => {
    if (onOpen) {
      onOpen();
      return;
    }

    const store = useChatStore.getState();
    const active = store.messages.find(m => m.role === "assistant");
    const id = active?.id;
    if (!id) return;

    store.patchAssistantMeta(id, {
      drawerOpen: true,
    });
  };

  if (!shouldRender) return null;

  /* ==================================================
    Render
  ================================================== */

  return (
    <div
      data-yua-panel="thinking"
      className="px-0 py-3 mb-3"
      data-ssot="thinking-summary-bar"
    >
      <div className="flex flex-col gap-2">

        {/* Activity bar */}
        <div className="flex items-center justify-between w-full">

          {(
            session.stage === StreamStage.THINKING ||
            session.thinking?.active === true ||
            isDeep ||
            session.finalized ||
            session.thinkingSignalCount > 0 ||
            hasReasoningBlocks ||
            metaHasHistory
          ) ? (
            <button
              onClick={openDrawer}
              className="text-[20px] font-semibold text-[var(--text-primary)]
                      flex items-center relative"
            >
              <span
                key={titleKey}
                className="yua-title-swap inline-block"
              >
                {displayTitle}
              </span>
              {!hasReasoningSignal || finalized ? (
                <span className="ml-2 text-[14px] text-[var(--text-muted)] font-normal tabular-nums min-w-[3em] text-left">
                  {activityTime}
                </span>
              ) : null}
            </button>
          ) : null}

          {isDeep &&
           session.stage === StreamStage.THINKING &&
           !session.finalized &&
           !session.firstAnswerTokenAt ? (
            <button
              onClick={onUnlock}
              className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              즉시 응답하기
            </button>
          ) : null}
        </div>

        <div className="min-w-0">
          {displayText.length > 0 &&
           hasReasoningSignal &&
           !answerStarted && (
            <div className="mt-3 yua-inline-stream">
              <div
                key={latestReasoningChunk?.chunkId}
                className="yua-inline-line text-[17px] leading-[1.6] font-medium"
                onClick={openDrawer}
              >
                {displayText}
                {thinkingActive && <span className="yua-inline-caret" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
