import { useCallback, useEffect, useMemo, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeColors } from "@/constants/theme";

type Mode = "login" | "signup";

/* --- animated underline input --- */
function UnderlineInput({
  value,
  onChangeText,
  placeholder,
  colors,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  maxLength,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ThemeColors;
  secureTextEntry?: boolean;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
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
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
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

export default function AuthScreen() {
  const {
    loginWithEmail,
    signupWithEmail,
    signInWithGoogleToken,
    isFirebaseReady,
    ready,
    state,
  } = useMobileAuth();

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthY, setBirthY] = useState("");
  const [birthM, setBirthM] = useState("");
  const [birthD, setBirthD] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // @react-native-google-signin/google-signin (네이티브 — Dev Build 필요)
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const MAX_EMAIL = 255;
  const MAX_NAME = 255;
  const MAX_PHONE = 30;
  const MAX_PASSWORD = 128;

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === "login") return true;
    return Boolean(
      name.trim() && phone.trim() && birthY.trim() && birthM.trim() && birthD.trim()
    );
  }, [birthD, birthM, birthY, email, mode, name, password, phone]);

  useEffect(() => {
    if (!ready) return;
    if (state === "authed") {
      router.replace("/(authed)/chat");
      return;
    }
    if (state === "onboarding_required") {
      router.replace("/onboarding");
    }
  }, [ready, state]);

  useEffect(() => {
    if (!params.mode) return;
    if (params.mode === "signup") setMode("signup");
    if (params.mode === "login") setMode("login");
  }, [params.mode]);

  const mapAuthError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("auth/email-already-in-use"))
      return "이미 사용 중인 이메일입니다.";
    if (message.includes("auth/invalid-email"))
      return "이메일 형식이 올바르지 않습니다.";
    if (message.includes("auth/user-not-found"))
      return "계정 정보가 없습니다.";
    if (message.includes("auth/wrong-password"))
      return "비밀번호가 올바르지 않습니다.";
    if (message.includes("auth/too-many-requests"))
      return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
    if (message.includes("ME_SYNC_FAILED:404"))
      return "계정 정보가 없습니다.";
    if (message.includes("ME_PROFILE_SAVE_FAILED"))
      return "회원정보 저장에 실패했습니다.";
    if (message.includes("FIREBASE_NOT_CONFIGURED"))
      return "Firebase 설정이 필요합니다.";
    if (message.includes("GOOGLE_TOKEN_MISSING"))
      return "Google 토큰이 누락되었습니다.";
    if (message.includes("ME_SYNC_TIMEOUT"))
      return "서버 응답 시간 초과. 네트워크를 확인해 주세요.";
    return "인증에 실패했습니다. 입력 정보를 확인해 주세요.";
  }, []);

  const pad2 = (value: string) => value.padStart(2, "0");

  const submit = async () => {
    if (!canSubmit) {
      setError("필수 입력값을 확인해 주세요.");
      return;
    }

    if (email.trim().length > MAX_EMAIL) {
      setError(`이메일은 ${MAX_EMAIL}자 이내로 입력해 주세요.`);
      return;
    }
    if (password.trim().length > MAX_PASSWORD) {
      setError(`비밀번호는 ${MAX_PASSWORD}자 이내로 입력해 주세요.`);
      return;
    }

    if (mode === "signup" && !/^\d{4}$/.test(birthY.trim())) {
      setError("생년은 YYYY 형식으로 입력해 주세요.");
      return;
    }
    if (
      mode === "signup" &&
      (!/^\d{1,2}$/.test(birthM.trim()) || !/^\d{1,2}$/.test(birthD.trim()))
    ) {
      setError("생월/생일은 숫자로 입력해 주세요.");
      return;
    }
    if (mode === "signup") {
      if (name.trim().length > MAX_NAME) {
        setError(`이름은 ${MAX_NAME}자 이내로 입력해 주세요.`);
        return;
      }
      if (phone.trim().length > MAX_PHONE) {
        setError(`전화번호는 ${MAX_PHONE}자 이내로 입력해 주세요.`);
        return;
      }
      const month = Number(birthM.trim());
      const day = Number(birthD.trim());
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        setError("생년월일 값을 확인해 주세요.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
        router.replace("/(authed)/chat");
      } else {
        await signupWithEmail({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          birth: `${birthY.trim()}-${pad2(birthM.trim())}-${pad2(birthD.trim())}`,
          provider: "email",
        });
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const startGoogle = async () => {
    if (loading || googleLoading) return;
    if (!isFirebaseReady) {
      setError("Firebase 설정이 필요합니다.");
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken =
        (result as any)?.data?.idToken ??
        (result as any)?.idToken ??
        null;
      if (!idToken) {
        throw new Error("GOOGLE_TOKEN_MISSING");
      }
      await signInWithGoogleToken(idToken);
      // Navigation is also handled by useEffect [ready, state] → authed → chat
      // But explicit navigate for faster UX
      router.replace("/(authed)/chat");
    } catch (err: any) {
      // Don't show error if user cancelled Google sign-in
      if (err?.code === "SIGN_IN_CANCELLED" || err?.code === "12501") return;
      setError(mapAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const disabledAll = !isFirebaseReady || loading || googleLoading;

  const isLogin = mode === "login";

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
          {/* Brand */}
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.textHeading }]}>YUA</Text>
            <Text style={[styles.heading, { color: colors.textHeading }]}>
              {isLogin ? "YUA와 함께" : "계정을 만들어보세요"}
            </Text>
            {isLogin && (
              <Text style={[styles.heading, { color: colors.textHeading }]}>
                대화를 나눠보세요
              </Text>
            )}
          </View>

          {!isFirebaseReady && (
            <View style={styles.warnBox}>
              <Text style={styles.warnText}>
                Firebase env is missing. Set EXPO_PUBLIC_FIREBASE_* first.
              </Text>
            </View>
          )}

          {/* Login: Google primary */}
          {isLogin && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Pressable
                style={[
                  styles.googleBtn,
                  { backgroundColor: colors.buttonBg },
                  disabledAll && styles.btnDisabled,
                ]}
                onPress={startGoogle}
                disabled={disabledAll}
              >
                {googleLoading ? (
                  <ActivityIndicator color={colors.buttonText} size="small" />
                ) : (
                  <>
                    <View
                      style={[
                        styles.googleIcon,
                        { backgroundColor: colors.googleIconBg },
                      ]}
                    >
                      <Ionicons
                        name="logo-google"
                        size={18}
                        color={colors.googleIconColor}
                      />
                    </View>
                    <Text style={[styles.googleText, { color: colors.buttonText }]}>
                      Google로 시작하기
                    </Text>
                  </>
                )}
              </Pressable>

              {/* divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                <Text style={[styles.dividerText, { color: colors.dividerText }]}>
                  또는
                </Text>
                <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              </View>
            </Animated.View>
          )}

          {/* Signup extra fields */}
          {!isLogin && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.fieldGroup}>
              <UnderlineInput
                value={name}
                onChangeText={setName}
                placeholder="이름"
                colors={colors}
                maxLength={MAX_NAME}
              />
              <UnderlineInput
                value={phone}
                onChangeText={setPhone}
                placeholder="전화번호"
                colors={colors}
                keyboardType="phone-pad"
                maxLength={MAX_PHONE}
              />
              <View style={styles.birthRow}>
                <View style={{ flex: 1.4 }}>
                  <UnderlineInput
                    value={birthY}
                    onChangeText={setBirthY}
                    placeholder="YYYY"
                    colors={colors}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <UnderlineInput
                    value={birthM}
                    onChangeText={setBirthM}
                    placeholder="MM"
                    colors={colors}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <UnderlineInput
                    value={birthD}
                    onChangeText={setBirthD}
                    placeholder="DD"
                    colors={colors}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Email + Password */}
          <View style={styles.fieldGroup}>
            <UnderlineInput
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              colors={colors}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={MAX_EMAIL}
            />
            <UnderlineInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              colors={colors}
              secureTextEntry
              maxLength={MAX_PASSWORD}
            />
          </View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <Text style={[styles.error, { color: colors.errorColor }]}>{error}</Text>
            </Animated.View>
          )}

          {/* Primary button */}
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.buttonBg },
              (!canSubmit || disabledAll) && styles.btnDisabled,
            ]}
            onPress={submit}
            disabled={!canSubmit || disabledAll}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} size="small" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>
                {isLogin ? "로그인" : "회원가입"}
              </Text>
            )}
          </Pressable>

          {/* Mode switch */}
          <Pressable
            onPress={() => {
              setMode(isLogin ? "signup" : "login");
              setError(null);
            }}
            disabled={loading || googleLoading}
            style={styles.switchWrap}
          >
            <Text style={[styles.linkText, { color: colors.linkColor }]}>
              {isLogin
                ? "회원가입"
                : "이미 계정이 있나요? 로그인"}
            </Text>
          </Pressable>

          {/* Legal consent */}
          <View style={styles.consentWrap}>
            <Text style={[styles.consentText, { color: colors.consentText }]}>
              계속하면 YUA의{" "}
            </Text>
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  `${process.env.EXPO_PUBLIC_WEB_BASE_URL}/policies/terms`
                )
              }
            >
              <Text
                style={[
                  styles.consentLink,
                  { color: colors.consentText },
                ]}
              >
                이용약관
              </Text>
            </Pressable>
            <Text style={[styles.consentText, { color: colors.consentText }]}>
              {" "}및{" "}
            </Text>
            <Pressable
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  `${process.env.EXPO_PUBLIC_WEB_BASE_URL}/policies/privacy`
                )
              }
            >
              <Text
                style={[
                  styles.consentLink,
                  { color: colors.consentText },
                ]}
              >
                개인정보처리방침
              </Text>
            </Pressable>
            <Text style={[styles.consentText, { color: colors.consentText }]}>
              에 동의합니다.
            </Text>
          </View>
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

  /* brand */
  header: {
    alignItems: "center",
    marginBottom: 40,
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

  /* firebase warn */
  warnBox: {
    backgroundColor: "#fff4e6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ffd8a8",
  },
  warnText: {
    color: "#9a3412",
    fontSize: 12,
    lineHeight: 16,
  },

  /* google button */
  googleBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  googleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: {
    fontSize: 15,
    fontWeight: "700",
  },

  /* divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
  },

  /* inputs */
  fieldGroup: {
    gap: 4,
    marginBottom: 16,
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

  birthRow: {
    flexDirection: "row",
    gap: 12,
  },

  /* error */
  error: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },

  /* primary button */
  primaryBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },

  btnDisabled: {
    opacity: 0.4,
  },

  /* switch */
  switchWrap: {
    paddingVertical: 14,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },

  /* consent */
  consentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  consentText: {
    fontSize: 11,
    lineHeight: 16,
  },
  consentLink: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
