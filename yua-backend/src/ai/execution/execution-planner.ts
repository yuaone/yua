// 🔒 EXECUTION PLANNER — SSOT FINAL (PHASE 5)
// ------------------------------------------
// 입력:
// - TaskKind
// - Reasoning Snapshot
//
// 출력:
// - ExecutionPlan (단 하나)
//
// 규칙:
// - deterministic
// - side-effect 없음
// - 확장 가능 (언어/툴 추가)

import type { TaskKind } from "../task/task-kind";
import type { ExecutionKind } from "./execution-kind";
import type { ReasoningResult } from "../reasoning/reasoning-engine";

export type CodeLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "unknown";

export interface ExecutionPlan {
  kind: ExecutionKind;

  /**
   * CODE 계열 전용
   */
  language?: CodeLanguage;

  /**
   * 검증 단계 수
   * (PHASE 6에서 verifier loop와 연결)
   */
  verificationLevel: 0 | 1 | 2;

  /**
   * 출력 제약
   */
  constraints: string[];
   /**
   * 🔒 qualityHints (READ-ONLY)
   * - 실패 가능성에 대한 사고 힌트
   * - 실행 / 판단 / 출력에 영향 ❌
   */
  qualityHints?: {
    primaryRisk:
      | "STATE_CORRUPTION"
      | "TYPE_SAFETY"
      | "ASYNC_RACE"
      | "API_MISUSE"
      | "EXTENSION_PAIN";
    reasoningNote: string;
  };
}

export function planExecution(args: {
  task: TaskKind;
  reasoning: ReasoningResult;
  message: string;
}): ExecutionPlan {
  const { task, reasoning, message } = args;

  const lang = inferLanguage(message);

   const qualityHints = buildQualityHints({
    task,
    reasoning,
  });

  switch (task) {
    /* ---------------------------------- */
    /* CHAT                                */
    /* ---------------------------------- */
    case "DIRECT_CHAT":
      return {
        kind: "CHAT_RESPONSE",
        verificationLevel: 0,
        constraints: [],
      };

    /* ---------------------------------- */
    /* IMAGE                               */
    /* ---------------------------------- */
    case "IMAGE_ANALYSIS":
      return {
        kind: "IMAGE_OBSERVE",
        verificationLevel: 1,
        constraints: [
          "보이는 것만 말해라",
          "추측은 명시적으로 구분해라",
        ],
      };
    case "IMAGE_GENERATION":
      return {
        kind: "IMAGE_GENERATE",
        verificationLevel: 0,
        constraints: [],
      };

    /* ---------------------------------- */
    /* SEARCH                              */
    /* ---------------------------------- */
    case "SEARCH_VERIFY":
      return {
        kind: "FACT_VERIFICATION",
        verificationLevel: 2,
        constraints: [
          "출처 없는 단정 금지",
          "검증된 사실만 확정",
        ],
      };

    /* ---------------------------------- */
    /* CODE — READ                         */
    /* ---------------------------------- */
    case "CODE_REVIEW":
      return {
        kind: "CODE_READONLY",
        language: lang,
        verificationLevel: 1,
        constraints: [
          "코드를 수정하지 마라",
          "문제 지점과 이유만 제시",
        ],
        qualityHints,
      };

    /* ---------------------------------- */
    /* CODE — WRITE                        */
    /* ---------------------------------- */
    case "CODE_GENERATION":
      return {
        kind: "CODE_WRITE",
        language: lang,
        verificationLevel: 1,
        constraints: [
          "완성형 코드만 출력",
        ],
        qualityHints,
      };

    /* ---------------------------------- */
    /* ERROR FIX                           */
    /* ---------------------------------- */
    case "TYPE_ERROR_FIX":
      return {
        kind: "TYPE_FIX",
        language: lang,
        verificationLevel: 2,
        constraints: [
          "타입 안정성 최우선",
          "any 사용 금지",
        ],
        qualityHints,
      };

    case "RUNTIME_ERROR_FIX":
      return {
        kind: "RUNTIME_FIX",
        language: lang,
        verificationLevel: 2,
        constraints: [
          "원인 → 수정 → 영향 순서",
        ],
        qualityHints,
      };

    /* ---------------------------------- */
    /* REFACTOR                            */
    /* ---------------------------------- */
    case "REFACTOR":
      return {
        kind: "REFACTOR_APPLY",
        language: lang,
        verificationLevel: 1,
        constraints: [
          "기능 변경 금지",
          "구조만 개선",
        ],
        qualityHints,
      };

    /* ---------------------------------- */
    /* DEFAULT (안전)                      */
    /* ---------------------------------- */
    default:
      return {
        kind: "CHAT_RESPONSE",
        verificationLevel: 0,
        constraints: [],
      };
  }
}

function buildQualityHints(args: {
  task: TaskKind;
  reasoning: ReasoningResult;
}): ExecutionPlan["qualityHints"] {
  const { task, reasoning } = args;

  let primaryRisk:
    | "STATE_CORRUPTION"
    | "TYPE_SAFETY"
    | "ASYNC_RACE"
    | "API_MISUSE"
    | "EXTENSION_PAIN";

  // 🔒 기본 bias (SSOT)
  switch (task) {
    case "TYPE_ERROR_FIX":
      primaryRisk = "TYPE_SAFETY";
      break;
    case "RUNTIME_ERROR_FIX":
      primaryRisk = "ASYNC_RACE";
      break;
    case "CODE_REVIEW":
      primaryRisk = "STATE_CORRUPTION";
      break;
    case "CODE_GENERATION":
    case "REFACTOR":
      primaryRisk = "EXTENSION_PAIN";
      break;
    default:
      primaryRisk = "API_MISUSE";
  }

  // 🔥 Reasoning 기반 보정 (READ-ONLY)
  if (reasoning.intent === "debug") {
    primaryRisk = "ASYNC_RACE";
  }

  if (reasoning.depthHint === "deep" && reasoning.confidence >= 0.8) {
    primaryRisk = "STATE_CORRUPTION";
  }

  const noteMap: Record<typeof primaryRisk, string> = {
    STATE_CORRUPTION:
      "As this logic grows, subtle state changes across steps may introduce hard-to-trace bugs.",
    TYPE_SAFETY:
      "If type assumptions drift over time, runtime failures may appear in unexpected places.",
    ASYNC_RACE:
      "Changes in execution order or retries may surface timing-related issues.",
    API_MISUSE:
      "If the underlying contract is misunderstood or evolves, this integration may fail silently.",
    EXTENSION_PAIN:
      "Future requirements may be difficult to add cleanly without restructuring.",
  };

  return {
    primaryRisk,
    reasoningNote: noteMap[primaryRisk],
  };
}

/* ---------------------------------- */
/* LANGUAGE INFERENCE (MIXED v4)      */
/* ---------------------------------- */

function inferLanguage(text: string): CodeLanguage {
  const t = text || "";

  const score: Record<CodeLanguage, number> = {
    typescript: 0,
    javascript: 0,
    python: 0,
    go: 0,
    rust: 0,
    unknown: 0,
  };

  /* -------------------------------------------------- */
  /* 1️⃣ Strong Signals — Extension                     */
  /* -------------------------------------------------- */

  if (/\.(tsx?)\b/i.test(t)) score.typescript += 5;
  if (/\.(jsx?)\b/i.test(t)) score.javascript += 5;
  if (/\.py\b/i.test(t)) score.python += 5;
  if (/\.go\b/i.test(t)) score.go += 5;
  if (/\.rs\b/i.test(t)) score.rust += 5;

  /* -------------------------------------------------- */
  /* 2️⃣ Markdown Fence                                 */
  /* -------------------------------------------------- */

  const fenceMatch = t.match(/```(\w+)?/);
  if (fenceMatch?.[1]) {
    const hint = fenceMatch[1].toLowerCase();
    if (hint.includes("ts")) score.typescript += 4;
    if (hint.includes("js")) score.javascript += 4;
    if (hint.includes("python") || hint === "py") score.python += 4;
    if (hint.includes("go")) score.go += 4;
    if (hint.includes("rust") || hint === "rs") score.rust += 4;
  }

  /* -------------------------------------------------- */
  /* 3️⃣ Strong Syntax                                  */
  /* -------------------------------------------------- */

  if (/\binterface\s+\w+/i.test(t)) score.typescript += 3;
  if (/\btype\s+\w+\s*=/i.test(t)) score.typescript += 3;
  if (/\bimplements\s+\w+/i.test(t)) score.typescript += 3;

  if (/\brequire\(|module\.exports/.test(t)) score.javascript += 3;
  if (/\buseEffect\(|useState\(/.test(t)) score.javascript += 2;

  if (/\bdef\s+\w+\s*\(/i.test(t)) score.python += 3;
  if (/\bself\b/.test(t)) score.python += 2;

  if (/\bpackage\s+\w+/i.test(t)) score.go += 3;
  if (/\bfunc\s+\w+\s*\(/i.test(t)) score.go += 3;

  if (/\bfn\s+\w+\s*\(/i.test(t)) score.rust += 3;
  if (/\bimpl\s+\w+/i.test(t)) score.rust += 3;

  /* -------------------------------------------------- */
  /* 4️⃣ Framework / Ecosystem                          */
  /* -------------------------------------------------- */

  if (/(tsconfig|vite\.config\.ts)/i.test(t)) score.typescript += 2;
  if (/(webpack\.config|babel\.config)/i.test(t)) score.javascript += 2;
  if (/(requirements\.txt|pip install)/i.test(t)) score.python += 2;
  if (/(go\.mod)/i.test(t)) score.go += 2;
  if (/(Cargo\.toml)/i.test(t)) score.rust += 2;

  /* -------------------------------------------------- */
  /* 5️⃣ Conflict Resolution                            */
  /* -------------------------------------------------- */

  // TS beats JS if both present and TS has any strong signal
  if (score.typescript >= 3 && score.javascript >= 3) {
    score.typescript += 1;
  }

  // Typed languages slight bias
  score.typescript += 0.1;
  score.rust += 0.1;
  score.go += 0.1;

  /* -------------------------------------------------- */
  /* 6️⃣ Final Selection                                */
  /* -------------------------------------------------- */

  const entries = Object.entries(score) as [CodeLanguage, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topLang, topScore] = entries[0];

  if (topScore === 0) return "unknown";

  return topLang;
}