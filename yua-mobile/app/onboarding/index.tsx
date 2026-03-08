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
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import type { ThemeColors } from "@/constants/theme";

/* ─── Preference chips data ─── */
const PREFERENCE_OPTIONS = [
  { id: "dev", emoji: "\uD83D\uDCBB", label: "\uAC1C\uBC1C" },
  { id: "data", emoji: "\uD83D\uDCCA", label: "\uB370\uC774\uD130" },
  { id: "writing", emoji: "\uD83D\uDCDD", label: "\uAE00\uC4F0\uAE30" },
  { id: "design", emoji: "\uD83C\uDFA8", label: "\uB514\uC790\uC778" },
  { id: "learning", emoji: "\uD83D\uDCDA", label: "\uD559\uC2B5" },
  { id: "work", emoji: "\uD83D\uDCBC", label: "\uC5C5\uBB34" },
  { id: "research", emoji: "\uD83D\uDD2C", label: "\uC5F0\uAD6C" },
  { id: "general", emoji: "\uD83D\uDCA1", label: "\uC77C\uBC18" },
] as const;

/* ─── Step indicator dots ─── */
function StepDots({
  current,
  total,
  colors,
}: {
  current: number;
  total: number;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i === current ? colors.buttonBg : colors.wash,
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ─── Animated text input with underline focus ─── */
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
        autoFocus
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

/* ─── Preference chip ─── */
function PreferenceChip({
  emoji,
  label,
  selected,
  onPress,
  colors,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.buttonBg : colors.line,
          backgroundColor: selected ? colors.buttonBg : "transparent",
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? colors.buttonText : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Main onboarding screen ─── */
export default function OnboardingScreen() {
  const { completeOnboarding, profile, ready, state } =
    useMobileAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.user?.name ?? "");
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const MAX_NAME = 255;
  const canContinueStep0 = useMemo(() => Boolean(name.trim()), [name]);

  /* ─── Auth guard ─── */
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

  /* ─── Toggle preference ─── */
  const togglePref = (id: string) => {
    setSelectedPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  /* ─── Navigate steps ─── */
  const goNext = () => {
    if (step === 0) {
      if (name.trim().length > MAX_NAME) {
        setError(`\uC774\uB984\uC740 ${MAX_NAME}\uC790 \uC774\uB0B4\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
        return;
      }
      setError(null);
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const skip = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    }
  };

  /* ─── Final submit ─── */
  const finish = async () => {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({ name: name.trim() || undefined });
      router.replace("/(authed)/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ONBOARDING_FAILED");
      setLoading(false);
    }
  };

  const displayName = name.trim() || "\uC0AC\uC6A9\uC790";

  /* ─── Step 1: Welcome + Name ─── */
  const renderStep0 = () => (
    <Animated.View
      key="step0"
      entering={SlideInRight.duration(MobileTokens.timing.normal)}
      exiting={SlideOutLeft.duration(MobileTokens.timing.normal)}
      style={styles.stepContainer}
    >
      <Text style={[styles.brand, { color: colors.textHeading }]}>YUA</Text>

      <Text style={[styles.heading, { color: colors.textHeading }]}>
        {"\uBC18\uAC11\uC2B5\uB2C8\uB2E4! \uD83D\uDC4B"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        YUA{"\uAC00 \uB2F9\uC2E0\uC744 \uBB50\uB77C\uACE0 \uBD80\uB97C\uAE4C\uC694?"}
      </Text>

      <View style={styles.fieldGroup}>
        <UnderlineInput
          value={name}
          onChangeText={setName}
          placeholder={"\uC774\uB984 \uB610\uB294 \uB2C9\uB124\uC784"}
          colors={colors}
          maxLength={MAX_NAME}
        />
      </View>

      {error && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <Text style={[styles.error, { color: colors.errorColor }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      <Pressable
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.buttonBg },
          !canContinueStep0 && styles.btnDisabled,
        ]}
        onPress={goNext}
        disabled={!canContinueStep0}
      >
        <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>
          {"\uACC4\uC18D\uD558\uAE30"}
        </Text>
      </Pressable>

      <Pressable style={styles.skipBtn} onPress={skip}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>
          {"\uAC74\uB108\uB6F0\uAE30"}
        </Text>
      </Pressable>
    </Animated.View>
  );

  /* ─── Step 2: Preferences ─── */
  const renderStep1 = () => (
    <Animated.View
      key="step1"
      entering={SlideInRight.duration(MobileTokens.timing.normal)}
      exiting={SlideOutLeft.duration(MobileTokens.timing.normal)}
      style={styles.stepContainer}
    >
      <Text style={[styles.heading, { color: colors.textHeading }]}>
        {"\uC5B4\uB5BB\uAC8C \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {"\uAD00\uC2EC \uBD84\uC57C\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694"}
      </Text>

      <View style={styles.chipGrid}>
        {PREFERENCE_OPTIONS.map((opt) => (
          <PreferenceChip
            key={opt.id}
            emoji={opt.emoji}
            label={opt.label}
            selected={selectedPrefs.includes(opt.id)}
            onPress={() => togglePref(opt.id)}
            colors={colors}
          />
        ))}
      </View>

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: colors.buttonBg }]}
        onPress={goNext}
      >
        <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>
          {"\uACC4\uC18D\uD558\uAE30"}
        </Text>
      </Pressable>

      <Pressable style={styles.skipBtn} onPress={skip}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>
          {"\uAC74\uB108\uB6F0\uAE30"}
        </Text>
      </Pressable>
    </Animated.View>
  );

  /* ─── Step 3: Complete ─── */
  const renderStep2 = () => (
    <Animated.View
      key="step2"
      entering={FadeIn.duration(MobileTokens.timing.slow)}
      style={styles.stepContainer}
    >
      <Text style={styles.completeEmoji}>{"\u2728"}</Text>

      <Text style={[styles.heading, { color: colors.textHeading }]}>
        {"\uC900\uBE44\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!"}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {displayName}
        {"\uB2D8, YUA\uC640 \uD568\uAED8"}
        {"\n"}
        {"\uBA4B\uC9C4 \uB300\uD654\uB97C \uC2DC\uC791\uD574\uBCF4\uC138\uC694."}
      </Text>

      {error && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <Text style={[styles.error, { color: colors.errorColor }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      <Pressable
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.buttonBg },
          loading && styles.btnDisabled,
        ]}
        onPress={finish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.buttonText} size="small" />
        ) : (
          <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>
            {"\uB300\uD654 \uC2DC\uC791\uD558\uAE30"}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );

  const steps = [renderStep0, renderStep1, renderStep2];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.authBg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + MobileTokens.space.xxl,
            paddingBottom: insets.bottom + MobileTokens.space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <StepDots current={step} total={3} colors={colors} />
          {steps[step]()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: MobileTokens.space.xxl,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  /* Step dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: MobileTokens.space.sm,
    marginBottom: MobileTokens.space.xxxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* Step container */
  stepContainer: {
    alignItems: "center",
  },

  /* Brand */
  brand: {
    fontSize: MobileTokens.font.xxl,
    fontWeight: "800",
    letterSpacing: 6,
    marginBottom: MobileTokens.space.xl,
  },

  /* Heading */
  heading: {
    fontSize: MobileTokens.font.xl,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: MobileTokens.space.sm,
  },

  /* Subtitle */
  subtitle: {
    fontSize: MobileTokens.font.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: MobileTokens.space.xxl,
  },

  /* Input */
  fieldGroup: {
    width: "100%",
    marginBottom: MobileTokens.space.xl,
  },
  inputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  input: {
    height: MobileTokens.touch.comfortable,
    fontSize: MobileTokens.font.md,
    paddingHorizontal: 2,
    textAlign: "center",
  },

  /* Error */
  error: {
    fontSize: MobileTokens.font.sm,
    fontWeight: "600",
    marginBottom: MobileTokens.space.md,
    textAlign: "center",
  },

  /* Primary button */
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: MobileTokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: MobileTokens.font.md,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.4,
  },

  /* Skip */
  skipBtn: {
    marginTop: MobileTokens.space.lg,
    paddingVertical: MobileTokens.space.sm,
  },
  skipText: {
    fontSize: MobileTokens.font.md,
    textAlign: "center",
  },

  /* Preference chips */
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: MobileTokens.space.md,
    width: "100%",
    marginBottom: MobileTokens.space.xxl,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: MobileTokens.space.lg,
    borderRadius: MobileTokens.radius.chip,
    borderWidth: 1,
    gap: MobileTokens.space.sm,
    width: "47%",
    justifyContent: "center",
  },
  chipEmoji: {
    fontSize: MobileTokens.font.body,
  },
  chipLabel: {
    fontSize: MobileTokens.font.md,
    fontWeight: "600",
  },

  /* Complete step */
  completeEmoji: {
    fontSize: 48,
    marginBottom: MobileTokens.space.xl,
  },
});
