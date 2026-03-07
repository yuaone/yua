export type PromptMode = "FAST" | "THINK" | "DEEP" | "BENCH";

interface ModeRule {
  mode: PromptMode;
  triggers: string[];
}

/**
 * Prompt Mode Detector (SSOT SAFE)
 * - 우선순위: BENCH > DEEP > THINK > FAST
 */
const MODE_RULES: ModeRule[] = [
  {
    mode: "BENCH",
    triggers: [
      // 🔥 BENCH는 절대 최우선
      "benchmark",
      "벤치",
      "시험",
      "테스트",
      "평가",
      "점수",
      "math benchmark"
    ]
  },
  {
    mode: "DEEP",
    triggers: [
      "설계",
      "아키텍처",
      "구조",
      "단계별",
      "분해",
      "architecture",
      "design",
      "system",
      "engine"
    ]
  },
  {
    mode: "THINK",
    triggers: [
      "왜",
      "차이",
      "비교",
      "어떻게",
      "판단",
      "reason",
      "analyze"
    ]
  }
];

export function detectMode(message: string): PromptMode {
  const text = message.toLowerCase();

  // 🔥 인사만 있는 경우만 FAST
  if (text.length < 6 && /^[가-힣!?.]+$/.test(text)) {
    return "FAST";
  }

  for (const rule of MODE_RULES) {
    if (rule.triggers.some(t => text.includes(t))) {
      return rule.mode;
    }
  }

  return "THINK";
}
