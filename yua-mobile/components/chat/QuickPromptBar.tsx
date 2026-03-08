/**
 * QuickPromptBar — 6개 프롬프트 칩을 수평 스크롤로 표시.
 * 웹 QuickPromptBar와 동일한 칩 데이터 사용.
 */

import React, { useCallback } from "react";
import {
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import { useAdaptive } from "@/constants/adaptive";

/* ── Chip data ── */

const QUICK_PROMPTS = [
  { emoji: "📝", title: "추천", desc: "맞춤 추천을 받아보세요", draft: "맞춤 추천을 해주세요" },
  { emoji: "💡", title: "설명", desc: "복잡한 개념을 쉽게", draft: "쉽게 설명해 주세요" },
  { emoji: "📋", title: "정리", desc: "정보를 깔끔하게 정리", draft: "정리해 주세요" },
  { emoji: "🔍", title: "비교", desc: "옵션을 비교 분석", draft: "비교 분석해 주세요" },
  { emoji: "🛠", title: "어떻게", desc: "방법과 단계를 안내", draft: "방법을 알려주세요" },
  { emoji: "✨", title: "아이디어", desc: "창의적 아이디어 제안", draft: "아이디어를 제안해 주세요" },
] as const;

/* ── Props ── */

interface QuickPromptBarProps {
  onSelect: (draft: string) => void;
}

/* ── Constants ── */

const CHIP_WIDTH = 120;
const CHIP_HEIGHT = 72;
const CHIP_GAP = 8;
const CHIP_RADIUS = 16;
const EMOJI_SIZE = 20;
const TITLE_SIZE = 13;
const DESC_SIZE = 11;

/* ── Component ── */

function QuickPromptBarInner({ onSelect }: QuickPromptBarProps) {
  const { colors } = useTheme();
  const { messagePad } = useAdaptive();

  const chipStyle: ViewStyle = {
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    borderRadius: CHIP_RADIUS,
    borderWidth: 1,
    borderColor: colors.suggestionBorder,
    paddingHorizontal: MobileTokens.space.sm,
    paddingVertical: MobileTokens.space.sm,
    justifyContent: "flex-start",
  };

  const emojiStyle: TextStyle = {
    fontSize: EMOJI_SIZE,
    lineHeight: EMOJI_SIZE + 4,
  };

  const titleStyle: TextStyle = {
    fontSize: TITLE_SIZE,
    fontWeight: MobileTokens.weight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  };

  const descStyle: TextStyle = {
    fontSize: DESC_SIZE,
    color: colors.textMuted,
    marginTop: 1,
  };

  const handlePress = useCallback(
    (draft: string) => {
      onSelect(draft);
    },
    [onSelect],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: messagePad,
        gap: CHIP_GAP,
      }}
    >
      {QUICK_PROMPTS.map((p, i) => (
        <Pressable
          key={i}
          onPress={() => handlePress(p.draft)}
          style={({ pressed }) => [
            chipStyle,
            pressed && styles.pressed,
          ]}
        >
          <Text style={emojiStyle}>{p.emoji}</Text>
          <Text style={titleStyle} numberOfLines={1}>
            {p.title}
          </Text>
          <Text style={descStyle} numberOfLines={1}>
            {p.desc}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});

export const QuickPromptBar = React.memo(QuickPromptBarInner);
