import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";

/* ==============================
   Types
============================== */

interface SmartUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  remaining: number;
  cooldownEnd: number | null;
  tier: string;
}

/* ==============================
   Constants
============================== */

const BENEFITS = [
  "일일 메시지 무제한",
  "Deep Thinking 사용 가능",
  "이미지 생성",
  "우선 응답",
] as const;

/* ==============================
   Helpers
============================== */

function formatCooldown(cooldownEnd: number): string {
  const diff = cooldownEnd - Date.now();
  if (diff <= 0) return "";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.ceil((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

/* ==============================
   Component
============================== */

function SmartUpgradeModalInner({
  visible,
  onClose,
  onUpgrade,
  cooldownEnd,
}: SmartUpgradeModalProps) {
  const { colors } = useTheme();
  const [cooldownLabel, setCooldownLabel] = useState("");

  /* Cooldown timer — updates every minute */
  useEffect(() => {
    if (!visible || cooldownEnd === null) {
      setCooldownLabel("");
      return;
    }

    const update = () => {
      if (cooldownEnd <= Date.now()) {
        setCooldownLabel("");
        return;
      }
      setCooldownLabel(formatCooldown(cooldownEnd));
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [visible, cooldownEnd]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>

      {/* Card */}
      <View style={styles.center} pointerEvents="box-none">
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceMain },
          ]}
        >
          {/* Sparkle header */}
          <Text style={styles.sparkle}>&#x2728;</Text>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary },
            ]}
          >
            업그레이드
          </Text>

          {/* Subtitle */}
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary },
            ]}
          >
            무료 플랜의 일일 사용량을 초과했습니다
          </Text>

          {/* Benefits header */}
          <Text
            style={[
              styles.benefitsHeader,
              { color: colors.textPrimary },
            ]}
          >
            Pro 플랜으로 업그레이드하면:
          </Text>

          {/* Benefits list */}
          <View style={styles.benefitsList}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Text style={styles.checkmark}>&#x2705;</Text>
                <Text
                  style={[
                    styles.benefitText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {b}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.buttonBg }]}
            activeOpacity={0.8}
            onPress={onUpgrade}
          >
            <Text style={[styles.ctaText, { color: colors.buttonText }]}>
              Pro 업그레이드 — &#8361;9,900/월
            </Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismiss}
            activeOpacity={0.6}
            onPress={onClose}
          >
            <Text style={[styles.dismissText, { color: colors.textMuted }]}>
              나중에
            </Text>
          </TouchableOpacity>

          {/* Cooldown */}
          {cooldownLabel !== "" && (
            <Text style={[styles.cooldown, { color: colors.textMuted }]}>
              남은 쿨다운: {cooldownLabel}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const SmartUpgradeModal = React.memo(SmartUpgradeModalInner);

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: MobileTokens.radius.xxl,
    paddingVertical: MobileTokens.space.xxl,
    paddingHorizontal: MobileTokens.space.xxl,
    alignItems: "center",
    ...MobileTokens.shadow.lg,
  },
  sparkle: {
    fontSize: 48,
    marginBottom: MobileTokens.space.md,
  },
  title: {
    fontSize: MobileTokens.font.xl,
    fontWeight: MobileTokens.weight.bold,
    marginBottom: MobileTokens.space.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: MobileTokens.font.md,
    textAlign: "center",
    marginBottom: MobileTokens.space.xl,
    lineHeight: MobileTokens.font.md * MobileTokens.lineHeight.normal,
  },
  benefitsHeader: {
    fontSize: MobileTokens.font.md,
    fontWeight: MobileTokens.weight.semibold,
    alignSelf: "flex-start",
    marginBottom: MobileTokens.space.md,
  },
  benefitsList: {
    alignSelf: "stretch",
    marginBottom: MobileTokens.space.xl,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: MobileTokens.space.sm,
  },
  checkmark: {
    fontSize: 15,
    marginRight: MobileTokens.space.sm,
  },
  benefitText: {
    fontSize: MobileTokens.font.md,
    lineHeight: MobileTokens.font.md * MobileTokens.lineHeight.normal,
  },
  cta: {
    width: "100%",
    height: 52,
    borderRadius: MobileTokens.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: MobileTokens.space.md,
  },
  ctaText: {
    fontSize: MobileTokens.font.body,
    fontWeight: MobileTokens.weight.semibold,
  },
  dismiss: {
    paddingVertical: MobileTokens.space.sm,
  },
  dismissText: {
    fontSize: MobileTokens.font.md,
  },
  cooldown: {
    fontSize: MobileTokens.font.sm,
    marginTop: MobileTokens.space.md,
  },
});
