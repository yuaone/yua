// 🔒 IMAGE INTENT DETECTOR — SSOT
// 책임:
// - 텍스트 기반 이미지 생성 의도만 판별
// - 명시적 "생성 동사" + "시각적 명사" + "요청 종결형" 동시 요구
//
// 금지:
// - 확률/유사도/추론 ❌
// - 문맥 해석 ❌
// - 로그/설명 ❌

const VISUAL_NOUN_RE = new RegExp(
  [
    // Korean
    "(이미지|그림|사진|포토|일러스트|포스터|초상화|배경|썸네일|로고|아이콘|3d)",
    // English
    "\\b(image|picture|photo|illustration|poster|portrait|thumbnail|logo|icon)\\b",
  ].join("|"),
  "i"
);

const CREATION_VERB_RE = new RegExp(
  [
    // Korean explicit creation verbs
    "(그려|만들어|생성해|제작해|렌더해|출력해)",
    // English explicit creation verbs
    "\\b(draw|generate|create|render)\\b",
  ].join("|"),
  "i"
);

const REGEN_VERB_RE = new RegExp(
  [
    // Korean regeneration / transform verbs
    "(재생성|다시\\s*(만들|생성|그려)|변환(해|해줘)?|바꿔(줘)?)",
    // English regeneration verbs
    "\\b(regenerate|recreate|generate\\s*again)\\b",
  ].join("|"),
  "i"
);

const TRANSFORM_CONTEXT_RE = new RegExp(
  [
    // Korean
    "(느낌|스타일|버전|톤|컨셉)",
    // English
    "\\b(style|version|look|vibe)\\b",
  ].join("|"),
  "i"
);

// 🔒 요청 종결형만 허용 (단순 동사 어간은 불충분)
const IMPERATIVE_RE = new RegExp(
  [
    // Korean
    "(줘|해|해줘|해주세요|해 주세요)",
    // English (imperative marker)
    "\\b(please|now)\\b",
  ].join("|"),
  "i"
);

const FORBIDDEN_VERB_RE = new RegExp(
  [
    // Korean non-creation verbs
    "(설명|분석|보여|찾아|있어|비교|알려)",
    // English non-creation verbs / interrogatives
    "\\b(explain|describe|analyze|show|find|compare|is there)\\b",
  ].join("|"),
  "i"
);

function looksLikeEnglishImperative(text: string): boolean {
  // Sentence must start with imperative verb (no "how to", "can you explain", etc.)
  return /^\s*(draw|generate|create|render)\b/i.test(text);
}

// 🔒 SSOT: attachment-based transform intent (no visual noun required)
export function hasImageTransformIntentWithAttachment(message: string): boolean {
  if (typeof message !== "string") return false;
  const text = message.trim();
  if (!text) return false;

  const hasForbiddenVerb = FORBIDDEN_VERB_RE.test(text);
  if (hasForbiddenVerb) return false;

  const hasRegenVerb = REGEN_VERB_RE.test(text);
  const hasTransformContext = TRANSFORM_CONTEXT_RE.test(text);
  const hasImperative =
    IMPERATIVE_RE.test(text) || looksLikeEnglishImperative(text);

  return (hasRegenVerb || hasTransformContext) && hasImperative;
}

// 🔒 SSOT: strict verb-gated image generation intent
export function hasImageGenerationIntent(message: string): boolean {
  if (typeof message !== "string") return false;
  const text = message.trim();
  if (!text) return false;

  const hasForbiddenVerb = FORBIDDEN_VERB_RE.test(text);
  if (hasForbiddenVerb) return false;

  const hasVisualNoun = VISUAL_NOUN_RE.test(text);
  const hasCreationVerb = CREATION_VERB_RE.test(text);
  const hasImperative =
    IMPERATIVE_RE.test(text) || looksLikeEnglishImperative(text);

  return (
    hasVisualNoun &&
    hasCreationVerb &&
    hasImperative &&
    !hasForbiddenVerb
  );
}
