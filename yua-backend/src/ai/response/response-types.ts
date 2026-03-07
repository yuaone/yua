// 🔒 YUA Response Types — SSOT v1.1 FINAL
// --------------------------------------
// ⚠️ 이 파일은 설계 종료 선언에 해당한다.
// 이후 수정은 SSOT 위반이다.
//
// 책임:
// - 응답의 "어떻게 말할지"만 정의
// - 판단 ❌ / Core 로직 ❌ / UX ❌
//
// 사용처:
// - ResponsePlanner
// - Renderer
// - Humanization
// - generateResponse (최종 진입점)

/* ================================
   Response Mode (표현 방식)
================================ */
export type ResponseMode =
  | "DEFAULT"
  | "CASUAL"
  | "MEME"
  | "ONE_LINER"
  | "OBSERVER"
  | "CO_PILOT"
  | "CLEAN_ROOM"
  | "REPORT"; // ← 문서 계약용 명시 모드

/* ================================
   Response State (Always Respond)
================================ */
export type ResponseState =
  | "APPROVE"
  | "UNCERTAIN"
  | "DEFER"
  | "BLOCK";

/* ================================
   Response Depth (응답 깊이)
================================ */
export type ResponseDepth = 0 | 1 | 2 | 3;

/* ================================
   Safety Mapping (차단 표현 방식)
================================ */
export type SafetyMapping =
  | "redirect"
  | "clarify"
  | "soft-block";

/* ================================
   Explanation Style
================================ */
export type ExplanationStyle =
  | "implicit"
  | "explicit";

/* ================================
   Tone
================================ */
export type ResponseTone =
  | "neutral"
  | "casual"
  | "playful";

/* ================================
   Exposure Budget (Hybrid Exposure)
================================ */
export interface ExposureBudget {
  frame: number;
  axis: number;
  boundary: number;
}

/* ================================
   Response Plan (SSOT 핵심 계약)
================================ */
export interface ResponsePlan {
  // 결정된 표현 전략
  mode: ResponseMode;
  state: ResponseState;
  depth: ResponseDepth;

  // Hybrid exposure flags
  exposeFrame: boolean;
  exposeAxis: boolean;
  exposeBoundary: boolean;

  /**
   * 🔒 문서 계약 사용 여부
   * - true 인 경우에만 ResponseContract가 prepend됨
   * - NORMAL / CASUAL 경로에서는 항상 false
   */
  useContract?: boolean;

  // 표현 세부 전략
  tone: ResponseTone;
  explanationStyle: ExplanationStyle;

  // 안전 표현 매핑
  safetyMapping: SafetyMapping;
}
