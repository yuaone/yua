import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import type { MobileThread } from "@/types/sidebar";

type ProjectThreadListProps = {
  threads: MobileThread[];
  onPressThread: (threadId: number) => void;
};

export default function ProjectThreadList({ threads, onPressThread }: ProjectThreadListProps) {
  const { colors } = useTheme();

  if (threads.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {threads.map((thread) => {
        const dateStr = thread.createdAt
          ? new Date(thread.createdAt).toLocaleDateString()
          : "";

        return (
          <Pressable
            key={thread.id}
            style={({ pressed }) => [
              styles.item,
              { borderColor: colors.line, backgroundColor: colors.surfacePanel },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onPressThread(thread.id)}
          >
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {thread.pinned ? "\uD83D\uDCCC " : ""}
              {thread.title || "\uC0C8 \uCC44\uD305"}
            </Text>
            {dateStr ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {dateStr}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  title: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 4 },
});
