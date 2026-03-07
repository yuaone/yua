// 📂 src/ai/code-ingest/code-focus-resolver.ts
// 🔥 CodeFocusResolver — 질문 기반 선택기 (SSOT 강화)
// - 단순 name 포함 → 스코어링 기반
// - 관련 블록 + 주변 심볼 + 파일 헤더(import/export) + 에러 라인 주변 포함
// - 중복 제거 + 최대 라인/문자 제한

import type { CodeIndex, CodeSymbol } from "./code-index-engine";

export interface CodeFocusResult {
  focusedCode: string;
  focusedSymbols: string[];
  strategy: "FULL" | "FOCUSED";
}

function extractSymbolHints(text: string): string[] {
  const candidates = text.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g);
  if (!candidates) return [];
  // keep order but dedupe
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

function countOccurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while (true) {
    const p = hay.indexOf(needle, i);
    if (p < 0) break;
    n++;
    i = p + needle.length;
  }
  return n;
}

function scoreSymbol(sym: CodeSymbol, question: string, hints: string[]): number {
  let score = 0;
  // direct mention
  if (hints.includes(sym.name)) score += 10;

  // frequency boost
  score += Math.min(8, countOccurrences(question, sym.name)) * 2;

  // exported symbols slightly more important
  if (sym.exported) score += 2;

  // type/class often central
  if (sym.type === "class" || sym.type === "interface" || sym.type === "type") score += 1;

  return score;
}

function pickTopSymbols(index: CodeIndex, question: string): CodeSymbol[] {
  const hints = extractSymbolHints(question);

  const scored = index.symbols
    .map((s) => ({ s, score: scoreSymbol(s, question, hints) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // top-k with cap
  return scored.slice(0, 6).map((x) => x.s);
}

function sliceLines(lines: string[], startLine: number, endLine: number): string {
  const s = Math.max(1, startLine);
  const e = Math.min(lines.length, endLine);
  return lines.slice(s - 1, e).join("\n");
}

export const CodeFocusResolver = {
  resolve(params: {
    code: string;
    index: CodeIndex;
    question: string;
    maxFocusLines?: number;
    maxFocusChars?: number;
  }): CodeFocusResult {
    const { code, index, question } = params;
    const lines = code.split("\n");

    const maxFocusLines = typeof params.maxFocusLines === "number" ? params.maxFocusLines : 900;
    const maxFocusChars = typeof params.maxFocusChars === "number" ? params.maxFocusChars : 140_000;

    const top = pickTopSymbols(index, question);

    // no match => keep FULL (SSOT: fallback is full, no slice)
    if (top.length === 0) {
      return {
        focusedCode: code,
        focusedSymbols: [],
        strategy: "FULL",
      };
    }

    // build ranges:
    // 1) header block (imports/exports/comments)
    // 2) each top symbol block
    // 3) neighbor symbols (closest above & below)
    type Range = { start: number; end: number; reason: string; key: string };
    const ranges: Range[] = [];

    const headerEnd = Math.max(1, Math.min(index.headerEndLine + 60, lines.length)); // extra headroom
    ranges.push({ start: 1, end: headerEnd, reason: "header", key: "header" });

    const byStart = [...index.symbols].sort((a, b) => a.startLine - b.startLine);

    function neighborOf(sym: CodeSymbol): CodeSymbol[] {
      const i = byStart.findIndex((x) => x.startLine === sym.startLine && x.name === sym.name);
      const out: CodeSymbol[] = [];
      if (i > 0) out.push(byStart[i - 1]);
      if (i >= 0 && i < byStart.length - 1) out.push(byStart[i + 1]);
      return out;
    }

    const picked = new Map<string, CodeSymbol>();
    for (const s of top) picked.set(`${s.name}:${s.startLine}`, s);
    for (const s of top) {
      for (const nb of neighborOf(s)) {
        picked.set(`${nb.name}:${nb.startLine}`, nb);
      }
    }

    const pickedList = [...picked.values()].sort((a, b) => a.startLine - b.startLine);

    for (const s of pickedList) {
      const pad = 8;
      const start = Math.max(1, s.startLine - pad);
      const end = Math.min(lines.length, s.endLine + pad);
      ranges.push({ start, end, reason: `symbol:${s.name}`, key: `${s.name}:${s.startLine}` });
    }

    // merge ranges
    ranges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last) {
        merged.push(r);
        continue;
      }
      if (r.start <= last.end + 1) {
        last.end = Math.max(last.end, r.end);
        last.reason = `${last.reason}+${r.reason}`;
      } else {
        merged.push(r);
      }
    }

    // materialize with caps
    const chunks: string[] = [];
    let usedLines = 0;
    let usedChars = 0;

    for (const r of merged) {
      const chunkLines = r.end - r.start + 1;
      if (usedLines + chunkLines > maxFocusLines) break;

      const body = sliceLines(lines, r.start, r.end);
      const block = `\n/* --- FOCUS RANGE: ${r.start}-${r.end} (${r.reason}) --- */\n${body}\n`;
      if (usedChars + block.length > maxFocusChars) break;

      chunks.push(block);
      usedLines += chunkLines;
      usedChars += block.length;
    }

    const focusedSymbols = top.map((s) => s.name);

    // if somehow nothing emitted, fallback full (never empty)
    const focusedCode = chunks.length > 0 ? chunks.join("\n") : code;

    return {
      focusedCode,
      focusedSymbols,
      strategy: chunks.length > 0 ? "FOCUSED" : "FULL",
    };
  },
};
