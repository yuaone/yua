import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useMobileSettingsStore } from "@/store/useMobileSettingsStore";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import {
  getMobileThinkingProfile,
  setMobileThinkingProfile,
} from "@/lib/thinkingProfileMobile";
import MobileWorkspaceList from "./MobileWorkspaceList";

/* ==============================
   Constants
============================== */

const THINKING_OPTIONS: { label: string; value: ThinkingProfile }[] = [
  { label: "FAST", value: "FAST" },
  { label: "NORMAL", value: "NORMAL" },
  { label: "DEEP", value: "DEEP" },
];

/* ==============================
   Component
============================== */

export default function MobileSettingsModal() {
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const { visible, closeSettings } = useMobileSettingsStore();
  const { profile, signOutUser } = useMobileAuth();

  const [thinkingProfile, setThinkingProfileState] =
    useState<ThinkingProfile>("NORMAL");
  const [showWorkspaces, setShowWorkspaces] = useState(false);

  // Load thinking profile on mount
  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    getMobileThinkingProfile().then((p) => {
      if (mounted) setThinkingProfileState(p);
    });
    return () => {
      mounted = false;
    };
  }, [visible]);

  // Reset sub-views when modal closes
  useEffect(() => {
    if (!visible) {
      setShowWorkspaces(false);
    }
  }, [visible]);

  const handleThinkingChange = useCallback((next: ThinkingProfile) => {
    setThinkingProfileState(next);
    void setMobileThinkingProfile(next);
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "로그아웃",
      "정말 로그아웃하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear stores
              useMobileChatStore.getState().reset();
              useMobileSidebarStore.getState().resetSidebar();
              await signOutUser();
              closeSettings();
              router.replace("/auth" as any);
            } catch {
              Alert.alert("오류", "로그아웃에 실패했습니다.");
            }
          },
        },
      ]
    );
  }, [signOutUser, closeSettings]);

  const handleClose = useCallback(() => {
    if (showWorkspaces) {
      setShowWorkspaces(false);
      return;
    }
    closeSettings();
  }, [showWorkspaces, closeSettings]);

  // Extract profile info
  const userName = profile?.user?.name ?? "User";
  const userEmail = profile?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const currentWorkspaceName = profile?.workspace?.name ?? "Personal";
  const hasMultipleWorkspaces = (profile?.workspaces?.length ?? 0) > 1;

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "1.0.0";

  // Colors
  const bg = dark ? "#111111" : "#ffffff";
  const sectionHeaderColor = dark ? "#6b7280" : "#9ca3af";
  const lineColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textPrimary = dark ? "#f5f5f5" : "#111111";
  const textSecondary = dark ? "#d1d5db" : "#374151";
  const textMuted = dark ? "#6b7280" : "#9ca3af";
  const washBg = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const segmentBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const segmentActiveBg = dark ? "#1e1e1e" : "#ffffff";

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: bg, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: lineColor }]}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {showWorkspaces ? "워크스페이스" : "설정"}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <Text style={[styles.closeIcon, { color: textMuted }]}>✕</Text>
          </Pressable>
        </View>

        {showWorkspaces ? (
          /* ---- Workspace List View ---- */
          <MobileWorkspaceList onClose={() => setShowWorkspaces(false)} />
        ) : (
          /* ---- Main Settings View ---- */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ---- Profile Section ---- */}
            <Text style={[styles.sectionHeader, { color: sectionHeaderColor }]}>
              프로필
            </Text>
            <View style={[styles.profileCard, { backgroundColor: washBg }]}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: segmentBg },
                ]}
              >
                <Text style={[styles.avatarText, { color: textPrimary }]}>
                  {initials}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text
                  style={[styles.profileName, { color: textPrimary }]}
                  numberOfLines={1}
                >
                  {userName}
                </Text>
                {userEmail ? (
                  <Text
                    style={[styles.profileEmail, { color: textMuted }]}
                    numberOfLines={1}
                  >
                    {userEmail}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: lineColor }]} />

            {/* ---- Preferences Section ---- */}
            <Text style={[styles.sectionHeader, { color: sectionHeaderColor }]}>
              환경설정
            </Text>

            {/* Thinking Profile */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: textSecondary }]}>
                사고 모드
              </Text>
              <View
                style={[
                  styles.segmentedControl,
                  { backgroundColor: segmentBg },
                ]}
              >
                {THINKING_OPTIONS.map((opt) => {
                  const isActive = thinkingProfile === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleThinkingChange(opt.value)}
                      style={[
                        styles.segment,
                        isActive && [
                          styles.segmentActive,
                          {
                            backgroundColor: segmentActiveBg,
                          },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isActive ? textPrimary : textMuted },
                          isActive && styles.segmentTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: lineColor }]} />

            {/* ---- Workspace Section ---- */}
            {hasMultipleWorkspaces ? (
              <>
                <Text
                  style={[styles.sectionHeader, { color: sectionHeaderColor }]}
                >
                  워크스페이스
                </Text>
                <View style={styles.settingRow}>
                  <Text
                    style={[styles.settingLabel, { color: textSecondary }]}
                    numberOfLines={1}
                  >
                    {currentWorkspaceName}
                  </Text>
                  <Pressable
                    onPress={() => setShowWorkspaces(true)}
                    style={({ pressed }) => [
                      styles.switchBtn,
                      {
                        backgroundColor: segmentBg,
                        borderColor: lineColor,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.switchBtnText,
                        { color: textSecondary },
                      ]}
                    >
                      전환
                    </Text>
                  </Pressable>
                </View>
                <View
                  style={[styles.separator, { backgroundColor: lineColor }]}
                />
              </>
            ) : null}

            {/* ---- App Info Section ---- */}
            <Text style={[styles.sectionHeader, { color: sectionHeaderColor }]}>
              앱 정보
            </Text>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: textSecondary }]}>
                버전
              </Text>
              <Text style={[styles.settingValue, { color: textMuted }]}>
                {appVersion}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => {
                closeSettings();
                router.push("/legal/terms" as any);
              }}
            >
              <Text style={[styles.settingLabel, { color: textSecondary }]}>
                이용약관
              </Text>
              <Text style={[styles.chevron, { color: textMuted }]}>›</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => {
                closeSettings();
                router.push("/legal/privacy" as any);
              }}
            >
              <Text style={[styles.settingLabel, { color: textSecondary }]}>
                개인정보처리방침
              </Text>
              <Text style={[styles.chevron, { color: textMuted }]}>›</Text>
            </Pressable>

            <View style={[styles.separator, { backgroundColor: lineColor }]} />

            {/* ---- Danger Zone ---- */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: "400",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Section headers */
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },

  /* Profile */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 13,
  },

  /* Separator */
  separator: {
    height: 1,
    marginVertical: 16,
  },

  /* Setting rows */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: 0,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
    fontWeight: "300",
  },

  /* Segmented control */
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentTextActive: {
    fontWeight: "700",
  },

  /* Workspace switch */
  switchBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* Logout */
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
});
