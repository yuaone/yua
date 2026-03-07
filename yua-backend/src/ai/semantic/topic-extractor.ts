// 🔥 YUA Topic Extractor — Deterministic Semantic Core
// ------------------------------------------------------
// 목적:
// - 하드코딩 키워드 제거
// - 의미 기반 topic 추출
// - LLM 없이 동작
// - thread activeTopic 안정화
//
// SSOT:
// - Topic은 intent가 아니다.
// - Topic은 "의미 중심 단어 집합"이다.
// - 유사도 기반 유지/교체 결정.
//

export type ExtractedTopic = {
  topicKey: string;
  tokens: string[];
};

const MIN_TOKEN_LENGTH = 2;
const SIMILARITY_THRESHOLD = 0.42;

// 불필요 기능어 제거 (언어 중립 최소 세트)
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "이",
  "그",
  "저",
  "것",
  "수",
  "좀",
  "좀더",
  "그리고",
  "근데",
  "그래서",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(
      (t) =>
        t.length >= MIN_TOKEN_LENGTH &&
        !STOPWORDS.has(t)
    );
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...a, ...b]);

  if (union.size === 0) return 0;

  return intersection.length / union.size;
}

export function extractTopicDeterministic(params: {
  message: string;
  previousTopic?: string | null;
}): ExtractedTopic {
  const { message, previousTopic } = params;

  const tokens = tokenize(message);

  if (!previousTopic) {
    return {
      topicKey: tokens.slice(0, 5).join("_") || "general",
      tokens,
    };
  }

  const previousTokens = tokenize(previousTopic);

  const similarity = jaccard(tokens, previousTokens);

  if (similarity >= SIMILARITY_THRESHOLD) {
    return {
      topicKey: previousTopic,
      tokens: previousTokens,
    };
  }

  return {
    topicKey: tokens.slice(0, 5).join("_") || "general",
    tokens,
  };
}