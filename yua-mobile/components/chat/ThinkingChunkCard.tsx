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
   Tool / Action detection
============================== */

const TOOL_KINDS = new Set<string>([
  ActivityKind.TOOL,
  ActivityKind.QUANT_ANALYSIS,
  ActivityKind.CODE_INTERPRETING,
  ActivityKind.SEARCHING,
  ActivityKind.EXECUTING,
]);

function isToolChunk(chunk: MobileOverlayChunk): boolean {
  return TOOL_KINDS.has(chunk.kind as string);
}

function tryFormatJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

function extractToolDisplay(chunk: MobileOverlayChunk): {
  toolName: string | null;
  params: string | null;
  result: string | null;
} {
  const title = chunk.title ?? null;
  const body = chunk.body ?? "";
  const meta = chunk.meta as Record<string, unknown> | null;

  // Try to extract structured params from meta
  const metaParams = meta?.params ?? meta?.arguments ?? meta?.input;
  const metaResult = meta?.result ?? meta?.output;

  let params: string | null = null;
  let result: string | null = null;

  if (metaParams && typeof metaParams === "object") {
    params = JSON.stringify(metaParams, null, 2);
  } else if (metaParams && typeof metaParams === "string") {
    params = tryFormatJson(metaParams) ?? metaParams;
  }

  if (metaResult && typeof metaResult === "string") {
    result = metaResult;
  } else if (metaResult && typeof metaResult === "object") {
    result = JSON.stringify(metaResult, null, 2);
  }

  // Fallback: if no structured data, try to parse body as JSON
  if (!params && !result && body.trim()) {
    const formatted = tryFormatJson(body.trim());
    if (formatted) {
      params = formatted;
    } else {
      result = body.trim();
    }
  }

  return { toolName: title, params, result };
}

/* ==============================
   ActivityKind -> Korean labels
============================== */

const KIND_LABELS: Record<string, string> = {
  [ActivityKind.ANALYZING_INPUT]: "입력 분석 중",
  [ActivityKind.ANALYZING_IMAGE]: "이미지 분석 중",
  [ActivityKind.PLANNING]: "계획 수립 중",
  [ActivityKind.RESEARCHING]: "조사 중",
  [ActivityKind.RANKING_RESULTS]: "결과 정리 중",
  [ActivityKind.FINALIZING]: "마무리 중",
  [ActivityKind.IMAGE_ANALYSIS]: "이미지 분석",
  [ActivityKind.IMAGE_GENERATION]: "이미지 생성",
  [ActivityKind.REASONING_SUMMARY]: "추론 요약",
  [ActivityKind.SEARCHING]: "검색 중",
  [ActivityKind.TOOL]: "도구 실행",
  [ActivityKind.QUANT_ANALYSIS]: "정량 분석",
  [ActivityKind.EXECUTING]: "실행 중",
  [ActivityKind.VERIFYING]: "검증 중",
  [ActivityKind.PREPARING_STUDIO]: "스튜디오 준비",
  [ActivityKind.CODE_INTERPRETING]: "코드 해석",
  [ActivityKind.NOTE]: "메모",
};

function getKindLabel(kind?: string | null): string {
  if (!kind) return "활동";
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
  const isTool = isToolChunk(chunk);

  // Tool chunks: structured display with code block
  if (isTool) {
    const { toolName, params, result } = extractToolDisplay(chunk);
    return (
      <View style={[styles.card, { backgroundColor: colors.chunkCardBg }]}>
        <View style={styles.cardHeader}>
          <PulseDot status={dotStatus} />
          <Text style={[styles.kindLabel, { color: colors.textPrimary }]}>
            {kindLabel}
          </Text>
          {toolName ? (
            <View style={[styles.toolBadge, { backgroundColor: colors.toolBadgeBg ?? "rgba(99,102,241,0.12)" }]}>
              <Text style={[styles.toolBadgeText, { color: colors.toolBadgeColor ?? "#6366f1" }]}>
                {toolName}
              </Text>
            </View>
          ) : null}
        </View>

        {params ? (
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <View style={[styles.codeBlock, { backgroundColor: colors.codeBlockBg ?? "rgba(0,0,0,0.04)" }]}>
              <Text
                style={[styles.codeText, { color: colors.codeBlockText ?? "#374151" }]}
                numberOfLines={expanded ? undefined : 6}
              >
                {params}
              </Text>
            </View>
            {!expanded && (params.split("\n").length > 6) && (
              <Text style={styles.expandHint}>더 보기</Text>
            )}
          </Pressable>
        ) : null}

        {result ? (
          <Text
            style={[styles.bodyText, { color: colors.textSecondary, marginTop: 6 }]}
            numberOfLines={expanded ? undefined : MAX_COLLAPSED_LINES}
          >
            {result}
          </Text>
        ) : null}
      </View>
    );
  }

  // Normal chunks: plain text display
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
            <Text style={styles.expandHint}>{"더 보기"}</Text>
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
  toolBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  toolBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  codeBlock: {
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  codeText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
});
