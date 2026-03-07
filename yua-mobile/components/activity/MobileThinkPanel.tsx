import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { ActivityItem } from "yua-shared/stream/activity";

import type { MobileOverlayChunk, MobileThinkingSummary } from "@/store/useMobileStreamSessionStore";

type MobileThinkPanelProps = {
  traceId?: string | null;
  profile?: string | null;
  stage?: string | null;
  activity: ActivityItem[];
  chunks: MobileOverlayChunk[];
  summaries: MobileThinkingSummary[];
  label?: string | null;
  startedAt?: number | null;
  finalizedAt?: number | null;
  finalized: boolean;
};

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function formatElapsed(startedAt?: number | null, finalizedAt?: number | null, finalized?: boolean) {
  if (!startedAt) return "0s";
  const end = finalized ? finalizedAt ?? Date.now() : Date.now();
  const sec = Math.max(0, Math.floor((end - startedAt) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export default function MobileThinkPanel({
  traceId,
  profile,
  stage,
  activity,
  chunks,
  summaries,
  label,
  startedAt,
  finalizedAt,
  finalized,
}: MobileThinkPanelProps) {
  const effectiveRows = useMemo(() => {
    if (chunks.length > 0) return chunks;

    return activity.map((item, index) => {
      const status = item.status as string | undefined;
      return {
        chunkId: item.id,
        index,
        at: item.at ?? Date.now(),
        source: "ACTIVITY" as const,
        title: item.title ?? item.kind,
        body: item.body ?? null,
        inline: item.inlineSummary ?? null,
        kind: item.kind,
        meta: (item.meta as Record<string, unknown> | undefined) ?? null,
        done: status === "OK" || status === "FAILED" || status === "CANCELLED",
      };
    });
  }, [activity, chunks]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label ?? "Think Panel"}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Profile: {profile ?? "NORMAL"}</Text>
        <Text style={styles.metaText}>Stage: {stage ?? "-"}</Text>
        <Text style={styles.metaText}>Elapsed: {formatElapsed(startedAt, finalizedAt, finalized)}</Text>
      </View>
      {traceId ? <Text style={styles.trace}>Trace: {traceId}</Text> : null}
      {summaries.length > 0 ? (
        <Text style={styles.summaryLine}>
          Summaries: {summaries.length} ({summaries.filter((s) => s.status === "DONE").length} done)
        </Text>
      ) : null}

      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>
        {effectiveRows.length === 0 ? (
          <Text style={styles.empty}>No activity yet.</Text>
        ) : (
          effectiveRows.map((item) => (
            <View key={item.chunkId} style={styles.row}>
              <Text style={styles.rowTitle}>{item.title ?? String(item.kind ?? "Activity")}</Text>
              <Text style={styles.rowSub}>
                {item.done ? "DONE" : "RUNNING"} {formatTime(item.at)}
              </Text>
              {item.inline ? <Text style={styles.rowBody}>{item.inline}</Text> : null}
              {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  metaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaText: { fontSize: 12, color: "#475569" },
  trace: { fontSize: 11, color: "#64748b" },
  summaryLine: { fontSize: 11, color: "#64748b" },
  timeline: { maxHeight: 360 },
  timelineContent: { gap: 8, paddingBottom: 8 },
  row: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  rowTitle: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  rowSub: { fontSize: 11, color: "#64748b" },
  rowBody: { fontSize: 12, color: "#334155", lineHeight: 18 },
  empty: { fontSize: 13, color: "#64748b" },
});
