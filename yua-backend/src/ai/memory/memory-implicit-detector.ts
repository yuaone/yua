import type { MemoryCandidateScope } from "./memory-candidate.type";

export type ImplicitMemoryCategory =
  | "USER_FACT"
  | "USER_PREFERENCE"
  | "PROJECT_DECISION"
  | "CORRECTION"
  | "NONE";

export interface ImplicitMemoryResult {
  category: ImplicitMemoryCategory;
  confidence: number;
  extractedContent: string;
  scope: MemoryCandidateScope;
}

const NONE_RESULT: ImplicitMemoryResult = {
  category: "NONE",
  confidence: 0,
  extractedContent: "",
  scope: "general_knowledge",
};

// Negative filters
const FILLER_RE = /^[ㅋㅎ]+$/;
const SHORT_FILLER_RE =
  /^(ㅇㅇ|ㄴㄴ|응|아|오케이|ok|lol|haha|ㄱㄱ|ㅅㄱ)$/i;
const GREETING_RE = /^(안녕|반가워|hi|hello|hey)\s*[!.]*$/i;
const TEMPORAL_ONLY_RE = /^(오늘|지금|방금).*(날씨|몇시|뉴스)/;
const PURE_QUESTION_RE = /^[^.!]*\?$/;

// USER_FACT patterns
const FACT_PATTERNS: RegExp[] = [
  /나(?:는|)\s*.*(있어|갖고|보유|샀어|사놨어)/,
  /나(?:는|)\s*.*(이야|이에요|입니다)/,
  /나\s*.*(살아|살고|다녀|졸업|전공)/,
  /\bI\s+(have|own|bought|hold)\b/i,
  /\bI\s+am\b/i,
  /\bmy\s+\w+\s+is\b/i,
  /\bI\s+(live|work at|graduated|majored)\b/i,
];

// USER_PREFERENCE patterns
const PREFERENCE_PATTERNS: RegExp[] = [
  /(?:로|으로)\s*(?:짜줘|해줘|만들어줘|작성해줘)/,
  /(?:스타일은|방식은|톤은)/,
  /(?:코드는|답변은|설명은)\s*.*(?:로|으로|하게)/,
  /(?:하지마|쓰지마|사용하지마)/,
  /\buse\s+\w+\s+for\b/i,
  /\balways\b/i,
  /\bdon'?t\s+use\b/i,
  /\bnever\b/i,
];

// PROJECT_DECISION patterns
const DECISION_PATTERNS: RegExp[] = [
  /(?:로\s*가자|로\s*하자|로\s*결정|확정)/,
  /(?:구조는|아키텍처는|스택은)\s*.*(?:로|으로)/,
  /\blet'?s\s+go\s+with\b/i,
  /\bwe'?ll\s+use\b/i,
];

// CORRECTION patterns
const CORRECTION_PATTERNS: RegExp[] = [
  /아니야|아닌데|그게\s*아니라|틀렸어/,
  /^아니[,\s]/,
  /\bno\s+actually\b/i,
  /\bthat'?s\s+wrong\b/i,
];

interface CategorySpec {
  category: Exclude<ImplicitMemoryCategory, "NONE">;
  patterns: RegExp[];
  baseConfidence: number;
  scope: MemoryCandidateScope;
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    category: "PROJECT_DECISION",
    patterns: DECISION_PATTERNS,
    baseConfidence: 0.85,
    scope: "project_decision",
  },
  {
    category: "USER_FACT",
    patterns: FACT_PATTERNS,
    baseConfidence: 0.8,
    scope: "user_profile",
  },
  {
    category: "USER_PREFERENCE",
    patterns: PREFERENCE_PATTERNS,
    baseConfidence: 0.75,
    scope: "user_preference",
  },
  {
    category: "CORRECTION",
    patterns: CORRECTION_PATTERNS,
    baseConfidence: 0.75,
    scope: "general_knowledge",
  },
];

function isNegativeFilter(msg: string): boolean {
  if (msg.length < 5) return true;
  if (FILLER_RE.test(msg)) return true;
  if (SHORT_FILLER_RE.test(msg)) return true;
  if (GREETING_RE.test(msg)) return true;
  if (TEMPORAL_ONLY_RE.test(msg)) return true;
  if (PURE_QUESTION_RE.test(msg) && !/[.!]/.test(msg)) return true;
  return false;
}

function countMatches(patterns: RegExp[], msg: string): number {
  let count = 0;
  for (const p of patterns) {
    if (p.test(msg)) count++;
  }
  return count;
}

export function detectImplicitMemory(message: string): ImplicitMemoryResult {
  const trimmed = message.trim();
  if (isNegativeFilter(trimmed)) return NONE_RESULT;

  let bestSpec: CategorySpec | null = null;
  let bestMatchCount = 0;

  for (const spec of CATEGORY_SPECS) {
    const matches = countMatches(spec.patterns, trimmed);
    if (matches > 0 && matches > bestMatchCount) {
      bestMatchCount = matches;
      bestSpec = spec;
    }
  }

  if (!bestSpec) return NONE_RESULT;

  return {
    category: bestSpec.category,
    confidence: bestSpec.baseConfidence,
    extractedContent: trimmed,
    scope: bestSpec.scope,
  };
}
