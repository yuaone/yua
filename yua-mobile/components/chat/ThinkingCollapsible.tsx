import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import ThinkingChunkCard from "@/components/chat/ThinkingChunkCard";
import type {
  MobileOverlayChunk,
  MobileThinkingSummary,
} from "@/store/useMobileStreamSessionStore";

/* ==============================
   Props
============================== */

interface ThinkingCollapsibleProps {
  chunks: MobileOverlayChunk[];
  summaries: MobileThinkingSummary[];
  profile: string | null; // "FAST" | "NORMAL" | "DEEP"
  elapsed: number; // ms
  finalized: boolean;
  hasText: boolean;
}

/* ==============================
   Helpers
============================== */

function formatElapsed(ms: number): string {
  if (ms <= 0) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function getProfileLabel(profile: string | null): string {
  if (profile === "DEEP") return "Deep Thinking";
  if (profile === "FAST") return "Fast";
  return "Thinking...";
}

/* ==============================
   PulseDot
============================== */

function CollapsiblePulseDot({ running, color }: { running: boolean; color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (running) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [running, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulseDot,
        { backgroundColor: color },
        running ? animStyle : undefined,
      ]}
    />
  );
}

/* ==============================
   ThinkingCollapsible
============================== */

function ThinkingCollapsible({
  chunks,
  summaries,
  profile,
  elapsed,
  finalized,
  hasText,
}: ThinkingCollapsibleProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isDeep = profile === "DEEP";
  const running = !finalized;
  const elapsedLabel = formatElapsed(elapsed);
  const profileLabel = getProfileLabel(profile);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // NORMAL/FAST: hide once text arrives (unless user explicitly expanded)
  const shouldHide = !isDeep && hasText && !expanded;
  if (shouldHide) return null;

  // No chunks and not running -> nothing to show
  if (chunks.length === 0 && !running && !finalized) return null;

  return (
    <Animated.View
      layout={Layout.duration(300)}
      style={[
        styles.container,
        {
          backgroundColor: colors.thinkPanelBg,
          borderColor: colors.thinkPanelBorder,
        },
      ]}
    >
      {/* ---- Collapsed header (always visible) ---- */}
      <Pressable
        style={styles.collapsedRow}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "접기" : "펼치기"}
      >
        <View style={styles.headerLeft}>
          <CollapsiblePulseDot running={running} color={colors.statusRunning} />
          <Text
            style={[
              styles.profileLabel,
              { color: colors.thinkPanelLabel },
            ]}
          >
            {profileLabel}
          </Text>
          {elapsedLabel ? (
            <Text style={[styles.elapsedLabel, { color: colors.textMuted }]}>
              ({elapsedLabel})
            </Text>
          ) : null}
        </View>
        <Text style={[styles.toggleLabel, { color: colors.linkColor }]}>
          {expanded ? "접기" : "펼치기"}
        </Text>
      </Pressable>

      {/* ---- Expanded content ---- */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.expandedWrap}
        >
          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <ScrollView
            style={styles.chunkScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {chunks.map((chunk) => (
              <ThinkingChunkCard key={chunk.chunkId} chunk={chunk} />
            ))}

            {/* Finalized footer */}
            {finalized && (
              <View style={styles.finalizedRow}>
                <Text style={styles.finalizedCheck}>&#x2705;</Text>
                <Text
                  style={[
                    styles.finalizedText,
                    { color: colors.thinkPanelLabel },
                  ]}
                >
                  생각 완료
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default React.memo(ThinkingCollapsible);

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  container: {
    borderRadius: MobileTokens.radius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  collapsedRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  elapsedLabel: {
    fontSize: 11,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  expandedWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  chunkScroll: {
    maxHeight: 400,
  },
  finalizedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
  },
  finalizedCheck: {
    fontSize: 14,
  },
  finalizedText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
