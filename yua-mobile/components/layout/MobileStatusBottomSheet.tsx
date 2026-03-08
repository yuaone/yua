import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useTheme } from "@/hooks/useTheme";
import type { ActivityItem } from "yua-shared/stream/activity";
import type { MobileOverlayChunk, MobileThinkingSummary } from "@/store/useMobileStreamSessionStore";

/* ==============================
   Types
============================== */

type Props = {
  open: boolean;
  onClose: () => void;
  streamStateLabel: string;
  tokenChars: number;
  traceId?: string | null;
  thinkingProfile?: string | null;
  streamStage?: string | null;
  activity: ActivityItem[];
  sessionChunks: MobileOverlayChunk[];
  sessionSummaries: MobileThinkingSummary[];
  sessionLabel?: string | null;
  startedAt?: number | null;
  finalizedAt?: number | null;
  finalized?: boolean;
};

/* ==============================
   Helpers
============================== */

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function formatElapsed(startedAt?: number | null, finalizedAt?: number | null, finalized?: boolean) {
  if (!startedAt) return "";
  const end = finalized ? finalizedAt ?? Date.now() : Date.now();
  const sec = Math.max(0, Math.floor((end - startedAt) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "Idle";
  const map: Record<string, string> = {
    INIT: "Initializing",
    THINKING: "Thinking",
    ANSWERING: "Answering",
    DONE: "Done",
    ERROR: "Error",
  };
  return map[stage] ?? stage;
}

/* ==============================
   Component
============================== */

export default function MobileStatusBottomSheet({
  open,
  onClose,
  streamStateLabel,
  tokenChars,
  traceId,
  thinkingProfile,
  streamStage,
  activity,
  sessionChunks,
  sessionSummaries,
  sessionLabel,
  startedAt,
  finalizedAt,
  finalized,
}: Props) {
  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["40%", "75%"], []);

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

  if (!open) return null;

  const elapsed = formatElapsed(startedAt, finalizedAt, finalized);
  const hasActivity = activity.length > 0 || sessionChunks.length > 0;
  const isStreaming = streamStateLabel === "STREAMING" || streamStateLabel === "THINKING";

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
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Status
        </Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <Text style={[styles.closeX, { color: colors.textMuted }]}>{"\u2715"}</Text>
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.bodyContent}>
        {/* Stream Status Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceSidebar, borderColor: colors.line }]}>
          <View style={styles.cardRow}>
            <View style={[styles.statusDot, isStreaming ? styles.statusDotActive : styles.statusDotIdle]} />
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Stream</Text>
            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{streamStateLabel}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Stage</Text>
            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{stageLabel(streamStage)}</Text>
          </View>
          {thinkingProfile ? (
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Profile</Text>
              <View style={[styles.profileBadge, { backgroundColor: colors.thinkChipBg }]}>
                <Text style={[styles.profileBadgeText, { color: colors.thinkChipColor }]}>{thinkingProfile}</Text>
              </View>
            </View>
          ) : null}
          {tokenChars > 0 ? (
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Tokens</Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{tokenChars.toLocaleString()} chars</Text>
            </View>
          ) : null}
          {elapsed ? (
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Elapsed</Text>
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{elapsed}</Text>
            </View>
          ) : null}
          {traceId ? (
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Trace</Text>
              <Text style={[styles.traceValue, { color: colors.textMuted }]} numberOfLines={1}>{traceId}</Text>
            </View>
          ) : null}
        </View>

        {/* Activity Timeline */}
        {hasActivity ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Activity
            </Text>
            {sessionChunks.length > 0
              ? sessionChunks.map((chunk, idx) => (
                  <View key={`${chunk.chunkId}-${idx}`} style={[styles.activityRow, { borderColor: colors.line }]}>
                    <View style={styles.activityHeader}>
                      <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
                        {chunk.title ?? String(chunk.kind ?? "Activity")}
                      </Text>
                      <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                        {chunk.done ? "Done" : "Running"} {formatTime(chunk.at)}
                      </Text>
                    </View>
                    {chunk.inline ? (
                      <Text style={[styles.activityBody, { color: colors.textSecondary }]} numberOfLines={3}>
                        {chunk.inline}
                      </Text>
                    ) : null}
                    {chunk.body ? (
                      <Text style={[styles.activityBody, { color: colors.textSecondary }]} numberOfLines={3}>
                        {chunk.body}
                      </Text>
                    ) : null}
                  </View>
                ))
              : activity.map((item, idx) => (
                  <View key={item.id ?? idx} style={[styles.activityRow, { borderColor: colors.line }]}>
                    <View style={styles.activityHeader}>
                      <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
                        {item.title ?? item.kind}
                      </Text>
                      <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                        {formatTime(item.at)}
                      </Text>
                    </View>
                    {item.inlineSummary ? (
                      <Text style={[styles.activityBody, { color: colors.textSecondary }]} numberOfLines={3}>
                        {item.inlineSummary}
                      </Text>
                    ) : null}
                  </View>
                ))}
          </View>
        ) : null}

        {/* Summaries */}
        {sessionSummaries.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Summaries
            </Text>
            {sessionSummaries.map((summary) => (
              <View key={summary.id} style={styles.summaryItem}>
                {summary.title ? (
                  <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{summary.title}</Text>
                ) : null}
                {summary.summary ? (
                  <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>{summary.summary}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Finalized indicator */}
        {finalized && (sessionChunks.length > 0 || activity.length > 0) ? (
          <View style={styles.finalizedRow}>
            <Text style={styles.finalizedCheck}>{"\u2713"}</Text>
            <Text style={[styles.finalizedText, { color: colors.textSecondary }]}>Complete</Text>
          </View>
        ) : null}

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
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
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
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Status Card */
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: "#22c55e",
  },
  statusDotIdle: {
    backgroundColor: "#9ca3af",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "500",
    width: 56,
  },
  cardValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  traceValue: {
    fontSize: 11,
    flex: 1,
  },
  profileBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Section */
  section: {
    marginTop: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },

  /* Activity rows */
  activityRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  activityTime: {
    fontSize: 11,
  },
  activityBody: {
    fontSize: 12,
    lineHeight: 18,
  },

  /* Summaries */
  summaryItem: {
    gap: 4,
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* Finalized */
  finalizedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  finalizedCheck: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "700",
  },
  finalizedText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
