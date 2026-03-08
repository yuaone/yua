// src/renderer/lib/answer/analyzeAnswer.ts
// Ported from yua-web/src/lib/answer/analyzeAnswer.ts

export type AnswerBodyType =
  | "paragraph"
  | "markdown"
  | "code";

export type AnswerAnalysis = {
  bodyType: AnswerBodyType;
  paragraphs: string[];

  hasCode: boolean;
  hasInlineCode: boolean;
  hasList: boolean;
  hasHeader: boolean;
  hasBlockquote: boolean;
  hasLink: boolean;
  hasMath: boolean;

  charLength: number;
  paragraphCount: number;
  sentenceCount: number;

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
