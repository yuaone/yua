// 🔒 Path Router — GLOBAL SSOT (INTENT-AWARE, SAFE)
// ------------------------------------------------
// 책임:
// - 텍스트 기반 "경로 힌트"만 제공
// - 절대 DEEP/BENCH를 강제하지 않음
// - Scheduler / Judgment가 최종 결정
// ------------------------------------------------

import { NormalizedInput } from "../ai/input/input-types";

export type PathType =
  | "FAST"
  | "NORMAL"
  | "DEEP"
  | "BENCH"
  | "SEARCH"
  | "RESEARCH";

export const PATH_ROUTER_STAGE = "path-router" as const;

/* =========================
   Intent Detectors (SSOT)
========================= */

/**
 * 🔍 외부 사실 / 탐색 필요
 * - 링크, 가격, 장소, 최신성
 */
function hasExternalSearchNeed(text: string): boolean {
  return /(검색|찾아줘|어디서|어디에|가격|얼마|링크|url|사이트|최신|뉴스|자료|통계|목록|리스트|best|top)/i.test(
    text
  );
}

/**
 * 💡 생성/기획/설계 의도
 * - SEARCH와 상충 시 우선
 */
function hasGenerativeIntent(text: string): boolean {
  return /(아이디어|기획|만들|설계|제안|구상|전략|아키텍처)/i.test(
    text
  );
}

/**
 * ❓ 방법/구현 질문
 * - 생성형이지만 탐색 아님
 */
function hasHowIntent(text: string): boolean {
  return /(방법|어떻게|구현|적용|설명해줘)/i.test(text);
}

/**
 * 👋 인사/초경량 입력
 */
function isGreeting(text: string): boolean {
  const t = text.trim();
  return /^(hi|hello|안녕|안녕 유아|안녕하세요|ㅎㅇ|하이|야|어|응)(\s|$|[!?~ㅋㅎ])/i.test(
    t
  );
}

/**
 * ➗ 계산/증명 "행위" 신호
 * - 명사만으로는 불충분
 */
function hasProofLikeIntent(text: string): boolean {
  return /(증명해|증명해줘|계산해|풀어줘|prove|proof of|benchmark 해)/i.test(
    text
  );
}

/* =========================
   Path Inference (SSOT)
========================= */

function inferPathFromText(
  text: string,
  base: PathType
): PathType {
  const t = (text ?? "").trim();
  if (!t) return base;

  // 1️⃣ Greeting → FAST
  if (isGreeting(t)) {
    return "FAST";
  }

  // 2️⃣ 생성/설계/방법 질문 → SEARCH 금지
  if (hasGenerativeIntent(t) || hasHowIntent(t)) {
    return base === "DEEP" ? "DEEP" : "NORMAL";
  }

  // 3️⃣ 외부 탐색이 명확할 때만 SEARCH
  if (hasExternalSearchNeed(t)) {
    return "SEARCH";
  }

  // 4️⃣ 계산/증명 "행위"가 명확할 때만 DEEP 힌트
  if (hasProofLikeIntent(t)) {
    return "DEEP";
  }

  // 5️⃣ 비교/평가 → BENCH 힌트
  if (/(비교해|평가해|채점해|review|vs)/i.test(t)) {
    return "BENCH";
  }

  return base;
}

/* =========================
   Public API (SSOT)
========================= */

/**
 * 🔒 decidePath
 * - Router는 힌트만 제공
 * - Scheduler / Judgment가 최종 결정
 */
export function decidePath(
  input: NormalizedInput
): PathType {
  const text = input.content ?? "";
  const base: PathType = input.pathHint ?? "NORMAL";

  return inferPathFromText(text, base);
}
