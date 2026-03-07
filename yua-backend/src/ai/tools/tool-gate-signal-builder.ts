// 📂 src/ai/tools/tool-gate-signal-builder.ts
// 🔒 Tool Gate Signal Builder (SSOT — INTENT AWARE)

import type { ToolGateSignals } from "./tool-types";
import type { DecisionInputContext } from "../decision-assistant/decision-input-context";
import { extractMarketInput } from "./input-extractor";

export function buildToolGateSignals(args: {
  inputContext: DecisionInputContext;
  content: string;
  anchorConfidence: number;
  executionTask?: string;
  traceId?: string;
  timeAxis?: "PAST" | "PRESENT" | "FUTURE" | "UNKNOWN";
}): ToolGateSignals {
  const { inputContext, content, anchorConfidence } = args;

  /* -----------------------------
   * Code / Log Strip
   * ----------------------------- */

  function stripCodeAndLogs(text: string): string {
    let t = text ?? "";

    // 1) fenced code 제거
    t = t.replace(/```[\s\S]*?```/g, "");

    // 2) inline code 제거
    t = t.replace(/`[^`]+`/g, "");

    // 3) stack trace 제거
    t = t.replace(/^\s*at\s.+$/gm, "");

    // 4) 로그 라인 제거
    t = t.replace(
      /^\s*\[(INFO|WARN|DEBUG|ERROR)[^\]]*\].*$/gim,
      "",
    );

    const lines = t.split(/\r?\n/);

    const filtered = lines.filter((line) => {
      const s = line.trim();
      if (!s) return false;

      // 전형적인 코드 키워드
      if (
        /^(import|export|const|let|var|function|class|interface|type|enum|namespace)\b/.test(
          s,
        )
      ) {
        return false;
      }

      const letters = (s.match(/[a-zA-Z가-힣]/g) ?? []).length;
      const symbols = (s.match(/[{}()[\];=<>:+\-*/\\|.,]/g) ?? []).length;
      const digits = (s.match(/[0-9]/g) ?? []).length;

      if (letters === 0 && (symbols > 0 || digits > 0)) return false;
      if (symbols > letters * 2) return false;

      return true;
    });

    return filtered.join("\n").trim();
  }

  function isMostlyNaturalLanguage(text: string): boolean {
    const s = (text ?? "").trim();
    if (!s) return false;

    const letters = (s.match(/[a-zA-Z가-힣]/g) ?? []).length;
    const symbols = (s.match(/[{}();=<>]/g) ?? []).length;

    if (letters === 0) return false;

    return letters >= Math.max(3, symbols);
  }

  function hasUrl(text: string): boolean {
    const s = text ?? "";
    return (
      /\bhttps?:\/\/[^\s]+/i.test(s) ||
      /\bwww\.[^\s]+/i.test(s)
    );
  }

  function hasRecencyOrFutureCue(text: string): boolean {
    const s = (text ?? "").toLowerCase();

    return (
      /(최신|최근|방금|지금|현재|오늘|어제|내일|모레|이번\s?주|다음\s?주|이번\s?달|다음\s?달|올해|내년|이번\s?분기|다음\s?분기)/.test(
        s,
      ) ||
      /\b(latest|recent|today|now|current|this week|next week|tomorrow|yesterday)\b/.test(
        s,
      )
    );
  }

  const cleanText = stripCodeAndLogs(content);
  const isNatural = isMostlyNaturalLanguage(cleanText);

  /* -----------------------------
   * Capability / Design 차단
   * ----------------------------- */

  const isCapabilityQuestion =
    /가능해|할수있어|되나|볼수있어|알수있어|can\s+i|is\s+it\s+possible/i.test(
      content,
    );

  const isDesignQuestion =
    /아키텍처|architecture|orchestrator|오케스트레이터|설계|구조|코어|분리/i.test(
      content,
    );

  /* -----------------------------
   * Explicit Search Intent
   * ----------------------------- */

  const explicitBase =
    cleanText.length > 0 ? cleanText : content;

  const hasExplicitSearchIntent =
    /(검색(해|하고|해서|한\s?뒤)?|검색\s?좀|검색해줘|찾아(봐|줘)?|웹\s?검색|최근\s?뉴스|최신\s?자료|look\s?up|search\s?for|browse)/i.test(
      explicitBase,
    ) &&
    (isNatural ||
      explicitBase.length < 40 ||
      /[가-힣]/.test(explicitBase));

  /* -----------------------------
   * Market Intent
   * ----------------------------- */

  const marketInput = extractMarketInput(content);

  const hasSymbolHint =
    Array.isArray(marketInput?.symbolHints) &&
    marketInput.symbolHints.length > 0;

  const hasDateHint = Boolean(marketInput?.dateHint);

  const hasMarketKeyword =
    /주가|시세|종가|거래량|stock|market|price/i.test(
      content,
    );

  const hasEventPattern =
    /거래량|갭|전일|패턴|event|급등|급락/i.test(
      content,
    );

  let hasMarketIntent = false;

  if (hasSymbolHint && hasDateHint) hasMarketIntent = true;
  if (hasMarketKeyword) hasMarketIntent = true;
  if (hasEventPattern) hasMarketIntent = true;

  if (isCapabilityQuestion || isDesignQuestion) {
    hasMarketIntent = false;
  }

  /* -----------------------------
   * Implicit Search Need
   * ----------------------------- */

  const timeAxis = args.timeAxis ?? "UNKNOWN";

  const hasImplicitSearchNeed =
    hasMarketIntent &&
    !isCapabilityQuestion &&
    !isDesignQuestion &&
    (hasRecencyOrFutureCue(cleanText) ||
      timeAxis === "FUTURE" ||
      timeAxis === "PRESENT" ||
      hasDateHint);

  const hasSearchIntent =
    hasExplicitSearchIntent || hasImplicitSearchNeed;

  /* -----------------------------
   * Confidence
   * ----------------------------- */

  const baseConfidence = hasMarketIntent
    ? Math.min(1, anchorConfidence + 0.15)
    : anchorConfidence;

  /* -----------------------------
   * Risk
   * ----------------------------- */

  let risk = 0.1;

  if (inputContext.hasSensitiveKeyword) {
    risk =
      inputContext.decisionDomain === "CODE"
        ? 0.75
        : 0.55;
  }

  return {
    domain: inputContext.decisionDomain,
    path: inputContext.suggestedPath,
    executionTask: args.executionTask,
    baseConfidence,
    risk,

    hasMarketIntent,
    hasEventPattern,

    hasMathExpression:
      /[0-9]+\s*[\+\-\*\/\^]\s*[0-9]+/.test(content) ||
      /=/.test(content),

    hasScientificPattern:
      /\b(diff|integrate|matrix|vector|probability|variance|mean)\b/i.test(
        content,
      ),

    hasSensitiveKeyword:
      inputContext.hasSensitiveKeyword,

    hasCodeBlock: inputContext.hasCodeBlock,
    hasUrl: hasUrl(content),
    hasSearchIntent,
  };
}