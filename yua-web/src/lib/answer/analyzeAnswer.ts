// src/lib/answer/analyzeAnswer.ts

export type AnswerBodyType =
  | "paragraph"   // 자연어 문단 (YUA 기본)
  | "markdown"    // 구조적 마크다운
  | "code";       // 코드 중심

export type AnswerAnalysis = {
  /** 렌더링 전략 */
  bodyType: AnswerBodyType;

  /** 문단 분해 (paragraph 전용) */
  paragraphs: string[];

  /** 특징 플래그 */
  hasCode: boolean;
  hasInlineCode: boolean;
  hasList: boolean;
  hasHeader: boolean;
  hasBlockquote: boolean;
  hasLink: boolean;
  hasMath: boolean;

  /** 길이 판단 */
  charLength: number;
  paragraphCount: number;
  sentenceCount: number;

  /** YUA-style UX 판단 */
  isShortAnswer: boolean;
  isExpandable: boolean;
  isExplanationLike: boolean;
};


const REGEX = {
  fencedCode: /```[\s\S]*?```/g,
  inlineCode: /`[^`]+`/g,
  list: /^(\s*[-*+] |\s*\d+\. )/m,
  header: /^#{1,6}\s+/m,
  blockquote: /^>\s+/m,
  link: /\[.+?\]\(.+?\)/,
  mathInline: /(^|[^\\])\$(?!\s).+?(?<!\s)\$/,
  mathBlock: /\$\$[\s\S]+?\$\$/,
  sentence: /[.!?。！？]/g,
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function analyzeAnswer(content: string): AnswerAnalysis {
  const text = content ?? "";
  const trimmed = text.trim();

  const charLength = trimmed.length;
  const paragraphs = splitParagraphs(trimmed);

  const hasFencedCode = REGEX.fencedCode.test(trimmed);
  const hasInlineCode = REGEX.inlineCode.test(trimmed);
  const hasCode = hasFencedCode || hasInlineCode;

  const hasList = REGEX.list.test(trimmed);
  const hasHeader = REGEX.header.test(trimmed);
  const hasBlockquote = REGEX.blockquote.test(trimmed);
  const hasLink = REGEX.link.test(trimmed);
  const hasMath =
    REGEX.mathInline.test(trimmed) ||
    REGEX.mathBlock.test(trimmed);

  const sentenceCount =
    trimmed.match(REGEX.sentence)?.length ?? 0;

  const paragraphCount = paragraphs.length;

  /* =========================
     BODY TYPE 결정 (SSOT)
  ========================= */

  let bodyType: AnswerBodyType = "paragraph";

  if (hasFencedCode && !hasList && paragraphCount <= 2) {
    bodyType = "code";
  } else if (
    hasFencedCode ||
    hasList ||
    hasHeader ||
    hasBlockquote ||
    hasMath
  ) {
    bodyType = "markdown";
  }

  /* =========================
     YUA 스타일 UX 판단
  ========================= */

  const isShortAnswer =
    charLength < 120 && paragraphCount <= 1;

  const isExplanationLike =
    paragraphCount >= 2 && sentenceCount >= 3;

  const isExpandable =
    isShortAnswer ||
    (!hasCode && sentenceCount < 6) ||
    (paragraphCount === 1 && charLength < 300);

  return {
    bodyType,
    paragraphs,

    hasCode,
    hasInlineCode,
    hasList,
    hasHeader,
    hasBlockquote,
    hasLink,
    hasMath,

    charLength,
    paragraphCount,
    sentenceCount,

    isShortAnswer,
    isExpandable,
    isExplanationLike,
  };
}