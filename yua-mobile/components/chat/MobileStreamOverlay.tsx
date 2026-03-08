import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import MobileTypingIndicator from "@/components/chat/MobileTypingIndicator";
import ThinkingCollapsible from "@/components/chat/ThinkingCollapsible";
import {
  useMobileStreamSessionStore,
  type MobileStreamSession,
} from "@/store/useMobileStreamSessionStore";
import type { MobileChatMessageMeta } from "@/features/chat/model/chat-message.types";
import { ActivityKind } from "yua-shared/stream/activity";
import { getThinkingContract } from "yua-shared/types/thinkingProfile";

type Props = {
  assistantMeta?: MobileChatMessageMeta | null;
  assistantFinalized?: boolean;
  assistantContent?: string;
  assistantMessageId?: string | null;
  onOpenDrawer?: () => void;
};

/* ==============================
   Helpers
============================== */

const reasoningKinds = new Set<ActivityKind>([
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
]);

function isReasoningKind(kind: unknown): boolean {
  if (!kind) return false;
  if (reasoningKinds.has(kind as ActivityKind)) return true;
  if (typeof kind === "string" && kind === "REASONING_SUMMARY") return true;
  return false;
}

function pickInlineSummary(
  session: MobileStreamSession,
  meta?: MobileChatMessageMeta | null,
): string | null {
  const summaries = meta?.thinking?.summaries ?? [];
  const primary = meta?.thinking?.primarySummaryId
    ? summaries.find((s) => s.id === meta.thinking?.primarySummaryId)
    : null;
  if (primary?.summary?.trim()) return primary.summary.trim();

  const latestChunk = [...(meta?.thinking?.chunks ?? [])]
    .reverse()
    .find((chunk) => (chunk.inline ?? chunk.body ?? "").trim().length > 0);
  const candidate = latestChunk?.inline ?? latestChunk?.body ?? null;
  if (candidate?.trim()) return candidate.trim();

  const sessionInline = session.chunks
    .slice()
    .reverse()
    .find((c) => (c.inline ?? c.body ?? "").trim().length > 0);
  return sessionInline?.inline ?? sessionInline?.body ?? null;
}

/* ==============================
   Component
============================== */

export default function MobileStreamOverlay({
  assistantMeta,
  assistantFinalized = false,
  assistantContent = "",
  assistantMessageId,
  onOpenDrawer,
}: Props) {
  const { colors } = useTheme();
  const session = useMobileStreamSessionStore();

  const isActiveMessage =
    session.messageId != null &&
    assistantMessageId != null &&
    String(session.messageId) === String(assistantMessageId);

  /* ---------- Profile ---------- */
  const metaProfile =
    assistantMeta?.thinking?.thinkingProfile ??
    assistantMeta?.thinkingProfile ??
    session.thinkingProfile;
  const isDeep = metaProfile === "DEEP";

  /* ---------- Visibility Gate ---------- */
  const shouldRender =
    isActiveMessage ||
    assistantMeta?.drawerOpen === true ||
    (assistantFinalized && isDeep);

  /* ---------- Chunks / Summaries ---------- */
  const effectiveChunks = session.chunks;
  const effectiveSummaries = session.summaries;

  const metaHasHistory =
    Boolean(assistantMeta?.thinking) &&
    (assistantMeta?.thinking?.thinkingProfile === "DEEP" ||
      (assistantMeta?.thinking?.summaries?.length ?? 0) > 0);

  const canShowPanel =
    isDeep ||
    effectiveChunks.some(
      (c) =>
        c.kind === ActivityKind.TOOL ||
        c.kind === ActivityKind.SEARCHING ||
        isReasoningKind(c.kind),
    ) ||
    metaHasHistory ||
    assistantMeta?.drawerOpen === true;

  /* ---------- Inline Summary ---------- */
  const inline = useMemo(
    () => pickInlineSummary(session, assistantMeta),
    [assistantMeta, session],
  );

  const hasText = Boolean(assistantContent?.trim().length);

  /* ---------- Elapsed ---------- */
  const thinkingElapsedMs =
    session.firstThinkingAt != null && session.firstAnswerTokenAt != null
      ? Math.max(0, session.firstAnswerTokenAt - session.firstThinkingAt)
      : 0;

  /* ---------- Typing Indicator (min 600ms) ---------- */
  const contract = getThinkingContract(metaProfile ?? "NORMAL");
  // typing 시작 조건: contract 허용 + finalized 아님 + DEEP 아님 (hasText는 제외 — grace period 보장)
  const shouldStartTyping =
    contract.ui.typingEnabled &&
    !session.finalized && !isDeep;

  const [typingExpired, setTypingExpired] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStartedRef = useRef(false);

  useEffect(() => {
    if (shouldStartTyping && !hasText && !typingStartedRef.current) {
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
  }, [shouldStartTyping, hasText]);

  // typing은 grace period(600ms) 끝나면 숨기되, 실제 콘텐츠 준비됐을 때만
  const typingVisible =
    typingStartedRef.current &&
    !session.finalized &&
    !isDeep &&
    !(typingExpired && (hasText || effectiveChunks.length > 0));

  /* ---------- Panel Visibility ---------- */
  // NORMAL/FAST mode: hide panel once answer text starts appearing
  const hideNonDeepPanel = !isDeep && hasText;

  /* ---------- Gate ---------- */
  if (!shouldRender) return null;

  const hasSlotContent =
    typingVisible ||
    (canShowPanel && !hideNonDeepPanel) ||
    (!canShowPanel && !!inline && !hasText);

  if (!hasSlotContent) return null;

  /* ---------- Summaries for panel ---------- */
  const panelSummaries = effectiveSummaries.length > 0
    ? effectiveSummaries
    : (assistantMeta?.thinking?.summaries ?? []).map((s) => ({
        ...s,
        title: null as string | null,
        status: "DONE" as const,
      }));

  return (
    <View style={styles.wrap}>
      {/* Typing Indicator */}
      {typingVisible && <MobileTypingIndicator />}

      {/* ThinkingCollapsible — replaces inline panel + drawer hint */}
      {!typingVisible && canShowPanel && !hideNonDeepPanel && (
        <ThinkingCollapsible
          chunks={effectiveChunks}
          summaries={panelSummaries}
          profile={metaProfile ?? null}
          elapsed={thinkingElapsedMs}
          finalized={session.finalized}
          hasText={hasText}
        />
      )}

      {/* Inline fallback (no panel, but has inline and no answer text yet) */}
      {!typingVisible && !canShowPanel && inline && !hasText && (
        <Text
          style={[
            styles.inlineFallback,
            { color: colors.inlineFallbackText },
          ]}
        >
          {inline}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  inlineFallback: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
