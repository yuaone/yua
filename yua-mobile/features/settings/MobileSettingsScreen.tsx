/**
 * MobileSettingsScreen
 *
 * Full-screen settings page with profile, personalization, theme,
 * notifications, data/security, and info sections.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";

import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import { useMobileAuth } from "@/contexts/MobileAuthContext";

/* ──────────────────────────────────────────────
   Storage keys
   ────────────────────────────────────────────── */
const NOTIF_STORAGE_KEY = "yua.mobile.notifications";
const PERSONALIZATION_STORAGE_KEY = "yua.mobile.personalization";
const THEME_STORAGE_KEY = "yua.mobile.theme";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
type ThemeMode = "light" | "dark" | "system";

interface NotifPrefs {
  messageCompleted: boolean;
  projectUpdates: boolean;
  systemNotices: boolean;
  assistantNotif: boolean;
  sound: boolean;
  vibration: boolean;
}

interface PersonalizationPrefs {
  displayName: string;
  allowNameCall: boolean;
  allowPersonalTone: boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  messageCompleted: true,
  projectUpdates: true,
  systemNotices: true,
  assistantNotif: true,
  sound: true,
  vibration: true,
};

const DEFAULT_PERSONALIZATION: PersonalizationPrefs = {
  displayName: "",
  allowNameCall: false,
  allowPersonalTone: false,
};

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function MobileSettingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useMobileAuth();

  // --- State ---
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF);
  const [personalPrefs, setPersonalPrefs] = useState<PersonalizationPrefs>(
    DEFAULT_PERSONALIZATION,
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [pushStatus, setPushStatus] = useState<string>("확인 중...");
  const [cacheSize, setCacheSize] = useState<string>("계산 중...");

  const notifDirty = useRef(false);
  const personalDirty = useRef(false);

  // --- Load saved prefs ---
  useEffect(() => {
    (async () => {
      try {
        const [nRaw, pRaw, tRaw] = await Promise.all([
          AsyncStorage.getItem(NOTIF_STORAGE_KEY),
          AsyncStorage.getItem(PERSONALIZATION_STORAGE_KEY),
          AsyncStorage.getItem(THEME_STORAGE_KEY),
        ]);
        if (nRaw) setNotifPrefs({ ...DEFAULT_NOTIF, ...JSON.parse(nRaw) });
        if (pRaw)
          setPersonalPrefs({ ...DEFAULT_PERSONALIZATION, ...JSON.parse(pRaw) });
        if (tRaw) setThemeMode(tRaw as ThemeMode);
      } catch {
        // silent
      }
    })();
  }, []);

  // --- Push permission status ---
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPushStatus(
          status === "granted"
            ? "허용됨"
            : status === "denied"
              ? "거부됨"
              : "미설정",
        );
      } catch {
        setPushStatus("알 수 없음");
      }
    })();
  }, []);

  // --- Estimate cache size ---
  useEffect(() => {
    (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        let total = 0;
        const items = await AsyncStorage.multiGet(keys);
        for (const [, val] of items) {
          if (val) total += val.length * 2; // rough byte estimate
        }
        if (total < 1024) {
          setCacheSize(`${total} B`);
        } else if (total < 1024 * 1024) {
          setCacheSize(`${(total / 1024).toFixed(1)} KB`);
        } else {
          setCacheSize(`${(total / (1024 * 1024)).toFixed(1)} MB`);
        }
      } catch {
        setCacheSize("알 수 없음");
      }
    })();
  }, []);

  // --- Persist helpers ---
  const persistNotif = useCallback(async (prefs: NotifPrefs) => {
    try {
      await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // silent
    }
  }, []);

  const persistPersonal = useCallback(
    async (prefs: PersonalizationPrefs) => {
      try {
        await AsyncStorage.setItem(
          PERSONALIZATION_STORAGE_KEY,
          JSON.stringify(prefs),
        );
      } catch {
        // silent
      }
    },
    [],
  );

  const updateNotif = useCallback(
    (key: keyof NotifPrefs, value: boolean) => {
      setNotifPrefs((prev) => {
        const next = { ...prev, [key]: value };
        persistNotif(next);
        return next;
      });
    },
    [persistNotif],
  );

  const updatePersonal = useCallback(
    <K extends keyof PersonalizationPrefs>(
      key: K,
      value: PersonalizationPrefs[K],
    ) => {
      setPersonalPrefs((prev) => {
        const next = { ...prev, [key]: value };
        persistPersonal(next);
        return next;
      });
    },
    [persistPersonal],
  );

  const handleThemeChange = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // silent
    }
  }, []);

  const handleRequestPush = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPushStatus(
        status === "granted"
          ? "허용됨"
          : status === "denied"
            ? "거부됨"
            : "미설정",
      );
      if (status === "denied") {
        Alert.alert(
          "알림 권한",
          "설정 앱에서 알림 권한을 허용해 주세요.",
          [
            { text: "취소", style: "cancel" },
            { text: "설정 열기", onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch {
      setPushStatus("알 수 없음");
    }
  }, []);

  const handleClearCache = useCallback(async () => {
    Alert.alert("캐시 삭제", "저장된 캐시 데이터를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            setCacheSize("0 B");
          } catch {
            // silent
          }
        },
      },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "계정 삭제",
      "정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            // TODO: call backend DELETE /api/account
          },
        },
      ],
    );
  }, []);

  // --- Derived ---
  const userName = user?.displayName || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const appVersion =
    Application.nativeApplicationVersion || Application.applicationId || "1.0.0";

  // --- Styles using theme ---
  const switchTrack = {
    false: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    true: colors.activeIndicator,
  };
  const switchThumb = isDark ? "#ffffff" : "#ffffff";

  const sectionHeaderStyle = {
    fontSize: MobileTokens.font.sm,
    fontWeight: MobileTokens.weight.semibold as "600",
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: MobileTokens.space.sm,
  };

  const hairline = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      {/* ═══════ Header ═══════ */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: Platform.OS === "ios" ? 56 : 16,
          paddingBottom: MobileTokens.space.md,
          paddingHorizontal: MobileTokens.space.lg,
          backgroundColor: colors.appBg,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: MobileTokens.touch.min,
            height: MobileTokens.touch.min,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 24,
              color: colors.textPrimary,
            }}
          >
            {"\u2190"}
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: MobileTokens.font.xxl,
            fontWeight: MobileTokens.weight.bold,
            color: colors.textPrimary,
            marginLeft: MobileTokens.space.sm,
          }}
        >
          설정
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: MobileTokens.space.lg,
          paddingBottom: MobileTokens.space.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════ 1. Profile ═══════ */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: MobileTokens.space.lg,
            marginBottom: MobileTokens.space.lg,
            ...hairline,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.avatarBg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.lg,
                fontWeight: MobileTokens.weight.bold,
                color: colors.avatarText,
              }}
            >
              {userInitial}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: MobileTokens.space.md }}>
            <Text
              style={{
                fontSize: MobileTokens.font.md,
                fontWeight: MobileTokens.weight.semibold,
                color: colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.textMuted,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {userEmail}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: MobileTokens.space.sm,
              paddingVertical: MobileTokens.space.xs,
              borderRadius: MobileTokens.radius.chip,
              backgroundColor: colors.activeIndicator,
            }}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.xxs,
                fontWeight: MobileTokens.weight.semibold,
                color: "#ffffff",
              }}
            >
              Free
            </Text>
          </View>
        </View>

        {/* ═══════ 2. Personalization ═══════ */}
        <View style={{ marginBottom: MobileTokens.space.xl }}>
          <Text style={sectionHeaderStyle}>개인 맞춤</Text>

          {/* Display name */}
          <View
            style={{
              height: MobileTokens.touch.large,
              justifyContent: "center",
              ...hairline,
            }}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.textMuted,
                marginBottom: MobileTokens.space.xs,
              }}
            >
              표시 이름
            </Text>
            <TextInput
              value={personalPrefs.displayName}
              onChangeText={(v) => updatePersonal("displayName", v)}
              placeholder="이름 또는 닉네임"
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                fontSize: MobileTokens.font.md,
                color: colors.textPrimary,
                padding: 0,
              }}
            />
          </View>

          {/* Allow name call */}
          <ToggleRow
            title="이름으로 불러도 돼요"
            desc="YUA가 대화 중 이름을 사용합니다"
            value={personalPrefs.allowNameCall}
            onValueChange={(v) => updatePersonal("allowNameCall", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />

          {/* Personal tone */}
          <ToggleRow
            title="개인적인 말투"
            desc="친근한 표현을 더 자주 사용합니다"
            value={personalPrefs.allowPersonalTone}
            onValueChange={(v) => updatePersonal("allowPersonalTone", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
        </View>

        {/* ═══════ 3. Theme ═══════ */}
        <View style={{ marginBottom: MobileTokens.space.xl }}>
          <Text style={sectionHeaderStyle}>테마</Text>
          <View
            style={{
              flexDirection: "row",
              borderRadius: MobileTokens.radius.md,
              overflow: "hidden",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
            }}
          >
            {(
              [
                { id: "light", label: "라이트" },
                { id: "dark", label: "다크" },
                { id: "system", label: "시스템" },
              ] as const
            ).map((item, idx) => {
              const active = themeMode === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleThemeChange(item.id)}
                  style={{
                    flex: 1,
                    paddingVertical: MobileTokens.space.md,
                    alignItems: "center",
                    backgroundColor: active ? colors.buttonBg : "transparent",
                    borderLeftWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                    borderLeftColor: colors.line,
                  }}
                >
                  <Text
                    style={{
                      fontSize: MobileTokens.font.sm,
                      fontWeight: active
                        ? MobileTokens.weight.semibold
                        : MobileTokens.weight.regular,
                      color: active ? colors.buttonText : colors.textSecondary,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ═══════ 4. Notifications ═══════ */}
        <View style={{ marginBottom: MobileTokens.space.xl }}>
          <Text style={sectionHeaderStyle}>알림</Text>

          <ToggleRow
            title="메시지 완료 알림"
            desc="Assistant 응답이 완료되면 알려줍니다"
            value={notifPrefs.messageCompleted}
            onValueChange={(v) => updateNotif("messageCompleted", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
          <ToggleRow
            title="프로젝트 업데이트"
            desc="프로젝트/스레드 변경을 알려줍니다"
            value={notifPrefs.projectUpdates}
            onValueChange={(v) => updateNotif("projectUpdates", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
          <ToggleRow
            title="시스템 공지"
            desc="서비스 공지와 중요한 시스템 메시지"
            value={notifPrefs.systemNotices}
            onValueChange={(v) => updateNotif("systemNotices", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
          <ToggleRow
            title="어시스턴트 알림"
            desc="YUA가 중요한 정보를 알림으로 보냅니다"
            value={notifPrefs.assistantNotif}
            onValueChange={(v) => updateNotif("assistantNotif", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
          <ToggleRow
            title="소리"
            desc="알림 수신 시 소리를 재생합니다"
            value={notifPrefs.sound}
            onValueChange={(v) => updateNotif("sound", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />
          <ToggleRow
            title="진동"
            desc="알림 수신 시 진동으로 알려줍니다"
            value={notifPrefs.vibration}
            onValueChange={(v) => updateNotif("vibration", v)}
            trackColor={switchTrack}
            thumbColor={switchThumb}
            hairline={hairline}
            colors={colors}
          />

          {/* Push permission subsection */}
          <View
            style={{
              marginTop: MobileTokens.space.lg,
              padding: MobileTokens.space.lg,
              borderRadius: MobileTokens.radius.md,
              backgroundColor: colors.wash,
            }}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.sm,
                fontWeight: MobileTokens.weight.semibold,
                color: colors.textPrimary,
                marginBottom: MobileTokens.space.xs,
              }}
            >
              푸시 알림 권한
            </Text>
            <Text
              style={{
                fontSize: MobileTokens.font.xs,
                color: colors.textMuted,
                marginBottom: MobileTokens.space.sm,
              }}
            >
              현재 상태: {pushStatus}
            </Text>
            {pushStatus !== "허용됨" && (
              <Pressable
                onPress={handleRequestPush}
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: MobileTokens.space.lg,
                  paddingVertical: MobileTokens.space.sm,
                  borderRadius: MobileTokens.radius.sm,
                  backgroundColor: colors.buttonBg,
                }}
              >
                <Text
                  style={{
                    fontSize: MobileTokens.font.sm,
                    fontWeight: MobileTokens.weight.medium,
                    color: colors.buttonText,
                  }}
                >
                  권한 요청
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ═══════ 5. Data & Security ═══════ */}
        <View style={{ marginBottom: MobileTokens.space.xl }}>
          <Text style={sectionHeaderStyle}>데이터 &amp; 보안</Text>

          <ActionRow
            title="대화 내보내기"
            subtitle="모든 대화를 파일로 내보냅니다"
            onPress={() => {
              // TODO: implement export
              Alert.alert("준비 중", "대화 내보내기 기능은 준비 중입니다.");
            }}
            hairline={hairline}
            colors={colors}
          />
          <ActionRow
            title="캐시 삭제"
            subtitle={cacheSize}
            onPress={handleClearCache}
            hairline={hairline}
            colors={colors}
          />
          <ActionRow
            title="계정 삭제"
            destructive
            onPress={handleDeleteAccount}
            hairline={hairline}
            colors={colors}
          />
        </View>

        {/* ═══════ 6. Info ═══════ */}
        <View style={{ marginBottom: MobileTokens.space.xl }}>
          <Text style={sectionHeaderStyle}>정보</Text>

          <View
            style={{
              height: MobileTokens.touch.large,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              ...hairline,
            }}
          >
            <Text
              style={{
                fontSize: MobileTokens.font.md,
                color: colors.textPrimary,
              }}
            >
              앱 버전
            </Text>
            <Text
              style={{
                fontSize: MobileTokens.font.sm,
                color: colors.textMuted,
              }}
            >
              {appVersion}
            </Text>
          </View>

          <ActionRow
            title="이용약관"
            onPress={() => {
              if (router.canDismiss?.()) {
                // noop
              }
              Linking.openURL("https://yuaone.com/policies/terms");
            }}
            hairline={hairline}
            colors={colors}
            chevron
          />
          <ActionRow
            title="개인정보처리방침"
            onPress={() =>
              Linking.openURL("https://yuaone.com/policies/privacy")
            }
            hairline={hairline}
            colors={colors}
            chevron
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

interface ToggleRowProps {
  title: string;
  desc: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackColor: { false: string; true: string };
  thumbColor: string;
  hairline: { borderBottomWidth: number; borderBottomColor: string };
  colors: ReturnType<typeof useTheme>["colors"];
}

function ToggleRow({
  title,
  desc,
  value,
  onValueChange,
  trackColor,
  thumbColor,
  hairline,
  colors,
}: ToggleRowProps) {
  return (
    <View
      style={{
        height: MobileTokens.touch.large,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...hairline,
      }}
    >
      <View style={{ flex: 1, marginRight: MobileTokens.space.md }}>
        <Text
          style={{
            fontSize: MobileTokens.font.md,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: MobileTokens.font.xs,
            color: colors.textMuted,
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {desc}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={trackColor}
        thumbColor={thumbColor}
      />
    </View>
  );
}

interface ActionRowProps {
  title: string;
  subtitle?: string;
  destructive?: boolean;
  chevron?: boolean;
  onPress: () => void;
  hairline: { borderBottomWidth: number; borderBottomColor: string };
  colors: ReturnType<typeof useTheme>["colors"];
}

function ActionRow({
  title,
  subtitle,
  destructive,
  chevron,
  onPress,
  hairline,
  colors,
}: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: MobileTokens.touch.large,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        ...hairline,
      }}
    >
      <Text
        style={{
          fontSize: MobileTokens.font.md,
          color: destructive ? colors.errorColor : colors.textPrimary,
          fontWeight: destructive ? MobileTokens.weight.medium : undefined,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {subtitle != null && (
          <Text
            style={{
              fontSize: MobileTokens.font.sm,
              color: colors.textMuted,
              marginRight: chevron ? MobileTokens.space.xs : 0,
            }}
          >
            {subtitle}
          </Text>
        )}
        {chevron && (
          <Text
            style={{
              fontSize: MobileTokens.font.md,
              color: colors.textMuted,
            }}
          >
            {"\u203A"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
