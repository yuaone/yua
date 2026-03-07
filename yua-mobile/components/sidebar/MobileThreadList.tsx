import { Pressable, StyleSheet, Text, View } from "react-native";

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
  if (threads.length === 0) {
    return <Text style={styles.empty}>No threads</Text>;
  }

  return (
    <View style={styles.wrap}>
      {threads.map((thread) => (
        <Pressable
          key={thread.id}
          style={[styles.item, activeThreadId === thread.id ? styles.itemActive : null]}
          onPress={() => onSelectThread(thread.id)}
        >
          <View style={styles.row}>
            <Text numberOfLines={1} style={styles.title}>
              {thread.title}
            </Text>
            {thread.pinned ? <Text style={styles.badge}>PIN</Text> : null}
          </View>
          <Text style={styles.sub}>{thread.projectId ? `Project ${thread.projectId}` : "General"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  itemActive: {
    borderColor: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { color: "#0f172a", fontSize: 14, fontWeight: "600", flex: 1 },
  sub: { color: "#64748b", fontSize: 11, marginTop: 4 },
  badge: {
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  empty: { color: "#64748b", fontSize: 13 },
});
