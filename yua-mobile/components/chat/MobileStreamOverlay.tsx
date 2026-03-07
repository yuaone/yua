import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import MobileTypingIndicator from "@/components/chat/MobileTypingIndicator";
import {
  useMobileStreamSessionStore,
  type MobileStreamSession,
} from "@/store/useMobileStreamSessionStore";
import type { MobileChatMessageMeta } from "@/features/chat/model/chat-message.types";
import { ActivityKind } from "yua-shared/stream/activity";

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

function formatElapsed(ms: number): string {
  if (ms <= 0) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
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

  const hasReasoningBlocks = effectiveChunks.some((c) =>
    isReasoningKind(c.kind),
  );

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
  const shouldShowTyping =
    session.streaming && !hasText && !session.finalized && !isDeep;

  const [typingExpired, setTypingExpired] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldShowTyping) {
      setTypingExpired(false);
      typingTimerRef.current = setTimeout(() => setTypingExpired(true), 600);
    } else {
      setTypingExpired(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [shouldShowTyping]);

  const typingVisible =
    shouldShowTyping && !(typingExpired && canShowPanel);

  /* ---------- Panel Visibility ---------- */
  const shouldHideInline = hasText && !hasReasoningBlocks;

  /* ---------- Gate ---------- */
  if (!shouldRender) return null;

  const hasSlotContent =
    typingVisible ||
    canShowPanel ||
    (!canShowPanel && !!inline && !hasText);

  if (!hasSlotContent) return null;

  /* ---------- Profile Label ---------- */
  const profileLabel =
    metaProfile === "DEEP"
      ? "Deep thinking"
      : metaProfile === "FAST"
        ? "Fast"
        : "Thinking";

  const elapsedLabel = formatElapsed(thinkingElapsedMs);

  /* ---------- Summaries for panel ---------- */
  const panelSummaries = effectiveSummaries.length > 0
    ? effectiveSummaries
    : (assistantMeta?.thinking?.summaries ?? []).map((s) => ({
        ...s,
        title: null as string | null,
        status: "DONE" as const,
      }));

  const primarySummary = session.primarySummaryId
    ? panelSummaries.find((s) => s.id === session.primarySummaryId)
    : null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.thinkPanelBg, borderColor: colors.thinkPanelBorder }]}>
      {/* Typing Indicator */}
      {typingVisible && <MobileTypingIndicator />}

      {/* Thinking Panel (inline) */}
      {!typingVisible && canShowPanel && (
        <Pressable
          style={styles.panelContent}
          onPress={isDeep && onOpenDrawer ? onOpenDrawer : undefined}
          disabled={!isDeep || !onOpenDrawer}
        >
          <View style={styles.panelHeader}>
            <Text
              style={[
                styles.panelLabel,
                { color: colors.thinkPanelLabel },
              ]}
            >
              {profileLabel}
            </Text>
            {elapsedLabel ? (
              <Text style={styles.panelElapsed}>{elapsedLabel}</Text>
            ) : null}
          </View>

          {/* Inline summary */}
          {!shouldHideInline && inline ? (
            <Text
              style={[
                styles.panelInline,
                { color: colors.thinkPanelInline },
              ]}
              numberOfLines={3}
            >
              {inline}
            </Text>
          ) : null}

          {/* Primary summary */}
          {primarySummary?.summary ? (
            <Text
              style={[
                styles.panelSummary,
                { color: colors.thinkPanelSummary },
              ]}
              numberOfLines={4}
            >
              {primarySummary.summary}
            </Text>
          ) : null}

          {/* DEEP: tap hint */}
          {isDeep && onOpenDrawer && (
            <Text style={styles.panelHint}>
              {"\uD0ED\uD558\uC5EC \uC0AC\uACE0 \uACFC\uC815 \uBCF4\uAE30"}
            </Text>
          )}
        </Pressable>
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    minHeight: 40,
  },
  wrapLight: {
    backgroundColor: "#f0f4ff",
    borderWidth: 1,
    borderColor: "#dbe4ff",
  },
  wrapDark: {
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
  },
  panelContent: {
    gap: 6,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  panelLabelLight: {
    color: "#1e3a8a",
  },
  panelLabelDark: {
    color: "#93c5fd",
  },
  panelElapsed: {
    fontSize: 11,
    color: "#6b7280",
  },
  panelInline: {
    fontSize: 13,
    lineHeight: 19,
  },
  panelInlineLight: {
    color: "#334155",
  },
  panelInlineDark: {
    color: "#d1d5db",
  },
  panelSummary: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
  },
  panelSummaryLight: {
    color: "#475569",
  },
  panelSummaryDark: {
    color: "#9ca3af",
  },
  panelHint: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  inlineFallback: {
    fontSize: 14,
    fontWeight: "500",
  },
  inlineFallbackLight: {
    color: "#1f2937",
  },
  inlineFallbackDark: {
    color: "#d1d5db",
  },
});
