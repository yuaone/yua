// 🔥 YUA Policy Gate — SSOT STEP 6 (PERMISSION ONLY)
// -----------------------------------------------------
// ✔ 권한 힌트만 제공
// ✔ 메모리 기본 허용 (대화 연속성 절대 보호)
// ✔ 검색은 명확한 dev 작업에서만 허용
// ✔ ReasoningResult 타입 침범 ❌
// ✔ 업그레이드/확장에 안전
// ❌ 답변 제한 / 책임 판단 / UX 개입 금지
// -----------------------------------------------------

import type { ReasoningResult } from "../reasoning/reasoning-engine";

export type PolicyDecision = {
  allowSearch: boolean;
  allowMemory: boolean;
};

function hasSensitiveSignals(text: string): boolean {
  // 🔒 전역 안전 키워드 (권한 힌트용)
  return /(불법|해킹|탈취|악성코드|바이러스|크랙|우회|도청|스파이)/i.test(text);
}

/**
 * 🔒 ReasoningResult는 신뢰 가능한 최소 필드만 사용
 * - intent 만 직접 사용
 * - domain / stage / memoryIntent 절대 직접 접근 ❌
 */
function getIntent(reasoning: ReasoningResult): string {
  return reasoning.intent;
}

export const PolicyGate = {
  decide(args: {
    reasoning: ReasoningResult;
    userType?: string;
    input: string;
  }): PolicyDecision {
    const { reasoning, input } = args;

    /* -------------------------------------------------- */
    /* ✅ SSOT 기본값                                      */
    /* -------------------------------------------------- */
    // 🔑 핵심: 메모리는 무조건 허용
    let allowMemory = true;
    let allowSearch = false;

    /* -------------------------------------------------- */
    /* 1️⃣ HARD SAFETY (유일한 차단 지점)                  */
    /* -------------------------------------------------- */
    if (hasSensitiveSignals(input)) {
      return {
        allowSearch: false,
        allowMemory: false,
      };
    }

    /* -------------------------------------------------- */
    /* 2️⃣ SEARCH PERMISSION (보수적)                      */
    /* -------------------------------------------------- */
    // ReasoningResult의 intent만 신뢰
    // → 향후 intent가 늘어나도 안전
    const intent = getIntent(reasoning);

    // dev 성격 작업에서만 search 허용
    // (의도 기반, 도메인 의존 ❌)
    if (
      intent === "debug" ||
      intent === "design" ||
      intent === "execute"
    ) {
      allowSearch = true;
    }

    /* -------------------------------------------------- */
    /* 3️⃣ DEFAULT RETURN                                 */
    /* -------------------------------------------------- */
    // ❗ allowMemory는 어떤 경우에도 true 유지
    return {
      allowSearch,
      allowMemory,
    };
  },
};
