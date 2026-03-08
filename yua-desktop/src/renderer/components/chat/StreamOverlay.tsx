// Activity existence check (SSOT)
import { useEffect, useMemo, useRef, useState } from "react";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";
import type { ChatMessageWithMeta } from "@/stores/useChatStore";
import type { AssistantThinkingMeta } from "@/stores/useChatStore";
import ThinkingPanel from "@/components/chat/ThinkingPanel";
import { TypingIndicator } from "./TypingIndicator";
import { useChatStore } from "@/stores/useChatStore";
import {
  getThinkingContract,
} from "yua-shared/types/thinkingProfile";
import { ActivityKind } from "yua-shared/stream/activity";
import { useAuth } from "@/contexts/DesktopAuthContext";

type ActivitySnapshot = {
  version: 1;
  thinkingProfile: "FAST" | "NORMAL" | "DEEP";
  startedAt: number | null;
  finalized: boolean;
  finalizedAt: number | null;
  chunks: any[];
  tools: any[];
  summaries: any[];
  primarySummaryId?: string | null;
};

export default function StreamOverlay({
  onUnlock,
  assistantMeta,
  assistantFinalized,
  assistantContent,
  assistantMessageId,
  assistantTraceId,
}: {
  onUnlock?: () => void;
  assistantMeta?: ChatMessageWithMeta["meta"] | null;
  assistantFinalized?: boolean;
  assistantContent?: string;
  assistantMessageId?: string | null;
  assistantTraceId?: string | null;
}) {
  const { session } = useStreamSessionStore();
  const [historySnapshot, setHistorySnapshot] = useState<ActivitySnapshot | null>(null);
  const [historySnapshotLoading, setHistorySnapshotLoading] = useState(false);
  const { authFetch } = useAuth();

  // SSOT: reload(History) fallback
  const effectiveMessageId: string | null =
    (session.messageId ?? null) || (assistantMessageId ?? null);

  const finalizedEffective =
    Boolean(session.finalized) || Boolean(assistantFinalized);

  const hasAnswerTextEffective =
    Boolean(session.hasText) ||
    Boolean((assistantContent ?? "").trim().length > 0);

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

  // History drawer open snapshot fetch (session leak prevention)
  useEffect(() => {
    if (!assistantTraceId) return;
    const profile =
      assistantMeta?.thinking?.thinkingProfile ??
      (assistantMeta as any)?.thinkingProfile;

    if (profile !== "DEEP") return;
    if (session.active === true || session.streaming === true) return;
    if (historySnapshot || historySnapshotLoading) return;
    if (!authFetch) return;

    let cancelled = false;
    setHistorySnapshotLoading(true);

    authFetch(`/api/chat/snapshot?traceId=${encodeURIComponent(assistantTraceId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && j?.snapshot) {
          setHistorySnapshot(j.snapshot as ActivitySnapshot);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setHistorySnapshotLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    assistantTraceId,
    assistantMeta?.drawerOpen,
    session.active,
    session.streaming,
    historySnapshot,
    historySnapshotLoading,
  ]);

  const isReasoningKind = (kind: unknown): boolean => {
    if (!kind) return false;
    if (reasoningKinds.has(kind as ActivityKind)) return true;
    if (typeof kind === "string" && kind === "REASONING_SUMMARY")
      return true;
    return false;
  };

  const snapshotChunks: any[] =
    Array.isArray(historySnapshot?.chunks) ? historySnapshot!.chunks : [];

  const effectiveChunks = useMemo(() => {
    return session.chunks && session.chunks.length > 0 ? session.chunks : (snapshotChunks as any);
  }, [session.chunks, snapshotChunks]);

  const snapshotSummaries: any[] =
    Array.isArray(historySnapshot?.summaries) ? historySnapshot!.summaries : [];

  const effectiveSummaries = useMemo(() => {
    return session.summaries && session.summaries.length > 0 ? session.summaries : (snapshotSummaries as any);
  }, [session.summaries, snapshotSummaries]);

  const hasReasoningBlocks =
    (effectiveChunks ?? []).some((c: any) => isReasoningKind(c.kind));

  const hasRuntimeSession =
    session.startedAt != null && session.messageId != null;

  /* =========================
     Profile
  ========================= */
  const messageMetaProfile =
    assistantMeta?.thinking?.thinkingProfile ??
    (assistantMeta as any)?.thinkingProfile ??
    (assistantMeta as any)?.profile ??
    session.thinkingProfile ??
    session.mode ??
    "NORMAL";

  const isDeep = messageMetaProfile === "DEEP";
  const contract = getThinkingContract(messageMetaProfile);

  /* =========================
     Active chunk / inline
  ========================= */
  const primarySummary = session.primarySummaryId
    ? effectiveSummaries.find((s: any) => s.id === session.primarySummaryId)
    : null;

  const latestReasoningChunk =
    (effectiveChunks ?? []).filter((c: any) => isReasoningKind(c.kind)).slice(-1)[0] ??
    null;

  const lastSentence = (text: string) => {
    const match = text.match(/(.+?[.!?])(\s|$)/g);
    if (!match || match.length === 0) return "";
    return match[match.length - 1].trim();
  };

  const inlineText: string | null =
    primarySummary?.summary ??
    latestReasoningChunk?.inline ??
    latestReasoningChunk?.body ??
    (latestReasoningChunk?.body
      ? lastSentence(latestReasoningChunk.body)
      : null);

  const hasRealAnswerText = hasAnswerTextEffective;
  const isSearchMode =
    session.actionKind === "SEARCH" ||
    (effectiveChunks ?? []).some((c: any) =>
      c.metaTool === "SEARCH" ||
      c.kind === ActivityKind.SEARCHING
    );

  const metaThinking: AssistantThinkingMeta | null =
    assistantMeta?.thinking ?? null;

  const metaDrawerOpen =
    assistantMeta?.drawerOpen === true;
  const shouldHideInline =
    hasRealAnswerText && !isSearchMode && !hasReasoningBlocks;

  const metaSummaries = Array.isArray(metaThinking?.summaries)
    ? metaThinking?.summaries
    : null;
  const metaSummariesLen = metaSummaries ? metaSummaries.length : 0;

  const metaHasHistory =
    Boolean(metaThinking) &&
    (metaThinking?.thinkingProfile === "DEEP" || metaSummariesLen > 0);

  const canShowPanel =
    !isSearchMode && (
      isDeep ||
      (effectiveChunks ?? []).some((c: any) =>
        c.kind === ActivityKind.TOOL ||
        c.kind === ActivityKind.SEARCHING ||
        reasoningKinds.has(c.kind as ActivityKind)
      ) ||
      metaHasHistory ||
      assistantMeta?.drawerOpen === true
    );

  /* =========================
     SSOT: elapsed (ONE ONLY)
  ========================= */
  const snapshotStartedAt =
    typeof historySnapshot?.startedAt === "number" ? historySnapshot!.startedAt : null;
  const snapshotFinalizedAt =
    typeof historySnapshot?.finalizedAt === "number" ? historySnapshot!.finalizedAt : null;

  const thinkingElapsedMs =
    session.firstThinkingAt != null && session.firstAnswerTokenAt != null
      ? Math.max(0, session.firstAnswerTokenAt - session.firstThinkingAt)
      : (snapshotStartedAt != null && snapshotFinalizedAt != null && snapshotFinalizedAt >= snapshotStartedAt
          ? Math.max(0, snapshotFinalizedAt - snapshotStartedAt)
          : 0);

  /* =========================
     Visibility flags
  ========================= */

  const hasReasoningSignal =
    session.thinkingSignalCount > 0 ||
    Boolean(inlineText) ||
    session.thinking.active;

  // typing 시작 조건: finalized 아님 + DEEP 아님 (hasText는 여기서 제외 — grace period 보장)
  const shouldStartTyping =
    contract.ui.typingEnabled &&
    !session.finalized &&
    !isDeep;

  // ChatGPT-style typing minimum display time (600ms)
  const [typingExpired, setTypingExpired] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStartedRef = useRef(false);

  useEffect(() => {
    if (shouldStartTyping && !session.hasText && !typingStartedRef.current) {
      // 스트리밍 시작, 아직 텍스트 없음 → 타이핑 시작 (1회만)
      typingStartedRef.current = true;
      setTypingExpired(false);
      typingTimerRef.current = setTimeout(() => setTypingExpired(true), 600);
    } else if (!shouldStartTyping) {
      // finalized 또는 deep → 전부 리셋
      typingStartedRef.current = false;
      setTypingExpired(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    // hasText가 true로 바뀌어도 timer는 유지 (grace period 보장)
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [shouldStartTyping, session.hasText]);

  // typing은 grace period(600ms) 끝나면 숨기되, 실제 콘텐츠 준비됐을 때만
  const typingVisible =
    typingStartedRef.current &&
    !session.finalized &&
    !isDeep &&
    !(typingExpired && (hasAnswerTextEffective || session.chunks.length > 0));

  /* =========================
     Active chunk / inline
  ========================= */

  const activeChunk =
    session.activeChunkId
      ? session.chunks.find((c) => c.chunkId === session.activeChunkId) ?? null
      : null;

  const activeGroupIndex =
    typeof activeChunk?.groupIndex === "number"
      ? activeChunk.groupIndex
      : null;

  const searchQueries: string[] =
    activeGroupIndex !== null
      ? Array.from(
          new Set(
            (effectiveChunks ?? [])
              .filter((c: any) =>
                c.metaTool === "SEARCH" &&
                c.groupIndex === activeGroupIndex
              )
              .map((c: any) => c.meta?.query)
              .filter(
                (v: unknown): v is string =>
                  typeof v === "string" && v.length > 0
              )
          )
        )
      : [];

  const panelChunks =
    (effectiveChunks ?? []).filter((c: any) =>
      reasoningKinds.has(c.kind as ActivityKind)
    );

  /* =========================
     Render
  ========================= */
  const hasSlotContent = typingVisible || canShowPanel || (!canShowPanel && !!inlineText && !hasAnswerTextEffective);

  return (
    <div className="stream-overlay-stable" data-ssot="stream-overlay">
      {/* Single slot: typing OR panel OR inline fallback */}
      <div
        className={`stream-overlay-slot ${hasSlotContent ? "stream-overlay-slot--active" : ""}`}
        style={{
          minHeight: 44,
        }}
      >
        {typingVisible && (
          <div
            className="text-gray-500 pointer-events-none"
            data-ssot="typing"
          >
            <TypingIndicator />
          </div>
        )}
        {!typingVisible && canShowPanel && (
          <ThinkingPanel
            label={session.label ?? null}
            elapsedMs={thinkingElapsedMs}
            profile={messageMetaProfile}
            finalized={finalizedEffective}
            hasText={hasAnswerTextEffective}
            thinkingActive={session.thinking.active}
            thinkingCompleted={Boolean(session.thinkingCompletedAt)}
            summaries={effectiveSummaries as any}
            inlineSummary={shouldHideInline ? null : inlineText}
            deepVariant={session.deepVariant ?? "STANDARD"}
            modelId={session.modelId ?? null}
            onUnlock={onUnlock}
            metaThinking={metaThinking}
            onOpen={() => {
              if (!effectiveMessageId) return;
              const store = useChatStore.getState();
              const current = store.messages.find((m) => m.id === effectiveMessageId);
              const isOpen = current?.meta?.drawerOpen === true;

              if (isOpen) {
                store.patchAssistantMeta(effectiveMessageId, { drawerOpen: false });
                return;
              }

              // SSOT safety: only one drawer-open message at a time
              store.messages.forEach((m) => {
                if (m.meta?.drawerOpen && m.id !== effectiveMessageId) {
                  store.patchAssistantMeta(m.id, { drawerOpen: false });
                }
              });
              store.patchAssistantMeta(effectiveMessageId, { drawerOpen: true });
            }}
          />
        )}
        {!typingVisible && !canShowPanel && inlineText && !hasAnswerTextEffective && (
          <div className="text-[15px] font-medium text-gray-800 dark:text-[var(--text-secondary)] animate-yua-inline-activity">
            {inlineText}
          </div>
        )}
      </div>
      {searchQueries.length > 0 && (
        <div className="mb-2 text-[14px] text-gray-600 animate-yua-inline-activity">
          <div className="mt-1 space-y-1">
            {searchQueries.map((q) => (
              <div
                key={`search-${q}`}
                className="animate-yua-inline-activity"
              >
                • Searching: {q}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
