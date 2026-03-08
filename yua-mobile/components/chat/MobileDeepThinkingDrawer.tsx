import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import {
  computeDisplayElapsed,
  getThinkingContract,
} from "yua-shared/types/thinkingProfile";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

import {
  useMobileStreamSessionStore,
  type MobileOverlayChunk,
  type MobileThinkingSummary,
} from "@/store/useMobileStreamSessionStore";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import ThinkingChunkCard from "./ThinkingChunkCard";

/* ==============================
   Types
============================== */

type Props = {
  open: boolean;
  onClose: () => void;
  messageId: string;
  traceId: string | null;
  profileHint: "FAST" | "NORMAL" | "DEEP" | null;
};

/* ==============================
   Helpers
============================== */

function formatActivityDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

/* ==============================
   Component
============================== */

export default function MobileDeepThinkingDrawer({
  open,
  onClose,
  messageId,
  traceId,
  profileHint,
}: Props) {
  const { colors } = useTheme();
  const { authFetch } = useMobileAuth();

  /* ---- Bottom sheet ref ---- */
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  /* ---- Stream session (minimal subscription) ---- */
  const session = useMobileStreamSessionStore();

  /* ---- Snapshot state (for finalized messages) ---- */
  const [snapshotChunks, setSnapshotChunks] = useState<MobileOverlayChunk[]>([]);
  const [snapshotSummaries, setSnapshotSummaries] = useState<MobileThinkingSummary[]>([]);
  const [snapshotStartedAt, setSnapshotStartedAt] = useState<number | null>(null);
  const [snapshotFinalizedAt, setSnapshotFinalizedAt] = useState<number | null>(null);
  const attemptedTraceRef = useRef<string | null>(null);
  const inflightRef = useRef(false);

  /* ---- Determine if live session applies ---- */
  const isLiveSession =
    session.active &&
    session.messageId != null &&
    String(session.messageId) === String(messageId);

  /* ---- Effective data ---- */
  const effectiveChunks = isLiveSession
    ? session.chunks
    : snapshotChunks.length > 0
      ? snapshotChunks
      : session.chunks;

  const effectiveSummaries = isLiveSession
    ? session.summaries
    : snapshotSummaries.length > 0
      ? snapshotSummaries
      : session.summaries;

  const startedAt = isLiveSession
    ? session.startedAt
    : snapshotStartedAt ?? session.startedAt;

  const finalizedAt = isLiveSession
    ? session.finalizedAt
    : snapshotFinalizedAt ?? session.finalizedAt;

  const isFinalized = isLiveSession ? session.finalized : true;

  /* ---- Profile ---- */
  const profile: ThinkingProfile = useMemo(() => {
    const fromSession = session.thinkingProfile ?? session.mode;
    return (fromSession ?? profileHint ?? "NORMAL") as ThinkingProfile;
  }, [session.thinkingProfile, session.mode, profileHint]);

  const contract = useMemo(() => getThinkingContract(profile), [profile]);

  /* ---- Elapsed time (live updating) ---- */
  const [liveNow, setLiveNow] = useState(Date.now());
  const freeze = isFinalized || session.hasText;

  useEffect(() => {
    if (!open) return;
    if (freeze) return;

    const id = setInterval(() => {
      setLiveNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [open, freeze]);

  const displayElapsed = useMemo(() => {
    if (isFinalized && finalizedAt != null && startedAt != null) {
      return Math.max(0, finalizedAt - startedAt);
    }
    if (freeze && startedAt != null && session.firstAnswerTokenAt != null) {
      return Math.max(0, session.firstAnswerTokenAt - startedAt);
    }
    if (startedAt != null) {
      return Math.max(0, liveNow - startedAt);
    }
    return 0;
  }, [isFinalized, finalizedAt, startedAt, freeze, session.firstAnswerTokenAt, liveNow]);

  const displayElapsedCurved = useMemo(
    () => computeDisplayElapsed(displayElapsed, contract),
    [displayElapsed, contract],
  );

  const elapsedLabel = formatActivityDuration(displayElapsedCurved);

  /* ---- Snapshot hydrate ---- */
  useEffect(() => {
    if (!open) return;
    if (!traceId) return;
    if (isLiveSession) return;
    if (effectiveChunks.length > 0 && !snapshotChunks.length) return;
    if (snapshotChunks.length > 0) return;
    if (!authFetch) return;
    if (attemptedTraceRef.current === traceId) return;
    if (inflightRef.current) return;

    let cancelled = false;
    inflightRef.current = true;
    attemptedTraceRef.current = traceId;

    authFetch(`/api/chat/snapshot?traceId=${encodeURIComponent(traceId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && j?.snapshot) {
          const snap = j.snapshot;
          if (Array.isArray(snap.chunks)) {
            setSnapshotChunks(
              snap.chunks.map((c: any, i: number) => ({
                chunkId: c.chunkId ?? c.id ?? `snap-${i}`,
                index: c.index ?? i,
                at: c.at ?? Date.now(),
                source: "ACTIVITY" as const,
                title: c.title ?? null,
                body: c.body ?? null,
                inline: c.inline ?? c.inlineSummary ?? null,
                kind: c.kind,
                meta: c.meta ?? null,
                done: true,
              })),
            );
          }
          if (Array.isArray(snap.summaries)) {
            setSnapshotSummaries(
              snap.summaries.map((s: any) => ({
                id: s.id ?? `sum-${Math.random()}`,
                title: s.title ?? null,
                summary: s.summary ?? null,
                status: "DONE" as const,
              })),
            );
          }
          if (typeof snap.startedAt === "number") setSnapshotStartedAt(snap.startedAt);
          if (typeof snap.finalizedAt === "number") setSnapshotFinalizedAt(snap.finalizedAt);
        }
      })
      .catch(() => {})
      .finally(() => {
        inflightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [open, traceId, isLiveSession, effectiveChunks.length, snapshotChunks.length, authFetch]);

  /* ---- Bottom sheet open/close ---- */
  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  /* ---- Don't render if not open ---- */
  if (!open) return null;

  /* ---- Profile badge ---- */
  const profileBadge = profile === "DEEP" ? "DEEP" : profile === "FAST" ? "FAST" : "NORMAL";

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={[
        styles.sheetBg,
        { backgroundColor: colors.drawerBg },
      ]}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: colors.drawerHandleIndicator },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.line },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.textPrimary },
            ]}
          >
            Deep Thinking
          </Text>
          <View
            style={[
              styles.profileBadge,
              { backgroundColor: colors.thinkChipBg },
            ]}
          >
            <Text
              style={[
                styles.profileBadgeText,
                { color: colors.thinkChipColor },
              ]}
            >
              {profileBadge}
            </Text>
          </View>
          {elapsedLabel ? (
            <Text style={styles.elapsedText}>{elapsedLabel}</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
        >
          <Text
            style={[
              styles.closeX,
              { color: colors.textMuted },
            ]}
          >
            {"\u2715"}
          </Text>
        </Pressable>
      </View>

      {/* Body */}
      <BottomSheetScrollView
        contentContainerStyle={styles.bodyContent}
      >
        {/* Section label */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textPrimary },
          ]}
        >
          {(contract.ui as any)?.drawerSectionLabel ?? "잘 생각하기"}
        </Text>

        {/* Chunks */}
        {effectiveChunks.length === 0 && !isFinalized ? (
          <View style={styles.skeletonWrap}>
            <View style={[styles.skeletonLine, { width: "70%" }]} />
            <View style={[styles.skeletonLine, { width: "85%" }]} />
            <View style={[styles.skeletonLine, { width: "60%" }]} />
          </View>
        ) : (
          effectiveChunks.map((chunk, idx) => (
            <ThinkingChunkCard key={`${chunk.chunkId}-${idx}`} chunk={chunk} />
          ))
        )}

        {/* Summaries */}
        {effectiveSummaries.length > 0 ? (
          <View style={styles.summariesSection}>
            <Text
              style={[
                styles.summariesTitle,
                { color: colors.summariesTitleColor },
              ]}
            >
              {"요약"}
            </Text>
            {effectiveSummaries.map((summary) => (
              <View key={summary.id} style={styles.summaryCard}>
                {summary.title ? (
                  <Text
                    style={[
                      styles.summaryCardTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {summary.title}
                  </Text>
                ) : null}
                {summary.summary ? (
                  <Text
                    style={[
                      styles.summaryCardBody,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {summary.summary}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Finalized footer */}
        {isFinalized && effectiveChunks.length > 0 ? (
          <View style={styles.finalizedFooter}>
            <Text style={styles.finalizedCheck}>{"\u2713"}</Text>
            <Text
              style={[
                styles.finalizedText,
                { color: colors.finalizedTextColor },
              ]}
            >
              {"생각 완료"}
            </Text>
          </View>
        ) : null}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  sheetBg: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetBgLight: {
    backgroundColor: "#ffffff",
  },
  sheetBgDark: {
    backgroundColor: "#1a1a1a",
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  handleIndicatorLight: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  handleIndicatorDark: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBorderLight: {
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerBorderDark: {
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerTitleLight: {
    color: "#111111",
  },
  headerTitleDark: {
    color: "#f5f5f5",
  },
  profileBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  profileBadgeLight: {
    backgroundColor: "#dbeafe",
  },
  profileBadgeDark: {
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  profileBadgeTextLight: {
    color: "#1e40af",
  },
  profileBadgeTextDark: {
    color: "#93c5fd",
  },
  elapsedText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeXLight: {
    color: "#6b7280",
  },
  closeXDark: {
    color: "#9ca3af",
  },

  /* Body */
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionLabelLight: {
    color: "#111111",
  },
  sectionLabelDark: {
    color: "#f5f5f5",
  },

  /* Skeleton */
  skeletonWrap: {
    gap: 12,
    marginBottom: 16,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  /* Summaries */
  summariesSection: {
    marginTop: 16,
    gap: 8,
  },
  summariesTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  summariesTitleLight: {
    color: "#9ca3af",
  },
  summariesTitleDark: {
    color: "#6b7280",
  },
  summaryCard: {
    gap: 4,
    marginBottom: 8,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryCardTitleLight: {
    color: "#111111",
  },
  summaryCardTitleDark: {
    color: "#f5f5f5",
  },
  summaryCardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCardBodyLight: {
    color: "#374151",
  },
  summaryCardBodyDark: {
    color: "#d1d5db",
  },

  /* Finalized footer */
  finalizedFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  finalizedCheck: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "700",
  },
  finalizedText: {
    fontSize: 14,
    fontWeight: "500",
  },
  finalizedTextLight: {
    color: "#374151",
  },
  finalizedTextDark: {
    color: "#d1d5db",
  },
});
