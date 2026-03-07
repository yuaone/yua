import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/constants/theme";

function UnderlineInput({
  value,
  onChangeText,
  placeholder,
  colors,
  maxLength,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ThemeColors;
  maxLength?: number;
}) {
  const borderProgress = useSharedValue(0);
  const borderStyle = useAnimatedStyle(() => ({
    borderBottomColor:
      borderProgress.value > 0.5
        ? colors.inputFocusBorder
        : colors.inputBorder,
  }));

  return (
    <Animated.View style={[styles.inputWrap, borderStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { color: colors.textHeading }]}
        maxLength={maxLength}
        onFocus={() => {
          borderProgress.value = withTiming(1, { duration: 200 });
        }}
        onBlur={() => {
          borderProgress.value = withTiming(0, { duration: 200 });
        }}
      />
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const { completeOnboarding, signOutUser, profile, ready, state } =
    useMobileAuth();

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(profile?.user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(name.trim()), [name]);
  const MAX_NAME = 255;

  useEffect(() => {
    if (!ready) return;
    if (state === "guest" || state === "error") {
      router.replace("/auth");
      return;
    }
    if (state === "authed") {
      router.replace("/(authed)/chat");
    }
  }, [ready, state]);

  const finish = async () => {
    if (!canSubmit) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (name.trim().length > MAX_NAME) {
      setError(`이름은 ${MAX_NAME}자 이내로 입력해 주세요.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({ name: name.trim() });
      router.replace("/(authed)/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ONBOARDING_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOutUser();
    router.replace("/auth");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.authBg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ─── Brand + heading ─── */}
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.textHeading }]}>YUA</Text>
            <Text style={[styles.heading, { color: colors.textHeading }]}>
              YUA가 부를 이름을
            </Text>
            <Text style={[styles.heading, { color: colors.textHeading }]}>
              설정해 주세요
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            이후 설정에서 언제든 변경할 수 있습니다.
          </Text>

          {/* ─── Name input ─── */}
          <View style={styles.fieldGroup}>
            <UnderlineInput
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              colors={colors}
              maxLength={MAX_NAME}
            />
          </View>

          {/* ─── Error ─── */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <Text style={[styles.error, { color: colors.errorColor }]}>{error}</Text>
            </Animated.View>
          )}

          {/* ─── Primary button ─── */}
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.buttonBg },
              (!canSubmit || loading) && styles.btnDisabled,
            ]}
            onPress={finish}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} size="small" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>
                다음
              </Text>
            )}
          </Pressable>

          {/* ─── Logout ─── */}
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.secondaryBtnBorder }]}
            onPress={logout}
            disabled={loading}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textHeading }]}>
              로그아웃
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6,
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 32,
  },

  fieldGroup: {
    gap: 4,
    marginBottom: 24,
  },
  inputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  input: {
    height: 48,
    fontSize: 15,
    paddingHorizontal: 2,
  },

  error: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },

  primaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.4,
  },

  secondaryBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
