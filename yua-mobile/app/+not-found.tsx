/**
 * +not-found.tsx — Expo Router catch-all for unmatched routes.
 *
 * Shows a simple 404 screen with a button to go home.
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMain }]}>
      <Text style={[styles.code, { color: colors.textPrimary }]}>404</Text>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        페이지를 찾을 수 없습니다
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBg }]}
        onPress={() => router.replace("/")}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          홈으로 돌아가기
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.xl,
  },
  code: {
    fontSize: 48,
    fontWeight: "700",
    marginBottom: MobileTokens.space.md,
  },
  message: {
    fontSize: MobileTokens.font.body,
    marginBottom: MobileTokens.space.xxl,
    textAlign: "center",
  },
  button: {
    borderRadius: MobileTokens.radius.md,
    paddingVertical: MobileTokens.space.md,
    paddingHorizontal: MobileTokens.space.xxl,
    alignItems: "center",
    minWidth: 200,
  },
  buttonText: {
    fontSize: MobileTokens.font.md,
    fontWeight: "600",
  },
});
