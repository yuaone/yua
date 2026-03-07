import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileThread } from "@/types/sidebar";

type ProjectThreadListProps = {
  threads: MobileThread[];
  onPressThread: (threadId: number) => void;
};

export default function ProjectThreadList({ threads, onPressThread }: ProjectThreadListProps) {
  if (threads.length === 0) {
    return <Text style={styles.empty}>No threads in this project yet.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {threads.map((thread) => (
        <Pressable key={thread.id} style={styles.item} onPress={() => onPressThread(thread.id)}>
          <Text style={styles.title}>{thread.title}</Text>
          <Text style={styles.meta}>#{thread.id}</Text>
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
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
  },
  title: { color: "#0f172a", fontSize: 14, fontWeight: "600" },
  meta: { color: "#64748b", fontSize: 11, marginTop: 4 },
  empty: { color: "#64748b", fontSize: 13 },
});
