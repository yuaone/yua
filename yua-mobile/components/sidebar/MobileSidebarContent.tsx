import { useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import { useMobileSidebarData } from "@/hooks/useMobileSidebarData";
import { useMobileSettingsStore } from "@/store/useMobileSettingsStore";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useTheme } from "@/hooks/useTheme";
import type { MobileThread } from "@/types/sidebar";

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
   Thread Item
============================== */

function ThreadItem({
  thread,
  isActive,
  onPress,
  onLongPress,
  colors,
}: {
  thread: MobileThread;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: import("@/constants/theme").ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.threadItem,
        isActive && {
          backgroundColor: colors.sidebarActiveItem,
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
  );
}

/* ==============================
   Main Component
============================== */

export default function MobileSidebarContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { closeSidebar } = useSidebar();

  const {
    threads,
    activeThreadId,
    setActiveContext,
    touchThread,
  } = useMobileSidebarStore();

  const {
    renameThread,
    togglePin,
    deleteThread,
  } = useMobileSidebarData();

  // Sort: pinned first, then by lastActiveAt desc
  const sortedThreads = useMemo(() => {
    const pinned = threads.filter((t) => t.pinned);
    const normal = threads.filter((t) => !t.pinned);
    return [...pinned, ...normal];
  }, [threads]);

  const handleSelectThread = useCallback(
    (threadId: number) => {
      const t = threads.find((x) => x.id === threadId);
      setActiveContext(t?.projectId ?? null, threadId);
      touchThread(threadId);
      closeSidebar();
      router.push(`/(authed)/chat/${threadId}` as any);
    },
    [threads, setActiveContext, touchThread, closeSidebar]
  );

  const handleNewChat = useCallback(async () => {
    closeSidebar();
    router.push("/(authed)/chat" as any);
  }, [closeSidebar]);

  const handleLongPress = useCallback(
    (thread: MobileThread) => {
      // Use Alert for context menu (simple, cross-platform)
      const actions: { text: string; onPress: () => void; style?: string }[] = [
        {
          text: thread.pinned ? "Unpin" : "Pin",
          onPress: () => togglePin(thread.id),
        },
        {
          text: "Rename",
          onPress: () => {
            Alert.prompt(
              "Rename Thread",
              "Enter a new name:",
              (text: string) => {
                if (text?.trim()) renameThread(thread.id, text.trim());
              },
              "plain-text",
              thread.title
            );
          },
        },
        {
          text: "Delete",
          onPress: () => {
            Alert.alert(
              "Delete Thread",
              `"${thread.title}" will be permanently deleted.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteThread(thread.id),
                },
              ]
            );
          },
          style: "destructive",
        },
        { text: "Cancel", onPress: () => {}, style: "cancel" },
      ];
      Alert.alert(thread.title || "Thread", undefined, actions);
    },
    [togglePin, renameThread, deleteThread]
  );

  const { openSettings } = useMobileSettingsStore();

  const handleSettings = useCallback(() => {
    closeSidebar();
    openSettings();
  }, [closeSidebar, openSettings]);

  const renderItem = useCallback(
    ({ item }: { item: MobileThread }) => (
      <ThreadItem
        thread={item}
        isActive={activeThreadId === item.id}
        onPress={() => handleSelectThread(item.id)}
        onLongPress={() => handleLongPress(item)}
        colors={colors}
      />
    ),
    [activeThreadId, handleSelectThread, handleLongPress, colors]
  );

  const keyExtractor = useCallback(
    (item: MobileThread) => String(item.id),
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebarBg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          YUA
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.newChatBtn,
            {
              backgroundColor: colors.sidebarNewChatBg,
              borderColor: colors.line,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleNewChat}
        >
          <Text
            style={[
              styles.newChatText,
              { color: colors.textPrimary },
            ]}
          >
            + \uC0C8 \uCC44\uD305
          </Text>
        </Pressable>
      </View>

      {/* Thread List */}
      {sortedThreads.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.textSecondary },
            ]}
          >
            \uC544\uC9C1 \uB300\uD654\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyBtn,
              {
                backgroundColor: colors.sidebarNewChatBg,
                borderColor: colors.line,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleNewChat}
          >
            <Text
              style={[
                styles.emptyBtnText,
                { color: colors.textPrimary },
              ]}
            >
              \uC0C8 \uCC44\uD305 \uC2DC\uC791
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sortedThreads}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.line,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleSettings}
        >
          <Text style={[styles.settingsIcon, { color: colors.textMuted }]}>
            \u2699
          </Text>
          <Text style={[styles.settingsText, { color: colors.textMuted }]}>
            \uC124\uC815
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  newChatBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  threadItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
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
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  settingsIcon: {
    fontSize: 18,
  },
  settingsText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
