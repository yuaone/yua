import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ActivityKind } from "yua-shared/stream/activity";
import type { MobileOverlayChunk } from "@/store/useMobileStreamSessionStore";

/* ==============================
   ActivityKind -> Korean labels
============================== */

const KIND_LABELS: Record<string, string> = {
  [ActivityKind.ANALYZING_INPUT]: "\uC785\uB825 \uBD84\uC11D \uC911",
  [ActivityKind.ANALYZING_IMAGE]: "\uC774\uBBF8\uC9C0 \uBD84\uC11D \uC911",
  [ActivityKind.PLANNING]: "\uACC4\uD68D \uC218\uB9BD \uC911",
  [ActivityKind.RESEARCHING]: "\uC870\uC0AC \uC911",
  [ActivityKind.RANKING_RESULTS]: "\uACB0\uACFC \uC815\uB9AC \uC911",
  [ActivityKind.FINALIZING]: "\uB9C8\uBB34\uB9AC \uC911",
  [ActivityKind.IMAGE_ANALYSIS]: "\uC774\uBBF8\uC9C0 \uBD84\uC11D",
  [ActivityKind.IMAGE_GENERATION]: "\uC774\uBBF8\uC9C0 \uC0DD\uC131",
  [ActivityKind.REASONING_SUMMARY]: "\uCD94\uB860 \uC694\uC57D",
  [ActivityKind.SEARCHING]: "\uAC80\uC0C9 \uC911",
  [ActivityKind.TOOL]: "\uB3C4\uAD6C \uC2E4\uD589",
  [ActivityKind.QUANT_ANALYSIS]: "\uC815\uB7C9 \uBD84\uC11D",
  [ActivityKind.EXECUTING]: "\uC2E4\uD589 \uC911",
  [ActivityKind.VERIFYING]: "\uAC80\uC99D \uC911",
  [ActivityKind.PREPARING_STUDIO]: "\uC2A4\uD29C\uB514\uC624 \uC900\uBE44",
  [ActivityKind.CODE_INTERPRETING]: "\uCF54\uB4DC \uD574\uC11D",
  [ActivityKind.NOTE]: "\uBA54\uBAA8",
};

function getKindLabel(kind?: string | null): string {
  if (!kind) return "\uD65C\uB3D9";
  return KIND_LABELS[kind] ?? kind;
}

/* ==============================
   Status dot color
============================== */

type DotStatus = "running" | "ok" | "failed";

function resolveDotStatus(chunk: MobileOverlayChunk): DotStatus {
  if (chunk.done) {
    const meta = chunk.meta as { status?: string } | null;
    if (meta?.status === "FAILED") return "failed";
    return "ok";
  }
  return "running";
}

/* ==============================
   PulseDot (animated for running)
============================== */

function PulseDot({ status }: { status: DotStatus }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (status === "running") {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      opacity.value = 1;
    }
  }, [status, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dotColor =
    status === "running"
      ? "#3b82f6"
      : status === "ok"
        ? "#22c55e"
        : "#ef4444";

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: dotColor },
        status === "running" ? animStyle : undefined,
      ]}
    />
  );
}

/* ==============================
   ThinkingChunkCard
============================== */

type Props = {
  chunk: MobileOverlayChunk;
};

const MAX_COLLAPSED_LINES = 4;

function ThinkingChunkCard({ chunk }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const dotStatus = resolveDotStatus(chunk);
  const kindLabel = getKindLabel(chunk.kind);
  const bodyText = chunk.inline ?? chunk.body ?? null;
  const hasBody = Boolean(bodyText?.trim());

  return (
    <View style={[styles.card, { backgroundColor: colors.chunkCardBg }]}>
      <View style={styles.cardHeader}>
        <PulseDot status={dotStatus} />
        <Text
          style={[
            styles.kindLabel,
            { color: colors.textPrimary },
          ]}
        >
          {kindLabel}
        </Text>
      </View>

      {hasBody ? (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <Text
            style={[
              styles.bodyText,
              { color: colors.textSecondary },
            ]}
            numberOfLines={expanded ? undefined : MAX_COLLAPSED_LINES}
          >
            {bodyText}
          </Text>
          {!expanded && (bodyText?.split("\n").length ?? 0) > MAX_COLLAPSED_LINES && (
            <Text style={styles.expandHint}>{"\uB354 \uBCF4\uAE30"}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default React.memo(ThinkingChunkCard);

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardLight: {
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  cardDark: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kindLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  kindLabelLight: {
    color: "#111111",
  },
  kindLabelDark: {
    color: "#f5f5f5",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodyTextLight: {
    color: "#374151",
  },
  bodyTextDark: {
    color: "#d1d5db",
  },
  expandHint: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 4,
  },
});
