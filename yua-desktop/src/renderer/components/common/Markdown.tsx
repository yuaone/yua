    import React from "react";
    import { useEffect, useMemo } from "react";
    import { useRef } from "react";
    import ReactMarkdown from "react-markdown";
    import _remarkGfm from "remark-gfm";
    import _remarkMath from "remark-math";
    import _rehypeKatex from "rehype-katex";

// Cast to any to work around unified ecosystem Pluggable type mismatch
const remarkGfm = _remarkGfm as any;
const remarkMath = _remarkMath as any;
const rehypeKatex = _rehypeKatex as any;
    import type { Components } from "react-markdown";
    import { CodeBlock } from "./CodeBlock";
import { emojiVariants } from "../../lib/thoughtStageEmojiVariants";
import type { ThoughtStage } from "../../lib/thoughtStage";

const MermaidRenderer = React.lazy(() => import("./MermaidRenderer"));
import { emojiMap } from "../../lib/thoughtStage";
    /* =========================
      Math Detection
    ========================= */

    /* =========================
      Normalize Math
    ========================= */

  function protectFencedBlocks(input: string) {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const blocks: string[] = [];
  let buf: string[] = [];
  let inFence = false;

  const flushBlock = () => {
    const idx = blocks.length;
    blocks.push(buf.join("\n"));
    out.push(`__FENCE_BLOCK_${idx}__`);
    buf = [];
  };

  for (const line of lines) {
     if (/^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(line)) {
      buf.push(line);
      inFence = !inFence;
      if (!inFence) flushBlock();
      continue;
    }
    if (inFence) {
      buf.push(line);
      continue;
    }
    out.push(line);
  }

  if (buf.length) flushBlock();
  return { text: out.join("\n"), blocks };
}

function restoreFencedBlocks(input: string, blocks: string[]) {
  return (input ?? "").replace(
    /^__FENCE_BLOCK_(\d+)__$/gm,
    (_m, n) => blocks[Number(n)] ?? ""
  );
}

    function normalizeChatParagraphs(input: string): string {
    const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];

    let inFence = false;
    let inMath = false;


    const isFence = (s: string) => /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(s);
    const isMathDelim = (s: string) => /^\s*\$\$\s*$/.test(s);

 const isBlockLine = (s: string) =>
   /^(\s*)(```|#{1,6}\s|>|\- |\* |\||\d{1,2}[\.\)]?\s+)/.test(s.trim())
   || /^\d+\s*단계[:.\-]?\s*/.test(s.trim())  // 🔥 여기 추가
   || /^\//.test(s)
   || /[↓→⇒├└│]/.test(s);

    const isPlain = (s: string) => s.trim() !== "" && !isBlockLine(s);

    const lastOutLine = () => {
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i] !== "") return out[i];
      }
      return "";
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/\s+$/g, "");
      const trimmed = line.trim();

      // fence toggle
      if (isFence(trimmed)) {
        out.push(line);
        inFence = !inFence;
        continue;
      }

      // $$ toggle (fence 밖에서만)
      if (!inFence && isMathDelim(trimmed)) {
        out.push("$$");
        inMath = !inMath;
        continue;
      }

      if (inFence || inMath) {
        out.push(raw);
        continue;
      }

      if (trimmed === "") {
        out.push("");
        continue;
      }

      // ✅ "요약: 내용" 같은 라벨을 구조로 분리 (대화마다 형식이 달라도 안정)
      const label = trimmed.match(/^(요약|결론|핵심|정리|주의|중요)\s*[:：]\s*(.+)$/);
      if (label) {
        const prev = lastOutLine();
        if (prev && isPlain(prev)) out.push("");
        out.push(`**${label[1]}:**`);
        out.push("");
        out.push(label[2]);
        continue;
      }

// ✅ 문장 종료 기반 문단 분리 (줄 단위 폭주 방지)
const prev = lastOutLine();

const endsLikeSentence =
  prev &&
  /(\.|다\.|\?|!|…|。)$/.test(prev.trim());

if (
  prev &&
  isPlain(prev) &&
  isPlain(line) &&
  endsLikeSentence&&
  !/^#{1,6}\s/.test(prev.trim())
) {
  out.push("");
}

// 🔥 숫자 리드 시작 시 무조건 문단 분리 (branch 보호)
 if (
   prev &&
   /^\d{1,2}[\.\)]?\s+/.test(trimmed)
 ) {
   out.push("");
 }


      // ✅ 콜론 종료 후 리스트/번호 시작 시 강제 문단 분리
      const endsWithColon =
        prev && /[:：]\s*$/.test(prev.trim());

      const startsLikeList =
        /^([-*]\s|✅)/.test(trimmed);

      if (
        prev &&
        isPlain(prev) &&
        isPlain(line) &&
        endsWithColon &&
        startsLikeList
      ) {
        out.push("");
      }

      out.push(line);
    }

    return out.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  /**
 * 🔒 Branch Lead Normalize (SSOT)
 * - "1. 제목", "1) 제목"을 Markdown <ol>로 파싱되지 않게
 *   "1 제목"으로 변환하여 항상 <p>로 들어오게 만든다.
 */

function hashToInt(s: string) {
  let h = 0;
  for (const ch of s) {
    h = (h * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  }
  return Math.abs(h);
}

function pickStageEmoji(
  stage: ThoughtStage,
  seed?: string
) {
  const variants = emojiVariants[stage];
  if (!variants || variants.length === 0) return undefined;

  const key = seed ? `${stage}:${seed}` : stage;
  const h = hashToInt(key);
  return variants[h % variants.length];
}

function normalizeBranchLeadLines(input: string): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let inFence = false;
  let lastLineWasComplete = true;

const isFence = (s: string) => /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(s);
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const t = line.trim();

    if (isFence(t)) {
      out.push(line);
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      out.push(raw);
      continue;
    }

    if (/^(\s*)(\d{1,2})[\.\)]\s+/.test(line)) {
      out.push(line.replace(/^(\s*)(\d{1,2})[\.\)]\s+/, "$1$2 "));
      continue;
    }

 // 🔥 "1단계:" 형태도 강제 p로 유지
 if (/^\s*\d+\s*단계[:.\-]?\s*/.test(line)) {
   out.push(line);
   continue;
}

    out.push(line);
  }

  const result = out.join("\n");
  return result;
}
function shallowSourcesEqual(
  a?: { id: string }[],
  b?: { id: string }[]
) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
  }

  return true;
}
  /**
     * 🔒 Fence 안정화 (SSOT)
     * - 기존 normalizeCodeFence의 /\n```([^\n])?/ 는 "```diff" → "```" + "iff"로 깨뜨리는 버그가 있음
     * - fence는 라인 기반 토글로 안전하게 정규화 (언어 지정 보존)
     * - streaming 중 fence 미완성(odd count)도 렌더링만 안정화 (임시 close)
     */
function normalizeTripleBackticks(
  input: string,
  streaming: boolean
): string {
  const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // ✅ fence는 "라인 전체가 ``` 또는 ```lang"일 때만 인정
    const isFenceLine = /^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(line);

    if (isFenceLine) {
      out.push(line);
      inFence = !inFence;
      continue;
    }

    // 🔒 코드블록 내부는 절대 변형 금지
    if (inFence) {
      out.push(raw);
      continue;
    }

    out.push(raw);
  }

  // 🚫 streaming 중에는 강제 close 절대 금지
  if (!streaming && inFence) {
    out.push("```");
  }

  return out.join("\n");
}



    function normalizeSoftWrap(input: string): string {
    const lines = (input ?? "").replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];
    let buf: string[] = [];

    const flush = () => {
      if (buf.length) out.push(buf.join(" "));
      buf = [];
    };

  const isBlockLine = (s: string) =>
    /^(\s*)(```|#{1,6}\s|>|\- |\* |\||\d{1,2}[\.\)]?\s+)/.test(s)
    || /^\d+\s*단계\s*[:\-]/.test(s)  // 🔥 단계 보호
    || /[↓→⇒├└│]/.test(s);
    for (const raw of lines) {
      const line = raw.trimEnd();

      if (line.trim() === "") {
        flush();
        out.push("");
        continue;
      }

      if (isBlockLine(line)) {
        flush();
        out.push(raw);
        continue;
      }

      buf.push(line.trim());
    }

    flush();
    return out.join("\n");
  }

function normalizeCodeFenceSafe(input: string) {
  const pre = (input ?? "").replace(/｀/g, "`");
  const { text, blocks } = protectFencedBlocks(pre);

  const out = text
      /* =========================
        🔥 INPUT NORMALIZE (FINAL SSOT)
        - 모바일 / 노션 / 카톡 / iOS 메모 대응
        - Markdown 파서 이전, 문자 레벨만 처리
      ========================= */
    
      // 🔥 stray token cleanup (wto / Wto / WTO)

      /* --- 전각 숫자 → ASCII --- */
      .replace(/[０-９]/g, (d) =>
        String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30)
      )

      /* --- 전각 괄호 --- */
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/［/g, "[")
      .replace(/］/g, "]")
      .replace(/｛/g, "{")
      .replace(/｝/g, "}")

      /* --- 전각 연산 / 비교 --- */
      .replace(/＋/g, "+")
      .replace(/－|−/g, "-") // 유니코드 마이너스 포함
      .replace(/＝/g, "=")
      .replace(/／/g, "/")
      .replace(/＜/g, "<")
      .replace(/＞/g, ">")

      /* --- Markdown 핵심 기호 --- */
      .replace(/＊/g, "*")   // bold / italic
      .replace(/＃/g, "#")
      // ✅ ATX heading space 보정: "##Title" -> "## Title"
.replace(/(^|\n)(\s*)(#{1,6})([^\s#])/g, (m, p1, p2, hashes, nextChar) => {
  // 🔒 숫자 뒤의 "# "는 heading으로 보지 않음
  if (/\d\s*$/.test(p2)) return m;
  return `${p1}${p2}${hashes} ${nextChar}`;
})
      // ✅ 여러 공백/탭은 1개로 정리
      // fullwidth backtick normalized before fence protection

      /* --- 스마트 따옴표 / 문장부호 --- */
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/…/g, "...")
      .replace(/[—–]/g, "--")

    // 🔒 fence는 상태기계로 정규화 (diff → iff 같은 파손 방지)
   return restoreFencedBlocks(out, blocks);
      
    }

    function normalizeHumanMath(input: string): string {
      if (!input) return input;


        /**
       * ✅ 제거 버전 (SSOT)
       * - 본문을 "수학으로 승격"하거나 `$...$`를 새로 만들지 않는다 (본문/DOM 깨짐 원인 제거)
       * - 레거시 W-escape만 복구한다 (ex: Wfrac → \frac, W( → \(, )W → \))
       * - 코드펜스/인라인코드는 끝까지 보호한다
       */

  // 🔒 fence 보호 (스트리밍 대응)
  const { text: fencedText, blocks } = protectFencedBlocks(input ?? "");
  let working = fencedText;

      const INLINE_CODE_TOKEN = "__YUA_INLINE_CODE__";
      const inlineCodes: string[] = [];
      working = working.replace(/`[^`]+`/g, (m) => {
        inlineCodes.push(m);
        return `${INLINE_CODE_TOKEN}${inlineCodes.length - 1}${INLINE_CODE_TOKEN}`;
      });

      // 2) 레거시 수학 delimiter 복구: W( ... )W, W[ ... ]W
      //    ⚠️ 절대 제거하지 말 것 (이게 사라지면 "수학이 평문으로 풀려" 본문이 깨짐)
      working = working
        .replace(/W\(/g, "\\(")
        .replace(/\)W/g, "\\)")
        .replace(/W\[/g, "\\[")
        .replace(/\]W/g, "\\]");
// 🔥 KaTeX block 승격
working = working
  .replace(/^\\\[\s*$/gm, "$$")
  .replace(/^\\\]\s*$/gm, "$$");
      // 3) 레거시 W-접두 LaTeX 커맨드 복구 (allowlist만)
 const SAFE_LATEX = [
   "frac",
   "sqrt",
   "left",
   "right",
   "cdot",
   "times",
   "le",
   "ge",
   "neq",
   "Rightarrow",
 ];

 working = working.replace(
   /\bW([A-Za-z]+)\b/g,
   (_m, name) =>
     SAFE_LATEX.includes(name)
       ? `\\${name}`
       : `W${name}` // 안전하지 않으면 그대로 둠
 );

      // 4) dangling suffix: 3W → 3 (레거시 찌꺼기)
      working = working.replace(/([0-9a-zA-Z])W\b/g, "$1");

      // 5) 코드 영역 복원
      working = working.replace(
        new RegExp(`${INLINE_CODE_TOKEN}(\\d+)${INLINE_CODE_TOKEN}`, "g"),
        (_m, idx) => inlineCodes[Number(idx)] ?? _m
      );
      working = restoreFencedBlocks(working, blocks);

      return working;
    }


    function normalizeMathDelimiters(input: string): string {
      if (!input) return input;

      const lines = input.replace(/\r\n/g, "\n").split("\n");

      const out: string[] = [];
      let inMathBlock = false;


      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === "$$") {
          inMathBlock = !inMathBlock;
          out.push("$$");
          continue;
        }

        if (inMathBlock) {
          out.push(rawLine);
          continue;
        }

        if (line === "\\[" || line === "\\]") {
          out.push("$$");
          continue;
        }


      // ✅ Chat SSOT: 줄 단위 block math 승격 절대 금지
  out.push(rawLine);
      }

      return out.join("\n");
    }



    /* =========================
      Types
    ========================= */


 // =========================
 // Streaming Block Parser (SSOT)
 // - 완성된 블록은 재파싱 금지
 // - 마지막 열려있는 블록만 streaming 갱신
 // =========================
 type StreamBlock =
   | { id: string; kind: "md"; text: string; pending?: string }
   | { id: string; kind: "code"; lang?: string; text: string; pending?: string; closed?: boolean }
   | { id: string; kind: "table"; lines: string[]; confirmed: boolean; pending?: string }
   | { id: string; kind: "branch"; badge: string; title: string; level: "major" | "section" };

 type StreamParserState = {
   source: string;
   blocks: StreamBlock[];
   mode: "normal" | "code" | "table";
   mathMode: boolean;
   pendingLine: string;
   branchIndex: number;
   asciiGroup: boolean
   dirGroup: boolean
   nextId: number;
   openFenceTicks: number | null;
   pendingCodeLang?: string | null;   // 🔥 추가
 };

 function createStreamParser(): StreamParserState {
   return {
     source: "",
     blocks: [],
     mode: "normal",
     mathMode: false,
     pendingLine: "",
     branchIndex: 0,
     nextId: 0,
     asciiGroup: false,
     dirGroup: false,
     openFenceTicks: null,
     pendingCodeLang: null,  // 🔥 추가
   };
 }

 function ingestDelta(state: StreamParserState, delta: string) {
   const buf = state.pendingLine + delta;


 const parts = buf.split("\n");
 state.pendingLine = parts.pop() ?? "";

 for (const line of parts) {
   processLine(state, line);
 }

   // 마지막 미완 라인(토큰이 줄바꿈 없이 쌓이는 중)을 pending으로 노출
   syncPending(state);
 }

 function syncPending(state: StreamParserState) {
   const pending = state.pendingLine ?? "";
  // ✅ SSOT: pending은 마지막 블록 1개에만 존재해야 함.
  // (코드블록 오픈 순간 last가 바뀌면, 이전 md.pending이 남아서 "코드블록 위 한 줄"이 중복됨)
  for (const b of state.blocks) {
    if ("pending" in (b as any)) (b as any).pending = "";
  }

  const t = pending.trim();
  // 🔒 fence 조각("```py" 같은 미완) 노출 금지 (특히 code open 직전 깜빡임 방지)
  if (state.mode !== "code" && t.startsWith("```")) return;
  // 🔒 fence 단독 라인은 pending으로 노출 금지
  if (/^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(t)) return;

  const last = state.blocks[state.blocks.length - 1];
  if (!last) return;
  if (last.kind === "md" || last.kind === "code" || last.kind === "table") {
    (last as any).pending = pending;
  }
 }



// -------------------------
// TABLE helpers (SSOT)  ✅ module-scope (렌더에서도 사용 가능)
// -------------------------
function countChar(s: string, ch: string) {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) c++;
  return c;
}

// 테이블 "행" 후보: 파이프 2개 이상 + 앞뒤 공백/문장형 오탐 줄이기
function looksLikeTableRow(line: string) {
  const t = line.trim();
  if (!t) return false;
  // 코드/인용/리스트 시작은 테이블로 안 봄
  if (/^(```|>|#{1,6}\s|[-*]\s|\d+\.\s)/.test(t)) return false;
 const pipes = countChar(t, "|");
 if (pipes < 2) return false;


  // "a|b" 같은 문장 오탐 방지: 파이프 주변 공백이 하나라도 있으면 가산점
  const hasSpacedPipe = /\s\|\s|\|\s|\s\|/.test(t);
  if (!hasSpacedPipe && pipes === 2 && t.length < 16) return false;
  return true;
}

function isTableSeparator(line: string) {
  // | --- | --- |, ---|--- 패턴 허용
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

// ✅ confirmed 이후에는 시작 조건을 더 완화(이미 테이블임이 확정되었으므로)
function looksLikeTableRowConfirmed(line: string) {
  const t = line.trim();
  if (!t) return false;
  // 빈 줄/코드펜스 시작/헤딩 등은 테이블에서 탈출 트리거로 쓰기 위해 false
  if (/^(```|#{1,6}\s|>)/.test(t)) return false;
  const pipes = countChar(t, "|");
  return pipes >= 2; // 확정 후에는 edge pipe 강제 안 함
}

export function normalizeTableLine(line: string) {
  // 앞뒤 파이프 없으면 붙여서 렌더 안정화
  const t = line.trimEnd();
  const hasAnyPipe = t.includes("|");
  if (!hasAnyPipe) return t;
  const left = /^\s*\|/.test(t);
  const right = /\|\s*$/.test(t);
  if (left && right) return t;
  if (!left && !right) return `| ${t} |`;
  if (!left) return `| ${t}`;
  return `${t} |`;
}

function makeSeparatorForHeader(headerLine: string) {
  // 헤더 열 개수 기준으로 --- separator 생성
  const t = headerLine.trim();
  const cells = t
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  const n = Math.max(1, cells.length);
  return `| ${Array.from({ length: n }).map(() => "---").join(" | ")} |`;
}

 function processLine(state: StreamParserState, line: string) {
   const trimmed = line.trim();

  // =========================
  // 🔥 single "$" 줄을 block math로 흡수
  // "$" 한 줄 나오면 $$처럼 처리
  // =========================
  if (trimmed === "$") {
    state.mathMode = !state.mathMode;

    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = { id: `b${state.nextId++}`, kind: "md", text: "" };
      state.blocks.push(last);
    }

    last.text += "$$\n";
    return;
  }

  // =========================
  // 🔒 BLOCK MATH ( $$ )
  // - 반드시 하나의 md 블록에 유지
  // =========================
  if (trimmed === "$$") {
    state.mathMode = !state.mathMode;

    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = { id: `b${state.nextId++}`, kind: "md", text: "" };
      state.blocks.push(last);
    }

    last.text += "$$\n";
    return;
  }

  if (state.mathMode) {
    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = { id: `b${state.nextId++}`, kind: "md", text: "" };
      state.blocks.push(last);
    }

    last.text += line + "\n";
    return;
  }
   // -------------------------
   // 1) CODE FENCE (```lang)
   // -------------------------


const fenceMatch = trimmed.match(/^(\s*)(`{3,})([a-zA-Z0-9_-]*)\s*$/);

if (fenceMatch) {
  const ticks = fenceMatch[2].length;
  const lang = (fenceMatch[3] || "").toLowerCase();

   // ✅ close fence인데 현재 code 모드가 아니면 무시
  if (state.mode !== "code" && !lang) {
    return;
  }

  if (state.mode === "normal") {
    // 🔒 fence open
    state.mode = "code";
    state.openFenceTicks = ticks;
    state.pendingCodeLang = lang || null;
    state.pendingLine = "";

    state.blocks.push({
      id: `b${state.nextId++}`,
      kind: "code",
      lang: state.pendingCodeLang || undefined,
      text: "",
      closed: false,
    });
    return;
  }

  // ✅ CommonMark: closing fence는 open 이상 ticks면 닫힘.
  // (model이 ```` 로 닫으면 기존 equality는 안 닫혀서 아래 텍스트가 code로 빨려들어감)
  if (state.mode === "code" && !lang && state.openFenceTicks != null && ticks >= state.openFenceTicks) {
    const last = state.blocks[state.blocks.length - 1];
    if (last?.kind === "code" && last.text.trim() === "") {
      state.blocks.pop();
    } else if (last?.kind === "code") {
      last.closed = true;
    }

    // 🔒 fence close
    state.mode = "normal";
    state.openFenceTicks = null;
    state.pendingCodeLang = null;
    return;
  }
}
if (state.mode === "code") {
  const last = state.blocks[state.blocks.length - 1];
  if (last?.kind === "code") {
 last.text += line + "\n";
}
  return;
}

// -------------------------
// DIRECTORY TREE DETECT (GROUP SAFE)
// -------------------------

const TREE_EXT =
  "(?:ts|js|tsx|jsx|json|md|py|go|rs|java|cpp|c|h|hpp|yaml|yml)";

// trailing comment 제거
const treeCore = trimmed.replace(/\s+\/\/.*$/, "");

const isTreeDir =
  new RegExp(`^[\\w.-]+(?:\\/[\\w.-]+)*\\/$`).test(treeCore);

const isTreeFile =
  new RegExp(`^[\\w.-]+(?:\\/[\\w.-]+)*\\.${TREE_EXT}$`).test(treeCore);

const isDirectoryTreeLine = isTreeDir || isTreeFile;

const appendToDirBlock = () => {
  const last = state.blocks[state.blocks.length - 1];

  if (last && last.kind === "code" && !last.lang) {
    last.text += line + "\n";
  } else {
    state.blocks.push({
      id: `b${state.nextId++}`,
      kind: "code",
      lang: "",
      text: line + "\n",
      closed: true,
    });
  }
};

// 이미 디렉토리 트리 그룹이면 계속 흡수
if (state.dirGroup) {
  if (trimmed === "" || isDirectoryTreeLine) {
    appendToDirBlock();
    return;
  }

  state.dirGroup = false;
}

// 트리 시작
if (state.mode === "normal" && isDirectoryTreeLine) {
  state.dirGroup = true;
  appendToDirBlock();
  return;
}

// -------------------------
// ASCII DIAGRAM DETECT (SSOT SAFE v2)
// - 테이블보다 먼저 감지
// - border로 시작된 asciiGroup 내부에서는 파이프 row도 code로 유지
// -------------------------

const trimmedLine = line.trim();

 // 🔒 Markdown HR 라인(---) 처리
 // - asciiGroup 바깥: HR은 마크다운으로 넘김 (렌더에서 hr()가 null 처리)
 // - asciiGroup 안: 다이어그램 연속성 유지 위해 code에 흡수 (줄마다 code 카드 쪼개짐 방지)
 const isHrLine = /^\s*-{3,}\s*$/.test(trimmedLine);
 if (isHrLine) {
   if (state.asciiGroup) {
     const last = state.blocks[state.blocks.length - 1];
     if (last && last.kind === "code" && !last.lang) {
       last.text += line + "\n";
       return;
     }
     state.blocks.push({
       id: `b${state.nextId++}`,
       kind: "code",
       lang: "",
       text: line + "\n",
       closed: true,
     });
     return;
   }

   let last = state.blocks[state.blocks.length - 1];
   if (!last || last.kind !== "md") {
     last = { id: `b${state.nextId++}`, kind: "md", text: "" };
     state.blocks.push(last);
   }
   last.text += line + "\n";
   return;
 }

 // 🔒 ASCII border 라인 확장
 // 1) box-drawing 기반 (│┌┐┼─ 등)
 // 2) +---+ / |---| 같은 classic ASCII 테두리도 허용
 const isBoxBorderLine =
   /^[\s│├└┌┐┬┴┘┼─═→⇒|\-]+$/.test(trimmedLine) &&
   /[│├└┌┐┬┴┘┼]/.test(trimmedLine); // box char 반드시 포함

 const isClassicAsciiBorderLine =
   /^[\s\|\+\-_=]+$/.test(trimmedLine) &&     // 테두리 문자만
   /(\+|\|)/.test(trimmedLine) &&             // + 또는 | 포함
   /-{2,}|_{2,}|={2,}/.test(trimmedLine);     // 선이 충분히 김

 const isAsciiBorderLine = isBoxBorderLine || isClassicAsciiBorderLine;

 const isAsciiPipeRowInGroup =
   state.asciiGroup &&
   /^[\s|│].*[|│]\s*$/.test(line) &&
   /[|│]/.test(line);
const isAsciiContentLine =
  state.asciiGroup &&
   /^[\s│|].+/.test(line);

 const isAsciiDiagramLine =
   isAsciiBorderLine ||
   isAsciiPipeRowInGroup ||
   isAsciiContentLine;

 // asciiGroup이 열린 상태에서 파이프 본문 라인은 table/md로 보내지 않고 code에 유지
 // ASCII 그룹 내부 텍스트 줄도 code block에 흡수
if (
  state.asciiGroup &&
  !isAsciiDiagramLine &&
  /^[\s│|].*/.test(line)
) {
  const last = state.blocks[state.blocks.length - 1];

  if (last && last.kind === "code" && !last.lang) {
    last.text += line + "\n";
    return;
  }
}
 if (isAsciiPipeRowInGroup) {
   const last = state.blocks[state.blocks.length - 1];
   if (last && last.kind === "code" && !last.lang) {
     last.text += line + "\n";
     return;
   }
 }

if (state.mode === "normal" && isAsciiDiagramLine) {
  const last = state.blocks[state.blocks.length - 1];

  state.asciiGroup = true; // 🔥 그룹 시작

  if (last && last.kind === "code" && !last.lang) {
    last.text += line + "\n";
  } else {
    state.blocks.push({
      id: `b${state.nextId++}`,
      kind: "code",
      lang: "",
      text: line + "\n",
      closed: true,
    });
  }

  return;
}
// 🔥 ASCII 그룹 중이면 빈 줄도 code에 흡수
if (state.asciiGroup && trimmed === "") {
  const last = state.blocks[state.blocks.length - 1];
  if (last && last.kind === "code" && !last.lang) {
    last.text += "\n";
    return;
  }
}
   // -------------------------
   // 3) TABLE (| ... |)
   // - 시작 조건 강화 (파이프 2개 이상 + 오탐 컷)
   // - confirmed 전이라도 "헤더+separator" 형태로 보정해서 선 깔끔하게
   // - wrapper/DOM은 고정 (p→table 변형 제거)
   // -------------------------
   if (state.mode === "normal" && looksLikeTableRow(line)) {
     const first = line.trimEnd(); // ✅ raw 저장 (오탐/롤백 안전)
     state.blocks.push({
       id: `b${state.nextId++}`,
       kind: "table",
       lines: [first],
       confirmed: false,
     });
     state.mode = "table";
     return;
   }

   if (state.mode === "table") {
     const b = state.blocks[state.blocks.length - 1];
     if (!b || b.kind !== "table") {
       state.mode = "normal";
       return;
     }

    // 🔒 streaming 중 빈 줄은 즉시 종료하지 않음
    if (trimmed === "") {
      b.lines.push("");
      return;
    }

 const rawLine = line.trimEnd();
 const sep = isTableSeparator(rawLine);

if (!b.confirmed) {


  // 🔥 2) separator가 직접 온 경우 정상 확정
  b.lines.push(rawLine);
// header 다음 줄도 table row면 confirmed
 if (b.lines.length >= 2 && looksLikeTableRowConfirmed(rawLine)) {
   b.confirmed = true;
 }
  if (sep) {
    b.confirmed = true;
    b.pending = "";
  }

  return;
}

    // 2) 확정 후: 절대 롤백 금지
    //    - 다음 줄이 테이블 행이 아니면 "테이블 종료"하고 그 줄은 md로 넘김
    if (!sep && !looksLikeTableRowConfirmed(rawLine)) {
      state.mode = "normal";
      let last = state.blocks[state.blocks.length - 1];
      if (!last || last.kind !== "md") {
        last = { id: `b${state.nextId++}`, kind: "md", text: "" };
        state.blocks.push(last);
      }
      last.text += rawLine + "\n";
      return;
    }

    b.lines.push(rawLine);
    return;
   }

// ASCII 아닌 일반 문장이 오면 그룹 종료
if (
  state.asciiGroup &&
  !isAsciiDiagramLine &&
  trimmed !== "" // 🔥 빈 줄은 그룹 유지
) {
  state.asciiGroup = false;
}

  // =========================
  // 🔥 한 줄 전체가 수식이면 block math 승격
  // ex: dE/dt = λE
  // =========================
  const looksLikePureMath =
    /^[\s\dA-Za-z\\_\^\{\}\(\)\+\-\=\*\.\∇\/]+$/.test(trimmed) &&
    /[=\\]/.test(trimmed);

  if (looksLikePureMath) {
    let last = state.blocks[state.blocks.length - 1];
    if (!last || last.kind !== "md") {
      last = { id: `b${state.nextId++}`, kind: "md", text: "" };
      state.blocks.push(last);
    }
    last.text += `$$\n${line}\n$$\n`;
    return;
  }
 // 🔒 pipe 2개 이상인데 table 모드 아닐 경우 오탐 방지
 // 단, asciiGroup 내부 파이프 row는 위에서 code로 이미 처리됨
 if (state.mode === "normal" && /\|.*\|/.test(line)) {
   let last = state.blocks[state.blocks.length - 1];
   if (!last || last.kind !== "md") {
     last = { id: `b${state.nextId++}`, kind: "md", text: "" };
     state.blocks.push(last);
   }
   last.text += line + "\n";
   return;
 }
   // -------------------------
   // 4) DEFAULT MD
   // -------------------------
   let last = state.blocks[state.blocks.length - 1];


if (!last || last.kind !== "md") {
    last = { id: `b${state.nextId++}`, kind: "md", text: "" };
    state.blocks.push(last);
  }
  last.text += line + "\n";
 }

    type Props = {
      content: unknown;
      streaming?: boolean;
      highlightId?: string | null;
      rhythm?: "intro" | "flow" | "turn" | "wrap";
      branchEmoji?: string;
      stage?: ThoughtStage | null;
  sources?: {
    id: string;
    label: string;
    url?: string;
    host?: string;
    preview?: string;
  }[];
    };

    // =========================
    // HAST helpers (react-markdown v10 table node)
    // =========================
    type HastNode = any;

    function isElement(n: HastNode): boolean {
      return !!n && n.type === "element";
    }

    function hastText(node: HastNode): string {
      if (!node) return "";
      if (node.type === "text" && typeof node.value === "string") return node.value;
      if (Array.isArray(node.children)) return node.children.map(hastText).join("");
      return "";
    }

    function findFirstTag(root: HastNode, tag: string): HastNode | null {
      if (!root) return null;
      if (isElement(root) && root.tagName === tag) return root;
      const kids = Array.isArray(root.children) ? root.children : [];
      for (const k of kids) {
        const hit = findFirstTag(k, tag);
        if (hit) return hit;
      }
      return null;
    }

    function findAllTags(root: HastNode, tag: string): HastNode[] {
      const out: HastNode[] = [];
      const walk = (n: HastNode) => {
        if (!n) return;
        if (isElement(n) && n.tagName === tag) out.push(n);
        const kids = Array.isArray(n.children) ? n.children : [];
        kids.forEach(walk);
      };
      walk(root);
      return out;
    }

const NUMBERED_EMOJI_HEADING_RE =
  /^(\d+(?:\uFE0F?\u20E3)?)\s+(.+)$/;
    const SEMANTIC_EMOJI_MAP: Record<string, string> = {
      "💡": "semantic-insight",
      "🔥": "semantic-emphasis",
      "⚠": "semantic-warning",
      "🧠": "semantic-thinking",
    };

    // 🔒 UI Auto Emoji Map (Major Branch 전용)
const MAJOR_WORD_EMOJI_MAP: Record<string, string> = {
  "정리": "🧾",
  "요약": "📝",
  "결론": "🎯",
  "핵심": "💡",
  "주의": "⚠️",
  "Summary": "📝",
  "Conclusion": "🎯",
  "Key": "💡",
  "Overview": "📌",
};

const TITLE_EMOJI_MAP: Record<string, string> = {
  "정리": "🧾",
  "요약": "📝",
  "결론": "🎯",
  "핵심": "💡",
  "주의": "⚠️",
  "중요": "❗",
  "문제": "🚨",
  "병목": "🌐",
  "해결": "🛠️",
  "전략": "🧭",
  "설계": "🏗️",
  "구조": "🧩",
  "성능": "⚡",
  "확장": "📈",
  "리스크": "⚠️",
  "비용": "💸",
}

    function parseNumberedEmojiHeading(text: string) {
      const m = text.trim().match(NUMBERED_EMOJI_HEADING_RE);
      if (!m) return null;
      return { badge: m[1], title: m[2] };
    }


    /* =========================
      Component
    ========================= */
  function Markdown({
      content,
      streaming = false,
      highlightId,
      rhythm = "flow",
      branchEmoji,
      stage,
       sources = [],
    }: Props) {
 const stageEmoji = useMemo(() => {
   return stage ? emojiMap[stage] : undefined;
 }, [stage]);
    const lastHeadingRef = useRef<string | null>(null);
    const frozenRef = useRef<{ source: string; value: string } | null>(null);
    const lastParagraphLengthRef = useRef<number>(0);
    const inferredBranchLockedRef = useRef<Set<string>>(new Set());
     const branchCountRef = useRef<number>(0);
    const lastWasHeadingRef = useRef(false);
      const safeSource = useMemo(() => {
        if (typeof content === "string") return content;
        if (content == null) return "";
        try {
          return JSON.stringify(content, null, 2);
        } catch {
          return String(content);
        }
      }, [content]);

   // 🔒 SSOT: 새로운 메시지(컨텐츠) 들어오면 branch 카운트/락 리셋
  useEffect(() => {
    branchCountRef.current = 0;
    inferredBranchLockedRef.current = new Set();
    lastHeadingRef.current = null;
  }, [safeSource]);

 const sourcesRef = useRef(sources);

 useEffect(() => {
   sourcesRef.current = sources;
 }, [sources]);
const parserRef = useRef<StreamParserState>(createStreamParser());
 // ✅ Streaming Parser Ref (블록 단위 고정 DOM)
const rawSourceRef = useRef<string>("");

 const blocks = useMemo(() => {
  // 🔒 1) RAW 기준 문자열
  const rawNext = safeSource
    .replace(/\r\n/g, "\n")
    .replace(/(^|\n)\s*``\s*(?=\n|$)/g, "$1```");

  // 🔒 2) append-only 판단은 RAW 기준
  if (rawSourceRef.current && !rawNext.startsWith(rawSourceRef.current)) {
    parserRef.current = createStreamParser();
    branchCountRef.current = 0;
  }

  // 최신 RAW 저장
  rawSourceRef.current = rawNext;

 const s = parserRef.current;

// 🔒 normalize는 append 판정 이후에만 사용
const nextRaw = rawNext;

// append-only는 RAW 기준
if (!s.source || nextRaw.startsWith(s.source)) {
  const deltaRaw = nextRaw.slice(s.source.length);

  // 🔥 delta만 normalize
  const delta = normalizeHumanMath(deltaRaw);

  s.source = nextRaw;
  ingestDelta(s, delta);
} else {
  parserRef.current = createStreamParser();
  branchCountRef.current = 0;

  const normalized = normalizeHumanMath(nextRaw);
  parserRef.current.source = nextRaw;
  ingestDelta(parserRef.current, normalized);
}

   if (!streaming && s.pendingLine.length > 0) {
    if (!streaming && s.mathMode) {
    s.mathMode = false;
  }
     // ✅ FINAL에서 pending이 fence 라인으로 끝나면 "라인 처리"로 넘겨야 정상적으로 닫힘.
     // (그냥 tail append하면 ```이 코드본문으로 들어가서 mode가 안 풀림)
     const tailLine = s.pendingLine;
     const tailTrim = tailLine.trim();
     if (/^\s*`{3,}[a-zA-Z0-9_-]*\s*$/.test(tailTrim)) {
       s.pendingLine = "";
       processLine(s, tailLine);
       syncPending(s);
       return s.blocks;
     }
// 🔒 FINAL 안전장치: 닫히지 않은 code mode 정리
if (!streaming && s.mode === "code") {
  const last = s.blocks[s.blocks.length - 1];
  if (last?.kind === "code") {
    if (last.text.trim() === "") {
      s.blocks.pop();
    } else {
      // 🔒 fence는 parser가 소비한다.
      // UI/FINAL에서 강제 close 절대 금지
    }
  }

  s.mode = "normal";
  s.openFenceTicks = null;
  s.pendingCodeLang = null;
}
     const tail = s.pendingLine;
     s.pendingLine = "";
     const last = s.blocks[s.blocks.length - 1];
     if (last?.kind === "md") {
       last.text += tail;
       last.pending = "";
     } else if (last?.kind === "code") {
       last.text += tail;
       last.pending = "";
     } else if (last?.kind === "table") {
       const t = tail.trimEnd();
       if (t) last.lines.push(t);
       last.pending = "";
     }
   }
   return s.blocks;
 }, [safeSource, streaming]);




  const enableMath = true;

    useEffect(() => {
    if (!highlightId) return;
      const el = document.querySelector(
        `[data-heading="${highlightId}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, [highlightId]);

    // =========================
    // Paragraph rhythm helpers (SSOT)
    // - CSS :has()에 의존하지 않고, data-*로 리듬 고정
    // =========================


    function hasBlockishChild(node: any): boolean {
      // p 안에 block 요소가 끼면 <p> 대신 <div>로 폴백 (hydration 방지)
      const tags = ["pre", "table", "ul", "ol", "blockquote", "h1", "h2", "h3"];
      return tags.some((tag) => !!findFirstTag(node, tag));
    }

  function isRenderableTextParagraph(node: HastNode): boolean {
    const text = hastText(node).trim();
    if (!text) return false;

    // 순수 수식/기호 줄 제외
    if (/^\$/.test(text)) return false;
    if (/^[=()+\-*/0-9\s]+$/.test(text)) return false;

    return true;
  }

  
function normalizeUrl(u?: string) {
  if (!u) return "";
  return u.replace(/[),.;]+$/, "").trim();
}

// 🔥 괄호 wrapper 제거: ( <a> ), ( <a>\n), (\n<a>\n) 등
// - react-markdown에서 괄호는 보통 a의 앞/뒤 "text node"로 따로 쪼개짐
// - 문제: tight list면 <p>가 생기지 않아 p()에서만 처리하면 안 먹힘 → p + li 둘 다 적용
function stripParensAroundAnchors(nodes: React.ReactNode[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const cur = nodes[i];

 if (
   React.isValidElement(cur) &&
   cur.props &&
   typeof cur.props.href === "string"
 ) {
      // 앞 "(" 제거
      const prev = out[out.length - 1];
      if (typeof prev === "string" && /\(\s*$/.test(prev)) {
        const cleanedPrev = prev.replace(/\(\s*$/, "");
        if (cleanedPrev.trim() === "") out.pop();
        else out[out.length - 1] = cleanedPrev;
      }

      out.push(cur);

      // 뒤 ")" 제거
      const next = nodes[i + 1];
      if (typeof next === "string" && /^\s*\)/.test(next)) {
        const cleanedNext = next.replace(/^\s*\)/, "");
        i++; // consume next
        if (cleanedNext.trim() !== "") out.push(cleanedNext);
      }

      continue;
    }

    out.push(cur);
  }

  return out;
}

    // =========================
    // Semantic emphasis (SSOT)
    // - **강조**와 **구조(소제목/전환)**를 strong 하나로 뭉개지 않는다
    // =========================
    function isStructuralStrong(text: string): boolean {
      const t = (text ?? "").trim();
      if (!t) return false;
     if (/^\d+\s+/.test(t)) return false;
      if (/^\d+단계$/.test(t)) return false;
      // 너무 긴 문장 강조는 구조가 아님
      if (t.length > 48) return false;

      if (/^\d+\s*단계\b|^STEP\s*\d+/i.test(t)) return true;
      // 콜론/화살표/불릿 느낌이면 구조 후보
      if (/[:：→⇒\-–—]\s*$/.test(t)) return true;
      if (/^(요약|결론|핵심|정리|주의|중요|NOTE|TIP)\s*[:：]$/.test(t)) return true;
      return false;
    }

const parseBranchLead = (
  text: string
): { badge: string; title: string } | null => {
  const t = text.trim();

  // 1) 숫자 1~2자리만 허용 (연도 차단)
  const headMatch = t.match(/^(\d{1,2})(?:\s*(?:단계)?(?:[.)]|[:\-])|\s+)(.+)$/);
  if (!headMatch) return null;

  const num = headMatch[1];
  const rest = headMatch[2].trim();

  // 2) 연도/날짜/수량 패턴 차단
  if (
    /^\d{4}$/.test(num) ||             // 2024
    /^(\d{4})\s*(년|월|일|분기)/.test(t) ||  // 2024년 / 2024 1월
    /^\d+\s*(년|월|일|명|개|원|%)/.test(t)    // 10명 / 5개
  ) {
    return null;
  }

  // 3) 뒤가 숫자+단위면 제외 (ex: 10 20명)
  if (/^\d+\s*(년|월|일|명|개|원|%)/.test(rest)) {
    return null;
  }

  return {
    badge: num,
    title: rest,
  };
};
const components = useMemo<Components>(() => ({
  pre({ children }) {
    // 🔒 ReactMarkdown 기본 <pre> 렌더 차단
    // CodeBlock에서 이미 렌더됨
    return <>{children}</>;
  },

  a({ href, children }) {
    if (!href) return <>{children}</>;
  if (process.env.NODE_ENV === "development") {
    console.log("[MD][A_RENDER]", {
      href,
      type: typeof children,
      isArray: Array.isArray(children),
      children,
    });
  }
  let safeHref = href;
  try {
    const parsed = new URL(href, "https://example.com");
    if (!/^https?:$/i.test(parsed.protocol)) {
      return <>{children}</>;
    }
    safeHref = parsed.href;
  } catch {
    return <>{children}</>;
  }

  const normalizedHref = normalizeUrl(safeHref);

 const matchedSource = sourcesRef.current?.find((s) =>
   normalizedHref.includes(normalizeUrl(s.url))
 );

  let host = "";
  try {
    host = new URL(href).hostname.replace("www.", "");
  } catch {
    host = href;
  }

  let label = matchedSource?.label ?? host;
  if (process.env.NODE_ENV === "development") {
    console.log("[MD][A_LABEL_BEFORE]", {
      href,
      children,
    });
  }


    // 🔥 소스칩 전용 괄호 제거 (본문 영향 없음)
    let rawText = "";

    if (typeof children === "string") {
      rawText = children;
    } else if (Array.isArray(children)) {
      rawText = children.join("");
    }

    if (rawText) {
      label = rawText
        .replace(/^\(\s*/, "")
        .replace(/\s*\)$/, "");
    }

  if (process.env.NODE_ENV === "development") {
    console.log("[MD][A_LABEL_AFTER]", {
      rawText,
      finalLabel: label,
    });
  }

  return (
    <span className="yua-source-wrapper">
      <a
        key={normalizedHref}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="yua-source-chip"
      >
        <span className="yua-source-chip-label">
          {label}
        </span>
      </a>

      {matchedSource && (
        <div className="yua-source-tooltip">
          <div className="yua-source-tooltip-title">
            {matchedSource.label}
          </div>

          {matchedSource.host && (
            <div className="yua-source-tooltip-host">
              {matchedSource.host}
            </div>
          )}

          {matchedSource.preview && (
            <div className="yua-source-tooltip-preview">
              {matchedSource.preview.slice(0, 140)}…
            </div>
          )}
        </div>
      )}
    </span>
  );
},
  hr() {
    // 🔥 SSOT: Notion/카톡/문서에서 섞여 들어오는 '---' 구분선은
    // 헤딩(branch-block)과 충돌하므로 마크다운 렌더에서 제거
    return null;
  },
    table({ node, children }) {
  const stableKey = node?.position?.start?.offset ?? "md-table";

  return (
    <div className="md-table-wrap" key={stableKey}>
      <table className="md-table">
        {children}
      </table>
    </div>
  );
    },
    thead({ node, children }) {
      return <thead className="md-thead">{children}</thead>;
    },
    tbody({ node, children }) {
      return <tbody className="md-tbody">{children}</tbody>;
    },
    tr({ node, children }) {
      return <tr className="md-tr">{children}</tr>;
    },
    th({ node, children }) {
      return <th className="md-th">{children}</th>;
    },
    td({ node, children }) {
      return <td className="md-td">{children}</td>;
    },
    p({ node, children }) {
    // 🔥 괄호 wrapper 제거 (p)
    const normalizedChildren = Array.isArray(children)
      ? stripParensAroundAnchors(children)
      : children;

  const rawText = hastText(node).trim();
 // 🔥 콜론으로 끝나는 문장 다음 문단은 turn 승격
 if (/선택지/.test(rawText) && rawText.endsWith(":")) {
   return (
     <p
       className="md-p break-words whitespace-normal"
       data-md-rhythm="turn"
     >
       {normalizedChildren}
     </p>
   );
 }

 

  const lead = parseBranchLead(rawText);
  const prevIsHeading = lastHeadingRef.current != null;
  const minorMatch = rawText.match(/^(\d+\uFE0F?\u20E3)\s+(.+)$/);

  // ✅ numeric branch (1. 제목 / 1 제목)
 if (lead) {
  lastHeadingRef.current = null;   // 🔥 문맥 즉시 종료
    return (
      <div className="branch-block" data-md-lead="section">
        <div className="headingRow">
          <span className="badge">{lead.badge}</span>
 <span className="title">
   {(() => {
     const firstWord = lead.title.split(/\s+/)[0];
     const emoji =
       TITLE_EMOJI_MAP[firstWord];

     const alreadyHasEmoji =
       /^\p{Extended_Pictographic}/u.test(
         lead.title
       );

     if (emoji && !alreadyHasEmoji) {
       return `${emoji} ${lead.title}`;
     }

     return lead.title;
   })()}
 </span>
        </div>
      </div>
    );
  }


      // 🔒 SSOT: 빈 문단은 DOM 생성 금지 (직사각형 원인)
      if (
        !normalizedChildren ||
        (Array.isArray(normalizedChildren) &&
          normalizedChildren.every((c) => typeof c === "string" && c.trim() === ""))
      ) {
        return null;
      }

      // 🔒 heading 바로 다음 p는 branch 승격 금지
if (lastWasHeadingRef.current) {
  lastWasHeadingRef.current = false;
  return (
    <p className="md-p break-words whitespace-normal" data-md-rhythm={rhythm}>
      {normalizedChildren}
    </p>
  );
}


 // 🔥 minor branch (1️⃣ 토큰 임베딩 같은 케이스)
  if (minorMatch) {
    return (
      <div className="branch-block" data-md-lead="minor">
        <div className="headingRow">
          <span className="badge">{minorMatch[1]}</span>
          <span className="title">{minorMatch[2]}</span>
        </div>
      </div>
    );
  }



        const blockish = hasBlockishChild(node);
        const className = "md-p break-words whitespace-normal";

        // blockish면 p로 만들면 위험 → div 폴백
        // 🔥 FIX: data-md-rhythm 동일 적용 (font-size 진동 방지)
        if (blockish) {
          return (
            <div className={className} data-md-rhythm={rhythm}>
              {normalizedChildren}
            </div>
          );
        }


        return (
          <p
            className={className}
            data-md-rhythm={rhythm}
          >
            {normalizedChildren}
          </p>
        );
    },
          blockquote({ node, children }) {
        return (
          <blockquote>
            {children}
          </blockquote>
        );
      },

      ul({ node, children }) {
        return <ul className="list-none pl-0 my-2">{children}</ul>;
      },
      ol({ node, children }) {
        // 🔒 ol을 div로 바꾸면 정상 ordered list까지 깨짐 → 원복
        return <ol className="list-decimal pl-6 my-2">{children}</ol>;
      },
      li({ node, children }) {
    // 🔥 괄호 wrapper 제거 (li) — tight list에서는 <p>가 안 생겨서 여기서 처리해야 함
    const normalizedChildren = Array.isArray(children)
      ? stripParensAroundAnchors(children)
      : children;
        // ✅ GFM task list의 checkbox를 "섹션 헤더"로 쓰는 케이스 처리
        // - [x] 0. 설계 원칙
        // - ✅ 0. 설계 원칙
        // 같은 라인이면 리스트 아이템이 아니라 branch-block으로 승격 + checkbox 제거

        // 1) li 내부 첫 p 텍스트를 잡는다 (task-list는 보통 input + p 구조)
        const pNode = findFirstTag(node as any, "p");
        const raw = (pNode ? hastText(pNode) : hastText(node as any)).trim();

        // 2) emoji + numeric heading
        const emojiNumeric = raw.match(
          /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(\d+)[\.\)]?\s+(.+)/u
        );
        if (emojiNumeric) {
          return (
            <div className="branch-block" data-md-lead="section">
              <div className="headingRow">
                <span className="badge">{emojiNumeric[1]}</span>
                <span className="title">{emojiNumeric[2]}</span>
              </div>
            </div>
          );
        }

  // 🔒 SSOT: ordered list는 절대 branch 승격하지 않음
  // numeric branch는 p()에서만 처리

        // 4) minor branch (1️⃣ ...)
        const minorMatch = raw.match(/^(\d+\uFE0F?\u20E3)\s+(.+)$/);
        if (minorMatch) {
          return (
            <div className="branch-block" data-md-lead="minor">
              <div className="headingRow">
                <span className="badge">{minorMatch[1]}</span>
                <span className="title">{minorMatch[2]}</span>
              </div>
            </div>
          );
        }

        // default li
       return <li className="my-1">{normalizedChildren}</li>;
      },

      strong({ node, children }) {
  return <strong>{children}</strong>;
        },
          img({ src, alt }) {
          // 🔒 SSOT: 외부 이미지 마크다운 렌더 금지
          // 이미지 출력은 ImageSectionBlock만 허용
          if (process.env.NODE_ENV === "development") {
            console.warn("[MARKDOWN][BLOCKED_IMAGE]", src);
          }
          return null;
        },
      h1({ node, children }) {
  const t = hastText(node).trim();
   if (!t) return null; // 🔥 빈 헤더면 branch 생성 금지

  const alreadyHasEmoji =
    /^\p{Extended_Pictographic}/u.test(t);

   lastHeadingRef.current = t;  // 🔥 branch 문맥 활성화
   lastWasHeadingRef.current = true;


  return (
    <div className="branch-block" data-md-lead="major" data-md-branch="1">
      <div className="headingRow">
        <span className="title">
          {stageEmoji && !alreadyHasEmoji
            ? `${stageEmoji} `
            : ""}
          {children}
        </span>
      </div>
    </div>
  );

        },
        h2({ node, children }) {
   const t = hastText(node).trim();
   if (!t) return null; // 🔥 빈 헤더면 branch 생성 금지
 const alreadyHasEmoji =
   /^\p{Extended_Pictographic}/u.test(t);
   lastHeadingRef.current = t;  // 🔥 branch 문맥 활성화
   lastWasHeadingRef.current = true;

  return (
    <div className="branch-block" data-md-lead="section">
      <div className="headingRow">
<span className="title">
  {stageEmoji && !alreadyHasEmoji ? `${stageEmoji} ` : ""}
  {children}</span>
      </div>
    </div>
  );
        },
h3({ node, children }) {
   const t = hastText(node).trim();
   if (!t) return null; // 🔥 빈 헤더면 렌더 금지

  const text = t;
   const alreadyHasEmoji =
   /^\p{Extended_Pictographic}/u.test(text);
  const emojiBranch = parseNumberedEmojiHeading(text);
  const numericBranch = parseBranchLead(text);


  if (emojiBranch) {
    return (
      <div className="branch-block" data-md-lead="section">
        <div className="headingRow">
          <span className="badge">{emojiBranch.badge}</span>
          <span className="title">
            {stageEmoji && !alreadyHasEmoji ? `${stageEmoji} ` : ""}
            {emojiBranch.title}</span>
        </div>
      </div>
    );
  }

  if (numericBranch) {
    return (
      <div className="branch-block" data-md-lead="section">
        <div className="headingRow">
          <span className="badge">{numericBranch.badge}</span>
 <span className="title">
   {(() => {
     const firstWord = numericBranch.title.split(/\s+/)[0];
     const emoji =
       TITLE_EMOJI_MAP[firstWord];

     const alreadyHasEmoji =
       /^\p{Extended_Pictographic}/u.test(
         numericBranch.title
       );

     if (emoji && !alreadyHasEmoji) {
       return `${emoji} ${numericBranch.title}`;
     }

     return numericBranch.title;
   })()}
 </span>
        </div>
      </div>
    );
  }

  return (
    <h3 className="md-heading md-heading-3">
      {children}
    </h3>
  );
},
        code({ inline, className, children, node, ...rest }) {
          // react-markdown v8: `inline` prop may be true/undefined/missing.
          // Fallback: if there is no className (no language-xxx) AND the content
          // has no newlines, treat as inline code.
          const hasLang = typeof className === "string" && className.startsWith("language-");
          const isInline =
            inline === true ||
            (!hasLang && !String(children).includes("\n"));
  if (process.env.NODE_ENV === "development") {
    console.log("[MD][RM_CODE_RENDER]", {
      inline: isInline,
      className,
      preview: String(children).slice(0, 80),
    });
  }
          if (isInline) {
            // No extra Tailwind classes — rely on globals.css
            // `.chat-markdown code:not(pre code)` which handles light+dark.
            return (
              <code>{children}</code>
            );
          }

          return (
            <CodeBlock
              className={className}
              value={String(children)}
              streaming={streaming}
            />
          );
        },
      }), [stageEmoji, rhythm]);

      return (
        <div className="chat-markdown">
          
          {blocks.map((b: StreamBlock, idx: number) => {
   if (b.kind === "branch") {
   return null; // 🔥 현재 parser branch는 안 씀
 }


if (b.kind === "code") {
  const lastCodeIndex = (() => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      if (blocks[i]?.kind === "code") return i;
    }
    return -1;
  })();
  const codeStreaming = streaming && b.closed !== true && idx === lastCodeIndex;
  let full = b.text + (b.pending ?? "");
  if (process.env.NODE_ENV === "development") {
    console.log("[MD][RENDER_CODE_BLOCK]", {
      id: b.id,
      lang: b.lang,
      length: full.length,
      preview: full.slice(0, 80),
    });
  }
  // 🔒 SSOT: UI에서 fence를 절대 강제 close 하지 않는다.
  // fence는 parser가 책임진다.
  const lang = (b.lang || "").toLowerCase();
 // streaming 중 mermaid incomplete 방어
  if (lang === "mermaid") {

  // 🔒 streaming 중 mermaid 1라인 미완성 방어 (깜빡임 차단)
  if (streaming && !full.includes("\n")) {
    return null;
  }
  // 🔒 Streaming 중에는 코드 먼저 보여주고
  if (streaming) {
    return (
      <CodeBlock
        key={b.id}
        className="language-mermaid"
        value={full}
        streaming={codeStreaming}
      />
    );
  }

  // 🔥 FINAL에서만 다이어그램 렌더
  return <React.Suspense key={b.id} fallback={null}><MermaidRenderer code={full} /></React.Suspense>;
  }

  return (
    <CodeBlock
      key={b.id}
      className={b.lang ? `language-${b.lang}` : undefined}
      value={full}
      streaming={codeStreaming}
    />
  );
}
if (b.kind === "table") {
  const pending = b.pending ?? "";
  const rawLines = [...b.lines];
  if (!b.confirmed && pending.trim()) {
    rawLines.push(pending);
  }

  const normalized = rawLines.map(normalizeTableLine);
  const tableText = normalized.join("\n");

  // 🔒 1. confirmed 전 → 절대 markdown 파싱 금지
  if (!b.confirmed) {
    return (
      <pre key={b.id} className="md-table-preview">
        {tableText}
      </pre>
    );
  }

  // 🔒 2. confirmed 이후 → table로 단 1회 전환
  return (
    <div key={b.id} className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            {normalized[0]
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((cell, i) => (
                <th key={i} className="md-th">
                  {cell.trim()}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {normalized.slice(1).map((line, r) => {
            if (isTableSeparator(line)) return null;

            const cells = line
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|");

            return (
              <tr key={r} className="md-tr">
                {cells.map((cell, c) => (
                <td key={c} className="md-td">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm,
                      [remarkMath, { singleDollarTextMath: false }],
                    ]}
                    rehypePlugins={[
                      [
                        rehypeKatex,
                        {
                          strict: false,
                          throwOnError: false,
                          fleqn: true,
                          macros: { "\\displaystyle": "" },
                        },
                      ],
                    ]}
                    components={components}
                  >
                    {cell.trim()}
                  </ReactMarkdown>
                </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

            // md block
 let mdText = b.text + (b.pending ?? "");
            return (
              <ReactMarkdown
                key={b.id}
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: false }],
                ]}
                rehypePlugins={[
                  [
                    rehypeKatex,
                    {
                      strict: false,
                      throwOnError: false,
                      fleqn: true,
                      macros: { "\\displaystyle": "" },
                    },
                  ],
                ]}
                components={components}
              >
                {mdText}
              </ReactMarkdown>
            );
          })}
      </div>
      );
    }

    // 🔒 SSOT: meta-only 업데이트(suggestion 등)가 와도
  // Markdown은 content/streaming/highlightId가 같으면 재렌더하지 않는다 (DOM '펑' 완화)
  export default React.memo(
    Markdown,
  (p, n) => {
    // 🔒 STREAMING SSOT
    // - append-only면 렌더 허용
    // - meta-only 업데이트는 차단
    if (n.streaming) {
      if (typeof p.content !== "string" || typeof n.content !== "string") {
        return false;
      }

      // 동일하면 skip
      if (p.content === n.content) return true;

      // append-only 증가면 정상 스트림 → 렌더
      if (n.content.startsWith(p.content)) return false;

      // 줄어들거나 완전 교체 → 리셋 렌더
      return false;
    }
   // final 상태에서는 전체 비교
   return (
     p.content === n.content &&
     p.highlightId === n.highlightId &&
     p.rhythm === n.rhythm &&
     p.streaming === n.streaming&&
     p.stage === n.stage &&
     shallowSourcesEqual(p.sources, n.sources)
   );
 }
  );
