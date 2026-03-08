import { useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { MobileTokens } from "@/constants/tokens";
import { useTheme } from "@/hooks/useTheme";
import type { MobileThread } from "@/types/sidebar";
import type { ThemeColors } from "@/constants/theme";

/* ==============================
   Helpers
============================== */

function formatRelativeTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return `${Math.floor(day / 7)}w`;
}

/* ==============================
   Thread Item (internal)
============================== */

function ThreadItem({
  thread,
  isActive,
  onPress,
  onLongPress,
  onPin,
  onDelete,
  colors,
}: {
  thread: MobileThread;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPin?: (threadId: number) => void;
  onDelete?: (threadId: number) => void;
  colors: ThemeColors;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <View style={styles.swipeActionsContainer}>
      {onPin && (
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            onPin(thread.id);
          }}
          style={styles.swipeActionPin}
        >
          <Text style={styles.swipeActionText}>
            {thread.pinned ? "해제" : "고정"}
          </Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            Alert.alert(
              "스레드 삭제",
              "이 스레드를 삭제하시겠습니까?",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: () => onDelete(thread.id),
                },
              ],
            );
          }}
          style={styles.swipeActionDelete}
        >
          <Text style={styles.swipeActionText}>삭제</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.threadItem,
          isActive && {
            backgroundColor: colors.sidebarActiveItem,
            borderLeftWidth: 2,
            borderLeftColor: "#8b5cf6",
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.threadRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.threadTitle,
              { color: colors.textSecondary },
            ]}
          >
            {thread.pinned ? "\uD83D\uDCCC " : ""}
            {thread.title || "New Chat"}
          </Text>
          <Text
            style={[
              styles.threadTime,
              { color: colors.threadTimeColor },
            ]}
          >
            {formatRelativeTime(thread.lastActiveAt ?? thread.createdAt)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

/* ==============================
   ThreadGroup
============================== */

export interface ThreadGroupProps {
  label: string;
  threads: MobileThread[];
  activeThreadId: number | null;
  onThreadPress: (threadId: number, projectId: string | null) => void;
  onThreadLongPress: (thread: MobileThread) => void;
  onPinThread?: (threadId: number) => void;
  onDeleteThread?: (threadId: number) => void;
}

export default function ThreadGroup({
  label,
  threads,
  activeThreadId,
  onThreadPress,
  onThreadLongPress,
  onPinThread,
  onDeleteThread,
}: ThreadGroupProps) {
  const { colors } = useTheme();

  if (threads.length === 0) return null;

  return (
    <View style={styles.groupContainer}>
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={activeThreadId === thread.id}
          onPress={() => onThreadPress(thread.id, thread.projectId)}
          onLongPress={() => onThreadLongPress(thread)}
          onPin={onPinThread}
          onDelete={onDeleteThread}
          colors={colors}
        />
      ))}
    </View>
  );
}

/* ==============================
   Grouping Logic
============================== */

export interface ThreadTimeGroup {
  label: string;
  threads: MobileThread[];
}

export function groupThreadsByTime(threads: MobileThread[]): ThreadTimeGroup[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const lastWeekStart = new Date(todayStart.getTime() - 7 * 86_400_000);

  const pinned = threads.filter((t) => t.pinned);
  const unpinned = threads.filter((t) => !t.pinned);

  const today: MobileThread[] = [];
  const yesterday: MobileThread[] = [];
  const lastWeek: MobileThread[] = [];
  const older: MobileThread[] = [];

  for (const t of unpinned) {
    const ts = new Date(t.lastActiveAt ?? t.createdAt).getTime();
    if (ts >= todayStart.getTime()) {
      today.push(t);
    } else if (ts >= yesterdayStart.getTime()) {
      yesterday.push(t);
    } else if (ts >= lastWeekStart.getTime()) {
      lastWeek.push(t);
    } else {
      older.push(t);
    }
  }

  const groups: ThreadTimeGroup[] = [];
  if (pinned.length) groups.push({ label: "\uACE0\uC815\uB428", threads: pinned });
  if (today.length) groups.push({ label: "\uC624\uB298", threads: today });
  if (yesterday.length) groups.push({ label: "\uC5B4\uC81C", threads: yesterday });
  if (lastWeek.length) groups.push({ label: "\uC9C0\uB09C \uC8FC", threads: lastWeek });
  if (older.length) groups.push({ label: "\uC774\uC804", threads: older });

  return groups;
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  threadItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
    height: 48,
    justifyContent: "center",
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  threadTime: {
    fontSize: 11,
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
  },
  swipeActionPin: {
    width: 64,
    height: 48,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionDelete: {
    width: 64,
    height: 48,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionText: {
    color: "#ffffff",
    fontSize: MobileTokens.font.sm,
    fontWeight: MobileTokens.weight.semibold,
  },
});
