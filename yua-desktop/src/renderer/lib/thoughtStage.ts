// lib/thoughtStage.ts

/**
 * YUA Thought Stage (UI-only)
 * - 서버는 stage string만 전달
 * - 해석 / 이모지 / 표현은 프론트 책임
 */

export type ThoughtStage =
  /* ───────────── 사고 탐색 ───────────── */
  | "expand"          // 맥락 확장
  | "clarify"         // 의미 명확화
  | "question"        // 질문 재정의
  | "recall"          // 기존 맥락 호출

  /* ───────────── 구조화 ───────────── */
  | "structure"       // 구조 정리
  | "organize"        // 정렬 / 분류
  | "map"             // 관계 맵핑

  /* ───────────── 분석 / 추론 ───────────── */
  | "analyze"         // 분석
  | "reason"          // 논리 전개
  | "compare"         // 비교
  | "evaluate"        // 평가

  /* ───────────── 판단 / 결정 ───────────── */
  | "decide"          // 결정
  | "approve"         // 긍정 판단
  | "reject"          // 거절 / 차단
  | "hold"            // 보류
  | "warn"            // 주의

  /* ───────────── 실행 / 적용 ───────────── */
  | "apply"           // 적용
  | "implement"       // 구현
  | "test"            // 테스트
  | "fix"             // 수정

  /* ───────────── 정리 / 종료 ───────────── */
  | "summarize"       // 요약
  | "conclude"        // 결론
  | "reflect"         // 메타 사고
  | "next"            // 다음 단계 제시

  /* ───────────── 상태 신호 ───────────── */
  | "blocked"         // 막힘
  | "skip"            // 생략
  | "stop"            // 종료
  | "analyzing_image"; // 🖼️ 이미지 분석 중 (NEW)

export const emojiMap: Record<ThoughtStage, string> = {
  /* 사고 탐색 */
  expand: "🤔",
  clarify: "🔍",
  question: "❓",
  recall: "🧠",

  /* 구조화 */
  structure: "🧩",
  organize: "🗂️",
  map: "🗺️",

  /* 분석 / 추론 */
  analyze: "📊",
  reason: "🧠",
  compare: "⚖️",
  evaluate: "🧪",

  /* 판단 / 결정 */
  decide: "✅",
  approve: "👍",
  reject: "❌",
  hold: "✋",
  warn: "⚠️",

  /* 실행 / 적용 */
  apply: "🛠️",
  implement: "👆",
  test: "🧪",
  fix: "🩹",

  /* 정리 / 종료 */
  summarize: "✨",
  conclude: "🏁",
  reflect: "🪞",
  next: "👉",

  /* 상태 신호 */
  blocked: "🚫",
  skip: "⏭️",
  stop: "🛑",

  /* 이미지 */
  analyzing_image: "🖼️",
};
