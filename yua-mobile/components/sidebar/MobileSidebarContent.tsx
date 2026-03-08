import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import { useMobileSidebarData } from "@/hooks/useMobileSidebarData";
import { useMobileSettingsStore } from "@/store/useMobileSettingsStore";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import type { MobileThread } from "@/types/sidebar";
import ThreadGroup, { groupThreadsByTime } from "@/components/sidebar/ThreadGroup";
import SidebarSearchBar from "@/components/sidebar/SidebarSearchBar";
import MobileProjectSection from "@/components/sidebar/MobileProjectSection";

/* ==============================
   Plan label helper
============================== */
const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

/* ==============================
   Main Component
============================== */

export default function MobileSidebarContent() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { closeSidebar } = useSidebar();
  const { profile } = useMobileAuth();

  const userName = profile?.user?.name ?? "Account";
  const planLabel = PLAN_LABELS[profile?.workspace?.plan ?? "free"] ?? "Free";

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

  const generalThreads = useMemo(
    () => threads.filter((t) => !t.projectId),
    [threads]
  );

  const threadGroups = useMemo(() => groupThreadsByTime(generalThreads), [generalThreads]);

  const handleSelectThread = useCallback(
    (threadId: number, projectId: string | null) => {
      setActiveContext(projectId, threadId);
      touchThread(threadId);
      closeSidebar();
      router.replace(`/(authed)/chat/${threadId}` as any);
    },
    [setActiveContext, touchThread, closeSidebar]
  );

  const handleNewChat = useCallback(async () => {
    closeSidebar();
    router.replace("/(authed)/chat" as any);
  }, [closeSidebar]);

  const handleLongPress = useCallback(
    (thread: MobileThread) => {
      const actions: { text: string; onPress: () => void; style?: string }[] = [
        {
          text: thread.pinned ? "Unpin" : "Pin",
          onPress: () => togglePin(thread.id),
        },
        {
          text: "Rename",
          onPress: () => {
            if (Platform.OS === "ios") {
              Alert.prompt(
                "Rename Thread",
                "Enter a new name:",
                (text: string) => {
                  if (text?.trim()) renameThread(thread.id, text.trim());
                },
                "plain-text",
                thread.title
              );
            } else {
              const { startEditingThread } = useMobileSidebarStore.getState();
              startEditingThread(thread.id);
            }
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

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return threadGroups;
    const q = searchQuery.toLowerCase();
    const filtered = threads.filter(
      (t) => t.title && t.title.toLowerCase().includes(q)
    );
    return groupThreadsByTime(filtered);
  }, [threadGroups, threads, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebarBg, paddingTop: insets.top }]}>
      {/* ── Header: Logo ── */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <LinearGradient
            colors={["#3b82f6", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Text style={styles.logoBadgeText}>Y</Text>
          </LinearGradient>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>
            YUA
          </Text>
        </View>
      </View>

      {/* ── New Chat ── */}
      <View style={styles.newChatWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.newChatBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
            pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleNewChat}
        >
          <Text style={[styles.newChatText, { color: colors.textPrimary }]}>
            + New Chat
          </Text>
        </Pressable>
      </View>

      {/* ── Search ── */}
      <SidebarSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="대화 검색..."
      />

      {/* ── Projects (hidden during search) ── */}
      {!isSearching && (
        <MobileProjectSection
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
        />
      )}

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: colors.line }]} />

      {/* ── Thread List ── */}
      {filteredGroups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            아직 대화가 없습니다
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                borderColor: colors.line,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleNewChat}
          >
            <Text style={[styles.emptyBtnText, { color: colors.textPrimary }]}>
              새 채팅 시작
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical
          keyboardShouldPersistTaps="handled"
        >
          {filteredGroups.map((group) => (
            <ThreadGroup
              key={group.label}
              label={group.label}
              threads={group.threads}
              activeThreadId={activeThreadId}
              onThreadPress={handleSelectThread}
              onThreadLongPress={handleLongPress}
              onPinThread={(threadId) => togglePin(threadId)}
              onDeleteThread={(threadId) => deleteThread(threadId)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Footer: User Profile (Desktop-style) ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.profileBtn,
            {
              backgroundColor: isDark ? colors.surfacePanel : "rgba(255,255,255,0.8)",
              borderColor: colors.line,
            },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSettings}
        >
          <View style={styles.profileRow}>
            {/* Avatar */}
            <LinearGradient
              colors={isDark ? ["#6b7280", "#4b5563"] : ["#374151", "#111827"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>

            {/* Name + Plan */}
            <View style={styles.profileInfo}>
              <Text
                numberOfLines={1}
                style={[styles.profileName, { color: colors.textPrimary }]}
              >
                {userName}
              </Text>
              <Text style={[styles.profilePlan, { color: colors.textMuted }]}>
                {planLabel}
              </Text>
            </View>

            {/* Chevron */}
            <Text style={[styles.chevron, { color: colors.textMuted }]}>
              {"\u2195"}
            </Text>
          </View>
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

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  logoText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  /* New Chat */
  newChatWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  newChatBtn: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatText: {
    fontSize: 14,
    fontWeight: "600",
  },

  /* Divider */
  divider: {
    height: 1,
    marginHorizontal: 12,
    marginBottom: 4,
  },

  /* Thread list */
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  /* Empty */
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

  /* Footer */
  footer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  profileBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  profileName: {
    fontSize: 13,
    fontWeight: "600",
  },
  profilePlan: {
    fontSize: 11,
    marginTop: 1,
  },
  chevron: {
    fontSize: 14,
    marginLeft: 8,
  },
});
