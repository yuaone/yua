import { StyleSheet, Text, View } from "react-native";

import type { MobileOverlayChunk, MobileThinkingSummary } from "@/store/useMobileStreamSessionStore";

type MobileActivityPanelProps = {
  streamStateLabel: string;
  tokenChars: number;
  chunks: MobileOverlayChunk[];
  summaries: MobileThinkingSummary[];
};

export default function MobileActivityPanel({
  streamStateLabel,
  tokenChars,
  chunks,
  summaries,
}: MobileActivityPanelProps) {
  const doneCount = summaries.filter((entry) => entry.status === "DONE").length;
  const runningCount = summaries.filter((entry) => entry.status === "ACTIVE").length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.item}>Stream: {streamStateLabel}</Text>
      <Text style={styles.item}>Token chars: {tokenChars}</Text>
      <Text style={styles.item}>Timeline chunks: {chunks.length}</Text>
      <Text style={styles.item}>Reasoning: {doneCount} done / {runningCount} active</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  item: { fontSize: 14, color: "#334155" },
});
