"use client";
import type { ActionPreview } from "yua-shared/types/action-preview";

export const ACTION_PREVIEW_PRESETS: Record<
  ActionPreview["kind"] | "UNKNOWN",
  Omit<ActionPreview, "kind" | "confidence">
> = {
  SEARCHING: {
    cadenceMs: 500,
    frames: [
      "관련 자료를 살펴보고 있어요",
      "신뢰할 수 있는 출처를 확인 중이에요",
      "적절한 정보만 추리고 있어요",
    ],
  },
  THINKING_HARD: {
    cadenceMs: 650,
    frames: [
      "여러 관점을 맞춰보고 있어요",
      "논리 구조를 다시 정렬 중이에요",
      "최종 답을 더 간결하게 다듬고 있어요",
    ],
  },

  VERIFYING: {
    cadenceMs: 700,
    frames: [
      "사실 관계를 다시 확인 중이에요",
      "앞뒤 맥락이 맞는지 보고 있어요",
      "잘못된 추론이 없는지 점검 중이에요",
    ],
  },

    BRANCHING: {
    cadenceMs: 650,
    frames: [
      "가능한 선택지를 나눠보고 있어요",
      "각 분기에서 결과를 비교 중이에요",
      "가장 안전한 경로를 고르는 중이에요",
    ],
  },

    // 🔒 SSOT FALLBACK — 절대 UI 크래시 금지
  UNKNOWN: {
    cadenceMs: 600,
    frames: [
      "처리 중이에요",
      "조금만 기다려 주세요",
    ],
  },
} as const;
