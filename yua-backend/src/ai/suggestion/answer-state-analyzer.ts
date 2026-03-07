// 📂 src/ai/suggestion/answer-state-analyzer.ts
// 🔥 YUA AnswerState Analyzer — PRODUCTION READY (2025.12)
// --------------------------------------------------------
// ✔ LLM-free / deterministic
// ✔ Stream & Non-stream 공통 사용
// ✔ 휴리스틱 기반 (언어 독립적)
// ✔ 절대 판단 로직 ❌
// --------------------------------------------------------

import type {
  AnswerState,
  AnswerCompleteness,
  AnswerOpenEnd,
  AnswerConfidenceImpression,
  AnswerTone,
} from "./answer-state";

/* --------------------------------------------------
 * Internal helpers
 * -------------------------------------------------- */

function normalize(text: string): string {
  const t = (text ?? "").trim();

  // 🔒 SSOT: meta / filler 문장 제거
  // - "문단의 기능" 같은 템플릿 문장은 답변으로 간주하면 안 됨
  // - Analyzer가 이를 실답변으로 분석하면 suggestion이 오염됨
  const cleaned = t
    // 1) 흔한 filler 제거
    .replace(/^(그래|응)[\s,:-]*/i, "")
    // 2) 메타 템플릿 라인 제거
    .replace(/^이 문단의 기능은 .*$/gm, "")
    .replace(/^가정:\s*.*$/gm, "")
    .replace(/^이 가정이 깨질 수 있는 경우:\s*.*$/gm, "")
    .replace(/^목표:\s*.*$/gm, "")

    // 3) 섹션 라벨만 남는 경우 제거
    .replace(/^\s*[-*]\s*$/gm, "");


  return cleaned.trim();
}

function countMatches(
  text: string,
  patterns: RegExp[]
): number {
  let count = 0;
  for (const p of patterns) {
    if (p.test(text)) count += 1;
  }
  return count;
}

/* --------------------------------------------------
 * Heuristic rules
 * -------------------------------------------------- */

// 다음 단계 암시
const NEXT_STEP_PATTERNS = [
  /(다음|이제|이후|이어|계속|다음 단계|다음으로)/i,
  /(next step|next|then|after this)/i,
];

// 비교 암시
const COMPARE_PATTERNS = [
  /(비교|차이|vs|장단점|어떤 게)/i,
  /(compare|difference|pros|cons)/i,
];

// 구현 암시
const IMPLEMENT_PATTERNS = [
  /(구현|적용|실제|코드|바로|실행)/i,
  /(implement|apply|code|run)/i,
];

// 검증 암시
const VERIFY_PATTERNS = [
  /(검증|확인|맞는지|테스트|점검)/i,
  /(verify|check|validate|test)/i,
];

// 요약 암시
const SUMMARIZE_PATTERNS = [
  /(요약|정리하면|한마디로)/i,
  /(summarize|summary|in short)/i,
];

// 확신/단정
const HIGH_CONF_PATTERNS = [
  /(확실|명확|반드시|무조건|정답)/i,
  /(definitely|clearly|must|always)/i,
];

// 완화/유보
const LOW_CONF_PATTERNS = [
  /(아마|가능|경우에 따라|완전히는|조심)/i,
  /(maybe|might|depends|not always)/i,
];

// 가이드/지시
const GUIDANCE_PATTERNS = [
  /(해보자|권장|추천|순서|단계)/i,
  /(you should|recommended|step)/i,
];

/* --------------------------------------------------
 * Analyzer
 * -------------------------------------------------- */

export const AnswerStateAnalyzer = {
  analyze(
    answerText: string,
    meta?: { mode?: "FAST" | "NORMAL" | "DEEP" | "SEARCH" }
  ): AnswerState {
    const text = normalize(answerText);

        // 🔒 SSOT: FAST answers are always treated as complete
    if (meta?.mode === "FAST") {
      return {
       completeness: "FULL",
        openEnds: [],
        confidenceImpression: "MID",
        tone: "DIRECT",
      };
    }

       // 🔥 SSOT: 멀티모달 1턴 휴리스틱 무력화
    const isMultimodal =
      (arguments as any)[1]?.isMultimodal === true;

    if (isMultimodal) {
      return {
        completeness: "FULL",
        openEnds: [],
        confidenceImpression: "MID",
        tone: "EXPLANATION",
      };
    }

    /* -----------------------------
     * Guard: empty / trivial output
     * ----------------------------- */
    if (text.length < 30) {
      return {
        // 🔥 SSOT: 짧은 설명은 '설명 완료'로 간주
        completeness: "FULL",
        openEnds: [],
        confidenceImpression: "MID",
        tone: "EXPLANATION",
      };
    }

    /* -----------------------------
     * OpenEnds detection
     * ----------------------------- */
    const openEndsSet = new Set<AnswerOpenEnd>();

    if (countMatches(text, COMPARE_PATTERNS) > 0) {
      openEndsSet.add("COMPARE");
    }
    if (countMatches(text, IMPLEMENT_PATTERNS) > 0) {
      openEndsSet.add("IMPLEMENT");
    }
    if (countMatches(text, VERIFY_PATTERNS) > 0) {
      openEndsSet.add("VERIFY");
    }
    if (countMatches(text, SUMMARIZE_PATTERNS) > 0) {
      openEndsSet.add("SUMMARIZE");
    }
    // 🔒 SSOT: NEXT_STEP은 단독으로 openEnd 취급 ❌
    // - IMPLEMENT / VERIFY 등 "행동형" openEnd가 있을 때만 보조 신호
const hasImplement =
  countMatches(text, IMPLEMENT_PATTERNS) > 0;

const hasVerify =
  countMatches(text, VERIFY_PATTERNS) > 0;

// 🔒 SSOT: "행동형" openEnd만 NEXT_STEP 후보
const hasActionOpenEnd =
  hasImplement || hasVerify;

const hasExplicitActionVerb =
  /(하자|해보자|진행하자|적용하자|구현하자|확인하자)/.test(text);

if (
  hasActionOpenEnd &&
  hasExplicitActionVerb &&
  countMatches(text, NEXT_STEP_PATTERNS) > 0
) {
  openEndsSet.add("NEXT_STEP");
}

    /* -----------------------------
     * Completeness
     * ----------------------------- */
   const openEnds = Array.from(openEndsSet);

    // 🔒 SSOT: 구조적 종료 선언 가드
 // 분석 + 선택지 제시는 종료 상태로 본다
 const hasStructuralClosure =
   /(결론|요약하면|종합하면|결국)/.test(text) &&
   /(선택|다음 수|다음 선택지|고르라)/.test(text);

    // 🔒 SSOT CHANGE:
    // Analyzer는 "닫혔는지"를 판단하지 않는다.
    // → openEnds / tone / confidence 신호만 제공
        /**
     * 🔥 SSOT FIX (PHASE STREAM STABILITY)
     *
     * - openEnds가 없으면 답변은 "완결"
     * - Analyzer는 판단하지 않지만
     *   "완결 여부 신호"는 제공해야 함
     *
     * → Suggestion / Stream 종료 판단 안정화
     */
    const completeness: AnswerCompleteness =
      openEnds.length === 0
        ? "FULL"
        : "PARTIAL";

    /* -----------------------------
     * Confidence impression
     * ----------------------------- */
    const highHits = countMatches(
      text,
      HIGH_CONF_PATTERNS
    );
    const lowHits = countMatches(
      text,
      LOW_CONF_PATTERNS
    );

    let confidenceImpression: AnswerConfidenceImpression =
      "MID";

    if (highHits > lowHits + 1) {
      confidenceImpression = "HIGH";
    } else if (lowHits > highHits) {
      confidenceImpression = "LOW";
    }

    /* -----------------------------
     * Tone
     * ----------------------------- */
    let tone: AnswerTone = "EXPLANATION";

    if (
      openEnds.includes("IMPLEMENT") ||
      openEnds.includes("VERIFY")
    ) {
      tone = "GUIDANCE";
    } else if (
      countMatches(text, GUIDANCE_PATTERNS) > 0 &&
      text.length < 600
    ) {
      tone = "GUIDANCE";
    } else if (
      confidenceImpression === "HIGH" &&
      text.length < 600
    ) {
      tone = "DIRECT";
    }

    return {
      completeness,
      openEnds,
      confidenceImpression,
      tone,
    };
  },
};
