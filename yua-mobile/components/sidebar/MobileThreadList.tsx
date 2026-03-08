import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import type { MobileThread } from "@/types/sidebar";

type MobileThreadListProps = {
  threads: MobileThread[];
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
};

export default function MobileThreadList({
  threads,
  activeThreadId,
  onSelectThread,
}: MobileThreadListProps) {
  const { colors } = useTheme();

  if (threads.length === 0) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>No threads</Text>;
  }

  return (
    <View style={styles.wrap}>
      {threads.map((thread) => (
        <Pressable
          key={thread.id}
          style={({ pressed }) => [
            styles.item,
            { borderColor: colors.line, backgroundColor: colors.surfacePanel },
            activeThreadId === thread.id && {
              borderColor: colors.textPrimary,
              backgroundColor: colors.wash,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelectThread(thread.id)}
        >
          <View style={styles.row}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
              {thread.title}
            </Text>
            {thread.pinned ? (
              <Text style={[styles.badge, { color: colors.linkColor, backgroundColor: colors.wash }]}>
                PIN
              </Text>
            ) : null}
          </View>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {thread.projectId ? `Project ${thread.projectId}` : "General"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: "600", flex: 1 },
  sub: { fontSize: 11, marginTop: 4 },
  badge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  empty: { fontSize: 13 },
});
