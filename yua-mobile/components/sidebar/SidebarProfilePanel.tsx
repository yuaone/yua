/**
 * SidebarProfilePanel — bottom-pinned profile area in the sidebar.
 *
 * Shows user avatar (initial), name, and plan.
 * Tap -> onSettingsPress, Long-press -> logout confirmation Alert.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";

interface SidebarProfilePanelProps {
  userName: string;
  email: string;
  plan: string;
  onSettingsPress: () => void;
  onLogoutPress: () => void;
}

function SidebarProfilePanelInner({
  userName,
  email,
  plan,
  onSettingsPress,
  onLogoutPress,
}: SidebarProfilePanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const initial = userName ? userName.charAt(0).toUpperCase() : "?";

  const handleLongPress = useCallback(() => {
    Alert.alert(
      "로그아웃",
      "정말 로그아웃 하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { text: "로그아웃", style: "destructive", onPress: onLogoutPress },
      ],
    );
  }, [onLogoutPress]);

  return (
    <Pressable
      onPress={onSettingsPress}
      onLongPress={handleLongPress}
      style={[
        styles.container,
        {
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, MobileTokens.space.sm),
        },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.buttonBg }]}>
        <Text style={[styles.avatarText, { color: colors.buttonText }]}>
          {initial}
        </Text>
      </View>

      {/* Name + Plan */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {userName}
        </Text>
        <Text
          style={[styles.plan, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {plan}
        </Text>
      </View>
    </Pressable>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.lg,
    paddingTop: MobileTokens.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: MobileTokens.weight.bold,
  },
  info: {
    flex: 1,
    marginLeft: MobileTokens.space.md,
  },
  name: {
    fontSize: MobileTokens.font.md,
    fontWeight: MobileTokens.weight.medium,
  },
  plan: {
    fontSize: MobileTokens.font.xs,
    marginTop: 1,
  },
});

export const SidebarProfilePanel = React.memo(SidebarProfilePanelInner);
