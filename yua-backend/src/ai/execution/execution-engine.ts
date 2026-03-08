    // 📂 src/ai/execution/execution-engine.ts
    // 🔥 ExecutionEngine — STREAM BUFFERED + FINAL/DONE SPLIT (SSOT FINAL)
    // ⚠️ STREAM SSOT LOCKED
    // FINAL → DONE → CLEANUP 헌법 고정
    // 수정 시 반드시 로그 기반 재검증 필요
// ⚠️ CRITICAL: STREAM PIPELINE IS IMMUTABLE
// DO NOT:
// - chunk tokens manually
// - simulate streaming via publish loops
// - bypass ExecutionEngine for text generation
// Stream lifecycle must remain single-source-of-truth.
// ⚠️ DO NOT FILTER REASONING HERE
// ExecutionEngine owns reasoning parsing (SSOT)
 import { pool } from "../../db/mysql";
 import { pgPool } from "../../db/postgres";
    import { runOpenAIRuntime } from "../chat/runtime/openai-runtime";
    import { ChatEngine } from "../engines/chat-engine";
    import { StreamEngine } from "../engines/stream-engine";
    import { buildContinuationPrompt } from "./continuation-prompt";
    import { MessageEngine } from "../engines/message-engine";
    import { sanitizeAssistantForStorage } from "../utils/sanitize-assistant-for-storage";
    import { writeRawEvent } from "../telemetry/raw-event-writer";
  import { writeFailureSurface } from "../telemetry/failure-surface-writer";
import type { ComputePolicy } from "../compute/compute-policy";
import { decideContinuation } from "./continuation-decision";
import { dispatchYuaExecutionPlan } from "../yua-tools/yua-tool-dispatcher";
import { runVerifierLoop } from "../verifier/verifier-loop";
import type { ToolRunResult } from "../tools/tool-runner";
import { accumulateToolScore } from "../tools/tool-score-accumulator";
import type { ToolPlanItem } from "../tools/tool-plan-builder";
import type { YuaExecutionPlan } from "yua-shared";
import { randomUUID, createHash } from "crypto";
import type { ToolType } from "../tools/tool-types";
import { ActivityKind, type SourceChip, type ActivityEventPayload } from "yua-shared/stream/activity";
import { StreamStage } from "yua-shared/stream/stream-stage";
import type { OpenAIRuntimeEvent } from "../chat/runtime/openai-runtime";
import { resolveRuntimeModelId } from "../chat/runtime/openai-runtime";
import { ComputeGate } from "../compute/compute-gate";
import type { YuaExecutionTask } from "yua-shared";
 import { ReasoningSnapshotEngine } 
   from "../reasoning/reasoning-snapshot.engine";
import { ReasoningSessionRepo } from "../reasoning/reasoning-session.repo";
 import { buildOpenAIToolSchemas, mapAllowedToolTypesToOpenAITools } from "../tools/openai-tool-registry";
 import { ActivitySnapshotEngine }
   from "../activity/activity-snapshot.engine";
import type { ActivitySnapshot }
  from "../activity/activity-snapshot.engine";
  import { ReasoningSessionController } from "../reasoning/reasoning-session-controller";
  import { translateReasoning } from "../translator/reasoning-translator.client";
import { ActivityAggregator } from "./activity-aggregator";
import { updateConversationSummary } from "../context/updateConversationSummary";
import { fetchRecentChatMessages } from "../../db/pg-readonly";
import { OpenAIVisionProvider } from "../vision/openai-vision.provider";
import { runFileAnalysis } from "../yua-tools/yua-file-analyzer";
import { readFile as fsReadFile } from "fs/promises";
import nodePath from "path";
    /* ==================================================
      Types
    ================================================== */

// 🔒 SSOT: UI control directive (절대 content로 저장/출력 금지)
const YUA_CONTROL_RE =
  /⟦YUA⟧\s*\{[\s\S]*?\}\s*⟦\/YUA⟧/g;
// 🔒 SSOT: Reasoning block directive (DEEP only, never stored in answer)
// 🔒 SSOT: Reasoning block directive (DEEP only, never stored in answer)


type ExecuteOpts = {
  threadId: number;
  traceId: string;
  workspaceId: string;
  userId: number;
  userName?: string | null;
  sectionId?: number;
  prompt: string;
  mode: string; // FAST | NORMAL | SEARCH | DEEP ...
  thinkingProfile: "FAST" | "NORMAL" | "DEEP";
  sessionId: string | null;
  outmode?: string;
  stream: boolean;
  computePolicy?: ComputePolicy;
  computeTier?: "FAST" | "NORMAL" | "DEEP";
  planTier?: "free" | "pro" | "business" | "enterprise";
  deepVariant?: "STANDARD" | "EXPANDED";
  modelId?: string;
  // YuaMax signals (optional)
  failureRisk?: "LOW" | "MEDIUM" | "HIGH";
  path?: string;
  forceSearch?: boolean;
  attachments?: {
    kind: "image" | "file";
    url: string;
    name?: string;
    mimeType?: string;
  }[];
  userProfile?: string | null;
  /** Raw user message (before prompt compilation). Used for intent detection. */
  rawUserMessage?: string;
  /** Memory intent from decision orchestrator */
  memoryIntent?: string;
};

    /* ==================================================
      Flush Heuristics (SSOT)
    ================================================== */
 function shouldFlush(
   buffer: string,
   profile: ExecuteOpts["thinkingProfile"]
 ): boolean {
  if (/[.!?]\s*$/.test(buffer) && buffer.length >= 16) return true;
  if (/\n\s*\n$/.test(buffer)) return true;

  if (buffer.length >= (profile === "DEEP" ? 120 : 64)) return true;

  return false;
}

    function normalizePrompt(input: any): string {
      if (typeof input === "string") return input;
      if (Array.isArray(input)) {
        return input.map(m => m?.content ?? "").join("\n");
      }
      if (input?.text) return String(input.text);
      return JSON.stringify(input ?? "");
    }
/**
 * Build developer hint for OpenAI Responses API "developer" role message.
 * Includes user display name, locale/language context.
 */
function buildDeveloperHint(opts: ExecuteOpts & { detectedLang?: string }): string | undefined {
  const parts: string[] = [];

  if (opts.userName?.trim()) {
    parts.push(`The user's display name is "${opts.userName.trim()}".`);
  }

  // ✅ CR-7: Include memory context hints if userProfile is available
  if (opts.userProfile?.trim()) {
    parts.push(`Memory context about this user:\n${opts.userProfile.trim()}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function detectUserLanguageHint(
  text: string
): "ko" | "en" | "unknown" {
 const sample = (text ?? "").slice(0, 600);
  if (!sample.trim()) return "unknown";

 const KOREAN_HINT_THRESHOLD = 1.0;
 const hangulCount = (sample.match(/\p{Script=Hangul}/gu) ?? []).length;
 const alphaCount = (sample.match(/[\p{Script=Hangul}a-zA-Z]/gu) ?? []).length;
 const hangulRatio = alphaCount > 0 ? hangulCount / alphaCount : 0;
 if (hangulRatio >= KOREAN_HINT_THRESHOLD) return "ko";
  const latin = sample.match(/[a-zA-Z]/g)?.length ?? 0;
  if (latin > sample.length * 0.3) return "en";

  return "unknown";
}

/* ==================================================
   🌍 Translation Policy (SSOT)
   - Only for reasoning blocks + activity titles
   - Never translate URLs / code / paths (mask & restore)
   - "sometimes" must be deterministic (reproducible)
================================================== */

type TranslateMode = "never" | "always" | "auto" | "sometimes";

function detectTextLangQuick(text: string): "ko" | "en" | "unknown" {
  const s = (text ?? "").trim();
  if (!s) return "unknown";
  if (/\p{Script=Hangul}/u.test(s)) return "ko";
  const latin = s.match(/[a-zA-Z]/g)?.length ?? 0;
  if (latin > s.length * 0.35) return "en";
  return "unknown";
}

function isProbablyCodeOrData(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return false;
  if (s.includes("```")) return true;
  if (s.includes("{") && s.includes("}") && s.includes(":")) return true; // naive JSON-ish
  if (/`[^`]+`/.test(s)) return true;
  return false;
}

function isProbablyUrlHeavy(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return false;
  if (/(https?:\/\/|www\.)/i.test(s)) return true;
  if (/\b[a-z0-9.-]+\.[a-z]{2,}\b/i.test(s) && s.length <= 120) return true; // domain-ish
  return false;
}

function deterministicChance(key: string, p: number): boolean {
  const h = createHash("sha256").update(key).digest();
  // take first 4 bytes -> 0..2^32-1
  const n = h.readUInt32BE(0);
  const x = n / 0xffffffff;
  return x < Math.max(0, Math.min(1, p));
}

function maskProtectedSegments(text: string): { masked: string; dict: string[] } {
  let out = String(text ?? "");
  const dict: string[] = [];

  const push = (v: string) => {
    const id = dict.length;
    dict.push(v);
    return `⟦PROT:${id}⟧`;
  };

  // 1) code fences
  out = out.replace(/```[\s\S]*?```/g, (m) => push(m));
  // 2) inline code
  out = out.replace(/`[^`]+`/g, (m) => push(m));
  // 3) urls
  out = out.replace(/\bhttps?:\/\/[^\s)]+/gi, (m) => push(m));
  out = out.replace(/\bwww\.[^\s)]+/gi, (m) => push(m));
  // 4) emails
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (m) => push(m));
  // 5) unix paths (rough)
  out = out.replace(/(?:\/[A-Za-z0-9._-]+)+/g, (m) => push(m));
  // 6) windows paths (rough)
  out = out.replace(/[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/g, (m) => push(m));

  return { masked: out, dict };
}

function unmaskProtectedSegments(text: string, dict: string[]): string {
  let out = String(text ?? "");
  out = out.replace(/⟦PROT:(\d+)⟧/g, (_m, g1) => {
    const idx = Number(g1);
    return Number.isFinite(idx) && dict[idx] !== undefined ? dict[idx] : _m;
  });
  return out;
}
const SOMETIMES_PROB = 0.6; // 6:4

async function maybeTranslateText(args: {
  text: string;
  target: "ko" | "en" | "unknown";
  mode: TranslateMode;
  traceKey: string; // used for deterministic "sometimes"
  p?: number;       // probability for "sometimes"
}): Promise<string> {
  const text = String(args.text ?? "");
  const t = text.trim();
  if (!t) return text;
  if (args.target === "unknown") return text;
  if (args.mode === "never") return text;

  // Hard safety: if it's code/data heavy or url-heavy, do not translate at all.
  if (isProbablyCodeOrData(t) || isProbablyUrlHeavy(t)) return text;

  const src = detectTextLangQuick(t);
  const target = args.target;

  // auto: only if clearly different language
  if (args.mode === "auto" || args.mode === "sometimes") {
    if (src === "unknown") return text;
    if (src === target) return text;
  }

  // sometimes: deterministic coin flip
  if (args.mode === "sometimes") {
    const p = typeof args.p === "number" ? args.p : 0.55;
    if (!deterministicChance(args.traceKey, p)) return text;
  }

  // mask -> translate -> unmask
  const { masked, dict } = maskProtectedSegments(text);
  const translated = await translateReasoning(masked, target);
  return unmaskProtectedSegments(translated, dict);
}
/* ==================================================
   🌍 Reasoning Translation Pipeline (SSOT-safe)
   - StreamEngine 수정 ❌
   - ExecutionEngine 내부 처리
================================================== */

type TranslationBuffer = {
  raw: string;
  timer: NodeJS.Timeout | null;
  lastFlushAt: number;
};

type ReasoningStepBuffer = {
  nextStepIndex: number;
  lastStepId?: string | null;
  flushed: boolean;
};


const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function assertToolType(x: any): asserts x is ToolType {
  if (!x || typeof x !== "string") {
    throw new Error(`Invalid ToolType: ${String(x)}`);
  }
}
// ✅ OpenAI function tool name → 내부 ToolType/YuaExecutionTask로 정규화
function normalizeOpenAIToolNameToToolType(name: string): ToolType {
  switch (name) {
    case "web_search":
      return "OPENAI_WEB_SEARCH" as ToolType;
    case "web_fetch":
      return "OPENAI_WEB_FETCH" as ToolType;
    case "extract_numbers":
      return "PY_SOLVER" as ToolType;
    case "code_interpreter":
      return "OPENAI_CODE_INTERPRETER" as ToolType;
    case "analyze_image":
      return "OPENAI_WEB_SEARCH" as ToolType; // placeholder, handled inline
    case "analyze_csv":
      return "PY_SOLVER" as ToolType; // placeholder, handled inline
    default:
      throw new Error(`UNKNOWN_OPENAI_TOOL:${name}`);
  }
}
 function extractLastSentence(text: string): string {
   const parts = text
     .split(/(?<=[.!?])\s+/)
     .map(s => s.trim())
     .filter(Boolean);
   return parts[parts.length - 1] ?? "";
 }

 function isDuplicateSentence(a: string, b: string) {
   return a.trim() === b.trim();
 }
function toYuaExecutionPlan(
  item: ToolPlanItem,
  attachments?: any[]
): YuaExecutionPlan {
  const confidence = 0.5;

  return {
    task: item.tool as YuaExecutionTask,
    payload: {
      ...item.payload,
      ...(attachments ? { attachments } : {}),
    },
    confidence,
  };
}

function normalizeToolPayload(
  tool: ToolType,
  raw: unknown
): ToolPlanItem["payload"] {
  if (!raw || typeof raw !== "object") {
    throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:NOT_OBJECT`);
  }

  const candidate = raw as {
    query?: unknown;
    url?: unknown;
    domain?: unknown;
    options?: unknown;
  };

  if (tool === "OPENAI_WEB_SEARCH") {
    if (typeof candidate.query !== "string" || !candidate.query.trim()) {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:MISSING_QUERY`);
    }
  }

  if (tool === "OPENAI_WEB_FETCH") {
    if (typeof candidate.url !== "string" || !candidate.url.trim()) {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:MISSING_URL`);
    }
  }

  if (tool === "PY_SOLVER") {
    if (typeof candidate.query !== "string" || !candidate.query.trim()) {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:MISSING_QUERY`);
    }
  }

  let domain: ToolPlanItem["payload"]["domain"] | undefined;
  if (candidate.domain !== undefined) {
    if (typeof candidate.domain !== "string") {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:INVALID_DOMAIN_TYPE`);
    }
    const allowed = new Set([
      "MARKET",
      "MATH",
      "STATISTICS",
      "PHYSICS",
      "CHEMISTRY",
      "DOCUMENT",
      "IMAGE",
    ]);
    if (!allowed.has(candidate.domain)) {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:INVALID_DOMAIN_VALUE`);
    }
    domain = candidate.domain as ToolPlanItem["payload"]["domain"];
  }

  let options: ToolPlanItem["payload"]["options"] | undefined;
  if (candidate.options !== undefined) {
    if (!candidate.options || typeof candidate.options !== "object") {
      throw new Error(`INVALID_TOOL_PAYLOAD:${tool}:INVALID_OPTIONS_TYPE`);
    }
    options = candidate.options as Record<string, unknown>;
  }

  return {
    query:
      typeof candidate.query === "string"
        ? candidate.query
        : String(candidate.query ?? ""),
    domain,
    options,
    ...(typeof candidate.url === "string" && candidate.url.trim()
      ? { url: candidate.url }
      : {}),
  };
}

    /* ==================================================
      ExecutionEngine
    ================================================== */

    export class ExecutionEngine {
      static async execute(opts: ExecuteOpts) {
        let acquired = false;
        let acquiredTier: "FAST" | "NORMAL" | "DEEP" | undefined;
  // 🔥 USAGE GUARD (FREE 5h COOLDOWN)
  // planTier: controller에서 이미 조회해서 전달받음 (중복 DB 쿼리 제거)
  const tier = (opts as any).planTier ?? "free";
 // TODO: REMOVE DEV OVERRIDE BEFORE PROD
// 🔥 DEV OVERRIDE — userId 8은 enterprise 취급
if (opts.userId === 8) {
  (opts as any).planTier = "enterprise";
}

 const MESSAGE_LIMIT_BY_TIER: Record<string, number | null> = {
   free: 20,
   pro: 200,
   business: null,
   enterprise: null,
 };

 const COOLDOWN_HOURS = 5;
 const limit = MESSAGE_LIMIT_BY_TIER[tier];

 if (limit !== null) {
    const today = new Date().toISOString().slice(0, 10);

    const [usageRows]: any = await pool.query(
      `
      SELECT message_count, updated_at
      FROM yua_usage_daily
      WHERE user_id = ?
        AND date = ?
      LIMIT 1
      `,
      [opts.userId, today]
    );

    const used = usageRows?.[0]?.message_count ?? 0;

    if (used >= limit) {
 const updatedAt = usageRows?.[0]?.updated_at
   ? new Date(usageRows[0].updated_at).getTime()
   : Date.now();
      const cooldownUntil = updatedAt + COOLDOWN_HOURS * 60 * 60 * 1000;

      if (Date.now() < cooldownUntil) {
        throw new Error("USAGE_COOLDOWN_ACTIVE");
      }
    }
  }
        if (!opts.workspaceId) {
          throw new Error("WORKSPACE_ID_REQUIRED");
        }
        try {
          return opts.stream
            ? await this.streamExecute(opts)
            : await this.nonStreamExecute(opts);
        } finally {
          // 🔒 최종 안전망 (혹시 stream 내부에서 release 안 됐을 경우)
          if (opts.computeTier) {
            await ComputeGate.release({
              threadId: opts.threadId,
              traceId: opts.traceId,
              userId: opts.userId,
              workspaceId: opts.workspaceId,
              computeTier: opts.computeTier,
              planTier: (opts as any).planTier ?? "free",
            } as any);
          }
        }
      }

      private static async nonStreamExecute(opts: ExecuteOpts) {
      const { prompt, mode, outmode } = opts;

      

    const normalizedPrompt = normalizePrompt(prompt);

    const currentPrompt = normalizedPrompt;

    const YUA_CONTROL_RE =
  /⟦YUA⟧\s*\{[\s\S]*?\}\s*⟦\/YUA⟧/g;

      if (!currentPrompt || !currentPrompt.trim()) {
        console.error("[FATAL][EXECUTION_EMPTY_PROMPT]", {
          mode,
          originalPrompt: prompt,
        });
        return {
          type: "text",
          text: "…",
        };
      }

        return runOpenAIRuntime({
          workspaceId: opts.workspaceId,
          userMessage: normalizedPrompt,
          attachments: opts.attachments,
          developerHint: buildDeveloperHint(opts),
          mode: mode as any,
          outmode: outmode as any,
          stream: false,
        });
    }
    

      /* ---------------------------------------------
        🔥 STREAM EXECUTION (FINAL vs DONE 분리)
      --------------------------------------------- */
    private static async streamExecute(opts: ExecuteOpts) {
      const {
        prompt,
        mode,
        outmode,
        threadId,
        traceId,
      } = opts;
      let localSeq = 0;
      const nextSeq = () => ++localSeq;
  // 🔒 ComputeGate는 controller에서 이미 acquire 완료 (이중 acquire 제거)
  // controller가 gate 통과 후 computeTier를 넘겨줌
 const normalizedPrompt = normalizePrompt(prompt);
 // Intent detection should use raw user message only (not full compiled prompt with history)
 const intentTarget = opts.rawUserMessage
   ? normalizePrompt(opts.rawUserMessage)
   : normalizedPrompt;

 // 🔥 SSOT: language hint is locked from FIRST user message only
 const initialUserLang =
   StreamEngine.getSession(threadId)?.initialUserLang ??
   detectUserLanguageHint(normalizedPrompt);
 console.debug("[USER_LANG_HINT]", {
   threadId,
   detected: initialUserLang,
   sample: normalizedPrompt.slice(0, 60),
 });

 if (!StreamEngine.getSession(threadId)?.initialUserLang) {
   const s = StreamEngine.getSession(threadId);
   if (s) {
     s.initialUserLang = initialUserLang;
   }
 }
const userLangHint: "ko" | "en" =
  initialUserLang === "ko" ? "ko" : "en";
        let metaEmitted = false;
        let thinkingProfile: "FAST" | "NORMAL" | "DEEP" = opts.thinkingProfile;
      const emitSessionMeta = async () => {
        if (metaEmitted) return;
        metaEmitted = true;

        thinkingProfile = opts.thinkingProfile;
        const deepVariant = opts.deepVariant ?? "STANDARD";
        const modelId = opts.modelId ?? resolveRuntimeModelId(mode as any);

        await StreamEngine.publish(threadId, {
          event: "stage",
          stage: StreamStage.THINKING,
          traceId,
          meta: { openaiSeq: nextSeq(), thinkingProfile, deepVariant, modelId },
        } as any);
      };

      await emitSessionMeta();
/* ============================================
   🔒 HARD SAFETY CAPS (폭주 방지 SSOT)
============================================ */
 // 🔥 GPT-like sweet spot
 let HARD_SEGMENT_CAP =
   opts.thinkingProfile === "DEEP"
     ? 3
     : 2;

 // SEARCH + DEEP은 과도 루프 방지
 if (opts.thinkingProfile === "DEEP" && opts.path === "SEARCH") {
   HARD_SEGMENT_CAP = 3;
 }

  // 🔥 Dynamic expansion
  if (
    opts.thinkingProfile === "DEEP" &&
    opts.failureRisk === "HIGH"
  ) {
    HARD_SEGMENT_CAP += 2;
  }

  if (opts.path === "RESEARCH") {
    HARD_SEGMENT_CAP += 2;
  }

 // Tool-use needs at least 3: (1) tool request, (2) tool result, (3) retry if empty
 const MAX_TOTAL_EXECUTIONS =
   opts.deepVariant === "EXPANDED" ? 4 : 3;
let totalExecutions = 0;

          /* ============================================
          PHASE 6 — CONTINUATION LIMITS (SSOT)
        ============================================ */
        const policy = opts.computePolicy;
        const MAX_SEGMENTS =
          typeof policy?.maxSegments === "number"
            ? policy.maxSegments
            : (mode === "DEEP" ? 5 :
               mode === "SEARCH" ? 4 :
               mode === "NORMAL" ? 2 :
               1);

        const MIN_TOKENS_PER_SEGMENT = 32;

        const isShallow = mode === "FAST";

            const allowSearch =
          typeof policy?.allowSearch === "boolean"
            ? policy.allowSearch
            : (mode === "SEARCH" || mode === "DEEP");

        // 🔒 TOOL_GATE ENFORCEMENT (minimal, best-effort)
        // ToolGate decision is logged earlier as allowedTools:[...]
        // We read it from reasoning snapshot if present; otherwise default to [].
        const toolGateAllowedTools: string[] = (() => {
          const r: any = StreamEngine.getReasoning(threadId);
          const a =
            r?.allowedTools ??
            r?.toolGate?.allowedTools ??
            r?.tool_gate?.allowedTools ??
            [];
          return Array.isArray(a) ? a : [];
        })();

        // ✅ Built-in web tool (server-executed) should be exposed as `web_search_preview`
        // NOT as a function tool named "web_search".
        // 🔥 SEARCH PATH FORCE OVERRIDE (minimal patch)
        // If execution path is SEARCH, always allow built-in web search tool
 const forceSearchPath =
   opts.path === "SEARCH" || opts.forceSearch === true;

 const explicitSearchIntent =
   /(?:\bsearch\s*(for)?\b|\blook\s*up\b|\bfind\s*(me|out)?\b|검색\s?해|검색\s?좀|검색해줘|검색해봐|찾아봐|찾아줘|찾아보다|서치)/i
     .test(intentTarget.trim());

        const allowWebSearch =
          // ✅ NORMAL에서도 "SEARCH path/명시 검색 의도"면 web search 허용
          forceSearchPath ||
          explicitSearchIntent ||
          (allowSearch &&
            (toolGateAllowedTools.includes("OPENAI_WEB_SEARCH") ||
              toolGateAllowedTools.includes("OPENAI_WEB_FETCH")));
// 🔥 OpenAI built-in tool registry (SSOT)
const openaiTools: any[] = [];

if (allowWebSearch) {
  openaiTools.push({ type: "web_search_preview" });
}

// code_interpreter: DEEP/NORMAL + attachment or math/code intent
const allowCodeInterpreter =
  (thinkingProfile === "DEEP" || mode === "NORMAL") &&
  (opts.attachments?.some(a => a.kind !== "image") ||
   toolGateAllowedTools.includes("OPENAI_CODE_INTERPRETER") ||
   /(?:계산|분석|차트|그래프|시각화|compute|calculate|chart|graph|plot|analyze|visualize)/i
     .test(intentTarget));

if (allowCodeInterpreter) {
  openaiTools.push({ type: "code_interpreter", container: { type: "auto" } });
}

// analyze_image / analyze_csv as function tools when attachments present
const hasImageAttach = opts.attachments?.some(a => a.kind === "image");
const hasCsvAttach = opts.attachments?.some(
  a => a.kind === "file" && (
    a.mimeType?.includes("csv") ||
    a.mimeType?.includes("spreadsheet") ||
    a.name?.endsWith(".csv") ||
    a.name?.endsWith(".xlsx")
  )
);
const functionTools: any[] = [];
if (hasImageAttach) {
  functionTools.push({
    type: "function",
    name: "analyze_image",
    description: "Analyze an uploaded image in detail. Describe contents, extract text (OCR), identify objects, read charts/graphs.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to focus on when analyzing the image" },
        detail: { type: "string", enum: ["auto", "low", "high"] },
      },
      required: ["query"],
      additionalProperties: false,
    },
  });
}
if (hasCsvAttach) {
  functionTools.push({
    type: "function",
    name: "analyze_csv",
    description: "Analyze CSV/spreadsheet data. Extract schema, statistics, detect anomalies and trends.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to analyze in the data" },
        focus: { type: "string", enum: ["schema", "statistics", "anomalies", "trends", "all"], description: "Analysis focus area" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  });
}

// quant_analyze: 주식/금융 의도 감지 시 tool 등록
// Uses intentTarget (raw user message only) to prevent false positives from conversation history
// Strong keywords (직접 금융): 1개만 매칭돼도 활성화
// Weak keywords (범용 가능): 2개 이상 매칭돼야 활성화
const QUANT_STRONG = /(?:주식|종목|주가|코스피|코스닥|나스닥|다우|S&P|시세|RSI|MACD|볼린저|이동평균|Monte\s*Carlo|몬테카를로|VaR|sharpe|drawdown|ticker)/i;
const QUANT_WEAK = /(?:차트|기술적.?분석|시뮬레이션|예측|forecast|변동성|리스크|stock|portfolio)/gi;
const quantIntent = (() => {
  if (QUANT_STRONG.test(intentTarget)) return true;
  const weakMatches = intentTarget.match(QUANT_WEAK);
  return (weakMatches?.length ?? 0) >= 2;
})();

if (quantIntent) {
  functionTools.push({
    type: "function",
    name: "quant_analyze",
    description:
      "주식/금융 데이터 분석 도구. 실시간 시세, 기술적 지표(RSI, MACD, 볼린저밴드, SMA, EMA 등), " +
      "가격 예측(시계열 추세), Monte Carlo 시뮬레이션(확률 분포), 리스크 분석(변동성, VaR, Sharpe)을 수행합니다. " +
      "사용자의 질문 의도에 맞는 action과 ticker를 판단하여 호출하세요.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description:
            "수행할 분석 유형: " +
            "analyze(기술적 분석 — RSI, MACD, BB 등 지표 계산), " +
            "forecast(시계열 가격 예측), " +
            "simulate(Monte Carlo 확률 시뮬레이션), " +
            "risk(리스크 분석 — 변동성, VaR, Sharpe, 최대낙폭)",
        },
        ticker: {
          type: "string",
          description:
            "종목 코드 또는 심볼. 한국 주식은 6자리 숫자 코드, " +
            "미국 주식은 티커 심볼. 사용자가 종목명으로 물어보면 적절한 코드로 변환하세요.",
        },
        period: {
          type: "string",
          description: "분석 기간. 예: 1mo, 3mo, 6mo, 1y, 2y. 기본값 6mo. 사용자 의도에 맞게 선택.",
        },
        indicators: {
          type: "array",
          items: { type: "string" },
          description: "analyze 시 계산할 지표 목록. 예: RSI, MACD, BB, SMA, EMA. 생략 시 전체 계산.",
        },
        forecastDays: {
          type: "number",
          description: "forecast/simulate 시 예측할 일수. 기본 30, 최대 90.",
        },
        simulations: {
          type: "number",
          description: "simulate 시 Monte Carlo 시뮬레이션 횟수. 기본 1000, 최대 10000.",
        },
      },
      required: ["action", "ticker"],
      additionalProperties: false,
    },
  });
}

openaiTools.push(...functionTools);

 const openaiToolChoice =
   openaiTools.length > 0
     ? (forceSearchPath ? "required" : "auto")
     : undefined;

        if (process.env.YUA_DEBUG_OPENAI_TOOLS === "1") {
          console.log("[OPENAI_TOOLS_EFFECTIVE]", {
            threadId,
            traceId,
            allowSearch,
            allowWebSearch,
            toolGateAllowedTools,
            openaiTools: openaiTools.map((t: any) => t?.type ?? "unknown"),
          });
        }
        const maxSearchRetriesPerSegment =
          typeof policy?.maxSearchRetriesPerSegment === "number"
            ? policy.maxSearchRetriesPerSegment
            : 2;

        const executionAbort = new AbortController();
    StreamEngine.attachExecutionAbort(threadId, executionAbort);

        const reasoningSessionId = opts.sessionId ?? null;
// 🔒 SSOT: ReasoningSessionController (seq 단일 소유)
const reasoningController =
  reasoningSessionId && opts.thinkingProfile === "DEEP"
    ? new ReasoningSessionController({
        threadId,
        traceId,
        mode: opts.thinkingProfile,
        sessionId: reasoningSessionId,
      })
    : null;
    const basePrompt = normalizedPrompt;

        let currentPrompt = basePrompt;
        let buffer = "";
        let fullAnswer = ""; // 🔥 assistant 전체 답변 누적 (DB 저장용)

  // Activity Timeline SSOT (UI grouping)
  let reasoningBlocksSeen = 0;
  const MAX_REASONING_BLOCKS = 7;
  let segmentIndex = 0;
 let currentPhase: "THINKING" | "ANSWER" = "THINKING";
  let phaseSwitchPending = false;

  const switchPhase = async (next: "THINKING" | "ANSWER") => {
    if (currentPhase === next) return;

    currentPhase = next;

    // 🔥 ChatGPT 느낌의 레이어 분리용 딜레이
    await delay(400);
  };

  const activityAggregator = new ActivityAggregator();

  // ✅ 중앙 래퍼: activity publish 시 groupIndex 주입을 강제
  const publishActivity = async (
    stage: StreamStage,
    payload: { op: "ADD" | "PATCH" | "END"; item: any },
    extra?: any
  ) => {
    const item = payload.item ?? {};
    const meta = { ...(item.meta ?? {}), groupIndex: segmentIndex };
    // SSOT: backend keeps activity title/body as original text.
    const title = item.title;
    const mergedActivities = activityAggregator.merge({
      op: payload.op,
      item: { ...item, title, meta },
    });

    for (const merged of mergedActivities) {
      await StreamEngine.publish(threadId, {
        event: "activity",
        stage,
        traceId,
        meta: { ...(extra?.meta ?? {}), openaiSeq: nextSeq() },
        ...(extra ?? {}),
        activity: merged,
      });
    }
  };
     /**
     * ✅ B안(문서 그대로): tool call delta를 “토큰”이 아니라
     * activity(overlay timeline)로 흘린다.
     */
    const startedToolNames = new Map<string, string | null>(); // callId -> name
    const toolArgText = new Map<string, string>(); // callId -> args (delta accumulation)
    const completedToolCalls = new Set<string>(); // callId 완료 표시
    const ensuredActivityIds = new Set<string>(); // “ADD 1회” 보장
    const endedActivityIds = new Set<string>(); // END 중복 방지
    const nativeToolOutputs = new Map<string, unknown>(); // callId -> output
    const pendingOpenAIToolCalls = new Set<string>(); // callId guard (prevents 400 loops)
    let hasThinkingActivity = false;
    const seedActivityId = `seed:${traceId}`;
    if (thinkingProfile === "DEEP" && !ensuredActivityIds.has(seedActivityId)) {

      ensuredActivityIds.add(seedActivityId);
      hasThinkingActivity = true;
  await publishActivity(StreamStage.THINKING, {
    op: "ADD",
    item: {
      id: seedActivityId,
      kind: ActivityKind.ANALYZING_INPUT,
      status: "RUNNING",
      title: "",
      inlineSummary: "",
      at: Date.now(),
      meta: { thinkingProfile },
    },
  });
    }
 // -------------------------------
 // 🔥 STREAM RHYTHM SPLIT (SSOT)
 // -------------------------------
const STREAM_BASE_MS = 58;          // 기본 미세 리듬
const STREAM_PARAGRAPH_MS = 110;    // 문단 끝일 때
const STREAM_ACTIVITY_MS = 320;     // activity 최소 간격
  // 🔥 NEW: Sentence-end easing cadence (SSOT)
  // - 기본은 빠르게 (문장 진행 중)
  // - 문장 끝(마침표/물음표/느낌표 등)에서만 "살짝" 느려짐
  // - abrupt step 금지 → easing curve로 접근/해제
  const TOKEN_CADENCE_BASE_MS = 45;        // 문장 진행 중 기본
  const TOKEN_CADENCE_SENT_END_MAX_MS = 78; // 문장 끝 최대(살짝) 슬로우
  const TOKEN_CADENCE_RELAX_MS = 220;      // sentence-end 감속 해제 속도 느낌(간접)

  const SENTENCE_END_RE =
    /(?:[.!?…]|[。！？])\s*$/;

  // 0..1 (문장 끝 감속 강도)
  let sentenceEase = 0;
  let lastSentenceEaseAt = 0;

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const getTokenCadenceMs = (chunk: string) => {
    const now = Date.now();
    if (!lastSentenceEaseAt) lastSentenceEaseAt = now;

    const dt = now - lastSentenceEaseAt;
    lastSentenceEaseAt = now;

    const isSentenceEnd = SENTENCE_END_RE.test((chunk ?? "").trimEnd());

    // 문장 끝이면 빠르게 올라가고(감속 강도↑), 아니면 서서히 내려감(감속 강도↓)
    if (isSentenceEnd) {
      // 한 번에 확 튀지 않게 0.35씩 누적 (최대 1)
      sentenceEase = clamp01(sentenceEase + 0.35);
    } else {
      // time-based relax 느낌 (dt가 커도 자연스럽게)
      const k = clamp01(dt / TOKEN_CADENCE_RELAX_MS);
      sentenceEase = clamp01(sentenceEase - 0.35 * k);
    }

    // 문단 끝이면 기존 정책 유지 (문단 끝 pause는 sentence-end보다 우선)
    if (/\n\s*\n$/.test(chunk)) return STREAM_PARAGRAPH_MS;

    const t = easeOutCubic(sentenceEase);
    const target =
      TOKEN_CADENCE_BASE_MS +
      (TOKEN_CADENCE_SENT_END_MAX_MS - TOKEN_CADENCE_BASE_MS) * t;

    return Math.round(target);
  };

 let lastTokenFlushAt = Date.now();
 let lastActivityFlushAt = 0;



 const ACTIVITY_THROTTLE_MS = STREAM_ACTIVITY_MS;
        let idleTimer: NodeJS.Timeout | null = null;
        let finalEmitted = false;
        let doneEmitted = false;
        let answerUnlockedEmitted = false;
        let reasoningBlockEmitted = false;
        let pendingAnswerUnlock = false;
        let answerUnlockGraceTimer: NodeJS.Timeout | null = null;
        const ANSWER_UNLOCK_GRACE_MS = 2000; // reasoning이 안 오면 여기서 강제 unlock
        let reasoningDone = false;
        let reasoningDoneEmitted = false;
        let lastReasoningBlockId: string | null = null;
        let lastSegmentTokenCount = MIN_TOKENS_PER_SEGMENT;
        let lastToolResult: {
          result?: unknown;
          confidence?: number;
        } | null = null;
        let lastToolName: string | null = null;
        let lastToolOutput: unknown = undefined;
        let previousResponseId: string | null = null;
        let conversationId: string | null = null;
        let continuationInput: any[] | null = null;
        let pendingContinuation:
   | {
       input: any[];
       reason: "tool";
       activityId: string;
     }
   | null = null;

        // Hoisted to outer scope so endAllRunningReasoningActivities can access it
        const structuredBuffers = new Map<number, ReasoningStepBuffer>();
        const structuredEmitting = new Map<number, Promise<void>>();

        const flushTokenBuffer = async () => {
          if (!buffer) return;
          const now = Date.now();
          const targetDelay = getTokenCadenceMs(buffer);
          const elapsed = now - lastTokenFlushAt;
          if (elapsed < targetDelay) {
            const jitter = Math.floor(Math.random() * 6); // 0~5ms
            await delay(targetDelay - elapsed + jitter);
          }
          await StreamEngine.publish(threadId, {
            traceId,
            event: "token",
            stage: StreamStage.ANSWER,
            token: buffer,
            meta: { openaiSeq: nextSeq() },
          });
          buffer = "";
          lastTokenFlushAt = Date.now();
        };

        const ensureReasoningBlock = async () => {
          if (thinkingProfile !== "DEEP") return;
          if (reasoningBlockEmitted) return;
          return;
        };

        const endAllRunningReasoningActivities = async () => {
          // END all reasoning activities still in RUNNING state before answer starts
          const structuredBuf = structuredBuffers.get(segmentIndex);
          if (structuredBuf?.lastStepId && !endedActivityIds.has(structuredBuf.lastStepId)) {
            endedActivityIds.add(structuredBuf.lastStepId);
            await publishActivity(StreamStage.THINKING, {
              op: "END",
              item: {
                id: structuredBuf.lastStepId,
                kind: ActivityKind.ANALYZING_INPUT,
                status: "OK",
                at: Date.now(),
              },
            });
          }
          // END seed activity if still running
          if (hasThinkingActivity && !endedActivityIds.has(seedActivityId)) {
            endedActivityIds.add(seedActivityId);
            await publishActivity(StreamStage.THINKING, {
              op: "END",
              item: {
                id: seedActivityId,
                kind: ActivityKind.ANALYZING_INPUT,
                status: "OK",
                at: Date.now(),
              },
            });
          }
          // Flush any buffered reasoning to ensure it's fully emitted
          await StreamEngine.flushReasoningNow(threadId, traceId);
        };

        const emitAnswerUnlock = async (o?: { force?: boolean }) => {
          if (answerUnlockedEmitted) return;

          // Ensure all reasoning is fully flushed and activities END-ed
          await endAllRunningReasoningActivities();

          answerUnlockedEmitted = true;
          await StreamEngine.publish(threadId, {
            event: "stage",
            stage: StreamStage.ANSWER_UNLOCKED,
            traceId,
            meta: { openaiSeq: nextSeq() },
          } as any);
        };
        const flushAnswerBufferNow = async () => {
          if (!buffer) return;
          if (!answerUnlockedEmitted) {
            await emitAnswerUnlock({ force: true });
          }
          await flushTokenBuffer();
        };
 // 🔥 FIX: 한 response에서 tool_call이 여러 개 나올 수 있음 → output 누적
let pendingToolOutputs = new Map<string, any>();
       let verifierBudget =
          policy?.verifierBudget ?? 3;
        let accumulatedConfidenceDelta = 0;

        const totalVerifierBudget = verifierBudget;

        const publishVerifierBudget = async () => {
          await StreamEngine.publish(threadId, {
            event: "stage",
            stage: StreamStage.SYSTEM,
            topic: "verifier_budget",
            traceId,
            meta: {
              openaiSeq: nextSeq(),
              remaining: verifierBudget,
              total: totalVerifierBudget,
            },
          });
        };


 // 🔥 SSOT: Decision에서 내려온 allowContinuation 우선
 const session = StreamEngine.getSession(threadId);

 const LARGE_INPUT_THRESHOLD = 1800;
 const inputLength = normalizedPrompt?.length ?? 0;
 const baseAllowContinuation =
   session?.allowContinuation ??
   (StreamEngine.getReasoning(threadId)?.conversationalOutcome === "CONTINUE_HARD" ||
    StreamEngine.getReasoning(threadId)?.conversationalOutcome === "CONTINUE_SOFT");

 const tokenOverflow =
   StreamEngine.getReasoning(threadId)?.tokenSafety === "OVERFLOW";

 const allowContinuation =
   !tokenOverflow &&
   baseAllowContinuation;

  const urlToChip = (url: string): SourceChip => {
    let host: string | null = null;
    try { host = new URL(url).hostname || null; } catch {}
    return {
      id: url,
      label: host ?? url,
      url,
      host,
    };
  };

  const urlsToChips = (urls: string[]) => {
    return (urls ?? []).filter(Boolean).slice(0, 12).map(urlToChip);
  };

  const buildToolResultInput = (callId: string, output: unknown) => {
    const safe =
      typeof output === "string" ? output : JSON.stringify(output, null, 2);
    return [
      {
        // ✅ Responses API: tool output은 function_call_output
        type: "function_call_output",
        call_id: callId,
        output: safe,
      },
    ] as any[];
  };

  const buildContinuationMessageInput = (text: string) => {
    return [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    ] as any[];
  };

          console.log("[EXEC][CONTINUATION_DECISION]", {
  threadId,
  segmentIndex,
  allowContinuation,
  turnIntent: StreamEngine.getTurnIntent(threadId),
  conversationalOutcome:
    StreamEngine.getReasoning(threadId)?.conversationalOutcome,
  tokenOverflow:
    StreamEngine.getReasoning(threadId)?.tokenSafety === "OVERFLOW",
});

        /* -------------------------------------------
          FINAL 판단용 idle 타이머
        ------------------------------------------- */
        let idleTimerExpiry = 0;
        const armIdleTimer = (ms: number) => {
          const now = Date.now();
          // Skip re-arm if timer hasn't expired yet (avoid excessive clearTimeout/setTimeout)
          if (idleTimer && now < idleTimerExpiry) return;
          if (idleTimer) clearTimeout(idleTimer);
          idleTimerExpiry = now + ms;
          idleTimer = setTimeout(() => { idleTimer = null; }, ms);
        };

        await publishVerifierBudget();

        // 🔒 SSOT: 스트리밍 시작 전 빈 assistant 메시지 선제 INSERT
        // → 새로고침 시에도 DB에서 조회 가능 (content 빈 상태 → 완료 시 UPDATE)
        let pendingAssistantMsgId: number | null = null;
        try {
          pendingAssistantMsgId = await MessageEngine.addMessage({
            threadId,
            userId: opts.userId,
            role: "assistant",
            content: "",
            traceId,
          });
        } catch (e: any) {
          console.warn("[EXEC][PENDING_MSG_INSERT_FAIL]", e.message);
        }

        try {
          while (
             segmentIndex < Math.min(MAX_SEGMENTS, HARD_SEGMENT_CAP) &&
             totalExecutions < MAX_TOTAL_EXECUTIONS &&
             segmentIndex < 6 && // 🔥 absolute hard cap
            !executionAbort.signal.aborted &&
            !(isShallow && segmentIndex > 0)
          ) {
            const inputOverride = continuationInput;
            continuationInput = null;
            const result = await runOpenAIRuntime({
              workspaceId: opts.workspaceId,
              userMessage: inputOverride ? undefined : currentPrompt,
              attachments: opts.attachments,
              developerHint: buildDeveloperHint(opts),
              mode: mode as any,
              outmode: outmode as any,
              stream: true,
              computePolicy: opts.computePolicy,
              // ✅ SEARCH일 때 reasoning summary를 무겁게(detailed) 쓰면 과도해짐
              reasoning:
                thinkingProfile === "DEEP"
                  ? { summary: opts.path === "SEARCH" ? "auto" : "detailed", effort: opts.path === "SEARCH" ? "low" : "medium" }
                  : undefined,
              // ✅ Enforced tool exposure (built-in web_search_preview only when allowed)
 tools: openaiTools.length > 0 ? openaiTools : undefined,
 toolChoice: openaiToolChoice,
 ...(openaiTools.length > 0
   ? {
       include: [
         "web_search_call.action.sources",
         "web_search_call.results",
       ],
     }
   : {}),
  // 🔥 Soft reasoning language hint (강제 아님)
  reasoningLanguageHint:
    thinkingProfile === "DEEP"
      ? userLangHint
      : undefined,
              previousResponseId,
              conversationId,
              inputOverride: inputOverride ?? undefined,
              signal: executionAbort.signal,
            });
            totalExecutions++;

            if (result.type !== "stream") {
              throw new Error("STREAM_EXPECTED");
            }

            // SEARCH / FAST는 짧게, NORMAL/DEEP은 여유
            const idleMs =
              typeof policy?.idleMs === "number"
                ? policy.idleMs
                : (mode === "SEARCH" || mode === "FAST" ? 1200 : 3000);

            armIdleTimer(idleMs);

        let receivedAnyToken = false;
        let segmentTokenCount = 0;
        let toolOutputInvariantViolated = false;

        const getStructuredBuffer = (segmentIdx: number) => {
          let buf = structuredBuffers.get(segmentIdx);
          if (!buf) {
            buf = {
              nextStepIndex: 0,
              lastStepId: null,
              flushed: false,
            };
            structuredBuffers.set(segmentIdx, buf);
          }
          return buf;
        };

        const emitStructuredStep = async (
          segmentIdx: number,
          step: { title: string; body: string }
        ) => {
  // HARD CAP: reasoning block limit (single counter)
  if (reasoningBlocksSeen >= MAX_REASONING_BLOCKS) {
    return;
  }
          if (structuredEmitting.has(segmentIdx)) {
            await structuredEmitting.get(segmentIdx);
          }
          const buf = getStructuredBuffer(segmentIdx);
          const task = (async () => {
            await delay(240);
            const stepIndex = buf.nextStepIndex++;
            reasoningBlocksSeen++;
            const id = `reasoning:${traceId}:${segmentIdx}:${stepIndex}`;
            buf.lastStepId = id;
            await publishActivity(
              StreamStage.THINKING,
              {
                op: "ADD",
                item: {
                  id,
                  kind: ActivityKind.ANALYZING_INPUT,
                  status: "RUNNING",
                  title: step.title?.trim() || undefined,
                  body: step.body ?? "",
                  inlineSummary:
                  step.title?.trim() ||
                  (step.body ? step.body.slice(0, 80) : undefined),
                  at: Date.now(),
                  meta: {
                    thinkingProfile,
                    segmentIndex: segmentIdx,
                    reasoningIndex: stepIndex,
                  },
                },
              }
            );
          })();
          structuredEmitting.set(segmentIdx, task);
          await task;
          structuredEmitting.delete(segmentIdx);
        };
            for await (const ev of result.stream) {
   if (executionAbort.signal.aborted) {
   throw new Error("EXEC_ABORTED");
  }
              // ✅ Runtime activity(web_search query / sources) → StreamEngine activity로 변환
 if (ev.kind === "activity") {
  const a: any = ev.activity ?? {};
  const callId = typeof a.callId === "string" ? a.callId : null;
  if (!callId) continue;

  const id = `openai_tool:${traceId}:builtin:${callId}`;

  // 🔥 ADD 1회 보장
  if (!ensuredActivityIds.has(id)) {
    ensuredActivityIds.add(id);
    hasThinkingActivity = true;
  // --------------------------------------------------
  // 🔥 Reasoning + Research 자동 병합 (SSOT-safe)
  // structuredBuffers는 이 scope에서만 유효
  const structuredBuf = structuredBuffers.get(segmentIndex);
  const lastStepIndex =
    structuredBuf && typeof structuredBuf.nextStepIndex === "number"
      ? structuredBuf.nextStepIndex - 1
      : -1;

  if (lastStepIndex >= 0) {
    const lastReasoningId =
      `reasoning:${traceId}:${segmentIndex}:${lastStepIndex}`;

    if (!endedActivityIds.has(lastReasoningId)) {
      endedActivityIds.add(lastReasoningId);

      await publishActivity(StreamStage.THINKING, {
        op: "END",
        item: {
          id: lastReasoningId,
          kind: ActivityKind.ANALYZING_INPUT,
          status: "OK",
          at: Date.now(),
        },
      });
    }
  }
    await publishActivity(StreamStage.THINKING, {
      op: "ADD",
      item: {
        id,
        kind: ActivityKind.RESEARCHING,
        status: "RUNNING",
        title: "검색 중…",
        inlineSummary: "웹 검색",
        at: Date.now(),
        meta: {
          tool: "OPENAI_WEB_SEARCH",
          callId,
        },
      },
    });
  }

  if (a.type === "code_interpreter") {
    await publishActivity(StreamStage.THINKING, {
      op: "PATCH",
      item: {
        id,
        kind: ActivityKind.EXECUTING,
        status: "RUNNING",
        title: "Code Interpreter",
        inlineSummary: "Running code...",
        at: Date.now(),
        meta: { tool: "code_interpreter", callId },
      },
    });
    continue;
  }

  if (a.type === "web_search") {
    const q = typeof a.query === "string" ? a.query.trim() : "";

    await publishActivity(StreamStage.THINKING, {
      op: "PATCH",
      item: {
        id,
        kind: ActivityKind.RESEARCHING,
        status: "RUNNING",
        title: undefined,
        body: q,
        inlineSummary: q.slice(0, 80),
        at: Date.now(),
        meta: { callId },
      },
    });

    continue;
  }

  if (a.type === "web_search_result") {
  const sources = Array.isArray(a.sources) ? a.sources : [];
  const chips: SourceChip[] = sources
    .filter((s: any) => typeof s?.url === "string")
    .slice(0, 10)
    .map((s: any) => ({
      id: s.url,
      label: s.title ?? new URL(s.url).hostname ?? s.url,
      url: s.url,
      host: (() => {
        try { return new URL(s.url).hostname; }
        catch { return null; }
      })(),
    }));

 const urls: string[] = chips
   .map((c: SourceChip) => c.url)
   .filter((u: string | null | undefined): u is string => typeof u === "string");

    await publishActivity(StreamStage.THINKING, {
      op: "PATCH",
      item: {
        id,
        kind: ActivityKind.RESEARCHING,
        status: "RUNNING",
        title: undefined,
      body: urls.map(u => `- ${u}`).join("\n"),
      inlineSummary: urls[0] ?? "검색 결과",
        at: Date.now(),
      meta: {
        callId,
        sources: chips,   // 🔥 핵심
      },
      },
    });

    await publishActivity(StreamStage.THINKING, {
      op: "END",
      item: {
        id,
        kind: ActivityKind.RESEARCHING,
        status: "OK",
        at: Date.now(),
      },
    });

    continue;
  }
}

  // code_interpreter output → artifact activity
  if (ev.kind === "code_interpreter_output") {
    const ciId = `code_interpreter:${traceId}:${ev.callId}`;
    const hasImages = Array.isArray(ev.images) && ev.images.length > 0;

    // Emit CODE_OUTPUT artifact (inline vector/chart)
    if (hasImages) {
      for (const img of ev.images) {
        await publishActivity(StreamStage.THINKING, {
          op: "PATCH",
          item: {
            id: ciId,
            kind: ActivityKind.EXECUTING,
            status: "OK",
            title: "Code Interpreter",
            body: ev.code || undefined,
            at: Date.now(),
            artifact: {
              kind: "CODE_OUTPUT",
              imageUrl: img.url,
              mimeType: img.mimeType,
              code: {
                language: "python",
                source: ev.code,
                output: ev.output || undefined,
              },
            },
            meta: { tool: "code_interpreter", callId: ev.callId },
          },
        });
      }
    } else if (ev.output) {
      await publishActivity(StreamStage.THINKING, {
        op: "PATCH",
        item: {
          id: ciId,
          kind: ActivityKind.EXECUTING,
          status: "OK",
          title: "Code Interpreter",
          body: ev.code || undefined,
          at: Date.now(),
          artifact: {
            kind: "CODE_OUTPUT",
            code: {
              language: "python",
              source: ev.code,
              output: ev.output,
            },
          },
          meta: { tool: "code_interpreter", callId: ev.callId },
        },
      });
    }

    await publishActivity(StreamStage.THINKING, {
      op: "END",
      item: {
        id: ciId,
        kind: ActivityKind.EXECUTING,
        status: "OK",
        at: Date.now(),
      },
    });

    // Ensure code_interpreter output is available for continuation
    if (ev.callId) {
      nativeToolOutputs.set(ev.callId, {
        code: ev.code,
        output: ev.output,
        images: ev.images,
      });
    }
    continue;
  }

  // OpenAI usage capture (SSOT)
  if (ev.kind === "usage") {
    const s = StreamEngine.getSession(threadId);
    if (s) {
      s.tokenUsage = {
        input_tokens: ev.usage.input_tokens ?? 0,
        output_tokens: ev.usage.output_tokens ?? 0,
        total_tokens: ev.usage.total_tokens ?? 0,
      };
    }
  }      
              if (ev.kind === "response_created") {
                previousResponseId = ev.responseId ?? previousResponseId;
                if (ev.conversationId) {
                  conversationId = ev.conversationId;
                }
                continue;
              }

              // idle watchdog는 “어떤 server event라도” 들어오면 리셋
              armIdleTimer(idleMs);

              if (ev.kind === "reasoning_block") {
      
                // 🔒 reasoning blocks hard cap (UX + 폭주 방지)
                if (reasoningBlocksSeen >= MAX_REASONING_BLOCKS) {
                  reasoningBlockEmitted = true; // “reasoning 있었음” 표시는 유지
                  continue;
                }
                reasoningBlocksSeen++;
                const b = ev.block ?? {};
                const id =
                  typeof b.id === "string" && b.id
                    ? b.id
                    : `reasoning_block:${traceId}:${segmentIndex}:${Date.now()}`;
                    lastReasoningBlockId = id;
                // ✅ SSOT: reasoning_block is the real hook (runtime already emits it)
                // "sometimes" policy: deterministic per (traceId, segmentIndex, reasoningBlocksSeen)
                const rawBody = typeof b.body === "string" ? b.body : (b.title || "");
const localizedBody = await maybeTranslateText({
  text: rawBody,
  target: userLangHint,
  mode: "always",
  traceKey: `reasoning:${traceId}:${segmentIndex}:${reasoningBlocksSeen}`,
});            await StreamEngine.publish(threadId, {
                  event: "reasoning_block",
                  stage: StreamStage.THINKING,
                  traceId,
                  meta: { openaiSeq: nextSeq(), segmentIndex },
                  block: {
                    id,
                    title: undefined, // 또는 제거
                    body: localizedBody,
                    inlineSummary: (localizedBody || "").slice(0, 120),
                    groupIndex: b.groupIndex ?? segmentIndex,
                  },
                } as any);
                reasoningBlockEmitted = true;
                // reasoning이 도착했으면 grace timer 해제
                if (answerUnlockGraceTimer) {
                  clearTimeout(answerUnlockGraceTimer);
                  answerUnlockGraceTimer = null;
                }
                if (pendingAnswerUnlock && !answerUnlockedEmitted) {
                  pendingAnswerUnlock = false;
                  await emitAnswerUnlock({ force: true });
                  if (answerUnlockedEmitted && buffer) {
                    await flushTokenBuffer();
                  }
                }
                continue;
              }

if (ev.kind === "reasoning_summary_delta") {
  // 🔒 SSOT: disabled (runtime already emits reasoning_block)
  continue;
}
              if (ev.kind === "reasoning_summary_done") {
                await StreamEngine.flushReasoningNow(threadId, traceId);
  if (reasoningDoneEmitted) continue;
  reasoningDone = true;
  reasoningDoneEmitted = true;

                // ✅ SSOT: reasoning_done은 "ANSWER 시작"의 유일한 직전 시그널
                if (thinkingProfile === "DEEP" && lastReasoningBlockId) {
                  await StreamEngine.publish(threadId, {
                    event: "reasoning_done",
                    traceId,
                    meta: { openaiSeq: nextSeq(), segmentIndex },
                    reasoning_done: { id: String(lastReasoningBlockId) },
                  } as any);
                }

                // ✅ 이제서야 ANSWER phase unlock
                if (!answerUnlockedEmitted) {
                  pendingAnswerUnlock = false;
                  await emitAnswerUnlock({ force: true });
                  await switchPhase("ANSWER");
                  if (buffer) await flushTokenBuffer();
                }
           // ✅ SSOT: segment boundary resets (reasoning gate)
           reasoningDone = false;
           lastReasoningBlockId = null;
           pendingAnswerUnlock = false;
           if (answerUnlockGraceTimer) {
             clearTimeout(answerUnlockGraceTimer);
             answerUnlockGraceTimer = null;
           }
                // Reasoning activities already END-ed by emitAnswerUnlock()
                continue;
              }
              // ---------- B안: server events → stream overlay / token ----------
              if (ev.kind === "tool_call_output") {
                if (!ev.callId) continue;
 if ((ev as any).toolType === "builtin") {
   const session = StreamEngine.getSession(threadId);
   const urls =
     Array.isArray((ev as any)?.output?.sources)
       ? (ev as any).output.sources
       : Array.isArray((ev as any)?.output?.action?.sources)
       ? (ev as any).output.action.sources
       : [];

   if (session && urls.length > 0) {
     const chips = urls
       .filter((u: any) => typeof u?.url === "string")
       .map((u: any) => ({
         id: u.url,
         label: u.title ?? u.url,
         url: u.url,
         host: (() => {
           try { return new URL(u.url).hostname; } catch { return null; }
         })(),
       }));

     // 🔥 SSOT: merge (덮어쓰기 X)
     const existing = Array.isArray(session.webSources)
       ? session.webSources
       : [];

     const merged = [...existing];

     for (const c of chips) {
       if (!merged.some(e => e.url === c.url)) {
         merged.push(c);
       }
     }

     session.webSources = merged;
    // 🔥 패널에도 바로 emit
    const id = `openai_tool:${traceId}:builtin:${ev.callId}`;

    await publishActivity(StreamStage.THINKING, {
      op: "PATCH",
      item: {
        id,
        kind: ActivityKind.RESEARCHING,
        status: "RUNNING",
        title: undefined,
        body: chips.map((c: SourceChip) => `- ${c.url}`).join("\n"),
        inlineSummary: chips[0]?.url ?? "검색 출처",
        at: Date.now(),
        meta: {
          callId: ev.callId,
          sources: chips,  // 🔥 패널 전용 source chips
        },
      },
    });
   }
 }
                nativeToolOutputs.set(ev.callId, ev.output);
                continue;
              }
              if (ev.kind === "text_delta") {
                // ✅ SSOT: DEEP에서는 reasoning_done(또는 grace) 전까지 본문 시작 금지
                if (thinkingProfile === "DEEP" && !answerUnlockedEmitted) {
                  pendingAnswerUnlock = true;
                  if (!answerUnlockGraceTimer) {
                    answerUnlockGraceTimer = setTimeout(async () => {
                      // reasoning이 끝까지 안 오면 grace로 unlock (UX safety)
                      if (!answerUnlockedEmitted) {
                        await emitAnswerUnlock({ force: true });
                        await switchPhase("ANSWER");
                        if (buffer) await flushTokenBuffer();
                      }
                    }, ANSWER_UNLOCK_GRACE_MS);
                  }
                }
                const raw = ev.delta;
                if (!raw) continue;

                // 🔒 SSOT: UI control directive는 content로 절대 누적 금지
                let token = raw.replace(YUA_CONTROL_RE, "");
                if (!token) continue;


 // 🔒 SSOT: suffix-only append (prefix dedupe)
 const prev = fullAnswer;

 let appendPart = token;

 // prefix-growing delta 방어
 if (prev && token.startsWith(prev)) {
   appendPart = token.slice(prev.length);
 }

 // 일부 겹침 방어 (부분 prefix)
 else {
   const maxOverlap = Math.min(prev.length, token.length);
   for (let i = maxOverlap; i > 0; i--) {
     if (prev.endsWith(token.slice(0, i))) {
       appendPart = token.slice(i);
       break;
     }
   }
 }

 if (appendPart) {
   fullAnswer += appendPart;
   buffer += appendPart;
 }
                receivedAnyToken = true;
                segmentTokenCount += token.length;
              }

              // ✅ SSOT: DEEP에서는 unlock 전까지 flush 금지
              if (buffer) {
                if (thinkingProfile !== "DEEP" || answerUnlockedEmitted) {
                  await flushTokenBuffer();
                }
              }
              if (ev.kind === "tool_call_started") {
          
 if (ev.callId && (ev as any).toolType !== "builtin") {
   pendingOpenAIToolCalls.add(ev.callId);
 }

                const id = `openai_tool:${traceId}:${ev.toolType}:${ev.callId}`;
                startedToolNames.set(ev.callId, ev.name ?? null);
                if (!ensuredActivityIds.has(id)) {
                  ensuredActivityIds.add(id);
                  hasThinkingActivity = true;
 const now = Date.now();
                  const isBuiltin = (ev as any).toolType === "builtin";
                  const shouldEmit =
                    isBuiltin || (now - lastActivityFlushAt >= ACTIVITY_THROTTLE_MS);
                  if (shouldEmit) {
                    if (!isBuiltin) lastActivityFlushAt = now;
 await publishActivity(
   StreamStage.THINKING,
   {
     op: "ADD",
     item: {
       id,
       kind: ActivityKind.EXECUTING,
       status: "RUNNING",
       title: undefined, // 🔥 LLM title async
       body: "",
       inlineSummary: undefined,
       at: Date.now(),
       meta: {
         tool: ev.toolType,
         callId: ev.callId,
         toolEvent: "TOOL_CALL_DETECTED",
       },
     },
   },

 );
                }
              }
            }
              if (ev.kind === "tool_call_arguments_delta") {
                const id = `openai_tool:${traceId}:${ev.toolType}:${ev.callId}`;
                const prev = toolArgText.get(ev.callId) ?? "";
                const next = prev + (ev.delta ?? "");
                toolArgText.set(ev.callId, next);

  if (!ensuredActivityIds.has(id)) {
    ensuredActivityIds.add(id);
    hasThinkingActivity = true;
    await publishActivity(
     StreamStage.THINKING,
     {
       op: "ADD",
       item: {
         id,
         kind: ActivityKind.EXECUTING,
         status: "RUNNING",
       title: startedToolNames.get(ev.callId) ?? "Tool",
       body: toolArgText.get(ev.callId) ?? "",
       inlineSummary: startedToolNames.get(ev.callId) ?? undefined,
         at: Date.now(),
         meta: {
           tool: ev.toolType,
           callId: ev.callId,
           toolEvent: "TOOL_CALL_DETECTED",
         },
       },
     },
  
    );
  }

  await publishActivity(
   StreamStage.THINKING,
   {
     op: "PATCH",
     item: {
       id,
       kind: ActivityKind.EXECUTING,
       status: "RUNNING",
      title: undefined, // 🔥 LLM title async
      body: next,
      inlineSummary: undefined,
       at: Date.now(),
       meta: { tool: ev.toolType, callId: ev.callId },
     },
   },

 );
              }

              if (ev.kind === "tool_call_arguments_done") {
                const id = `openai_tool:${traceId}:${ev.toolType}:${ev.callId}`;
                const argsText = toolArgText.get(ev.callId) ?? "";
                pendingOpenAIToolCalls.delete(ev.callId);
                await publishActivity(
                  StreamStage.THINKING,
                  {
                    op: "PATCH",
                    item: {
                      id,
                      kind: ActivityKind.EXECUTING,
                      status: "RUNNING",
                      title: undefined, // 🔥 LLM title async
                      body: argsText,
                      inlineSummary: undefined,
                      at: Date.now(),
                      meta: {
                        tool: ev.toolType === "function" ? "OPENAI_FUNCTION" : "OPENAI_CUSTOM",
                        callId: ev.callId,
                        toolEvent: "TOOL_EXECUTING",
                      },
                    },
                  },
               
                );

             // 🔥 NEW: tool 실행 (SSOT: ExecutionEngine 단일)
  if (!argsText) {
    throw new Error("INVALID_TOOL_ARGUMENTS_JSON:EMPTY");
  }
  let parsedArgs: unknown;
  try {
    parsedArgs = JSON.parse(argsText);
  } catch {
    throw new Error("INVALID_TOOL_ARGUMENTS_JSON:PARSE_FAILED");
  }

  const rawToolName = startedToolNames.get(ev.callId);
 if (!rawToolName) {
   console.warn("[TOOL_ARGUMENTS_DONE_WITHOUT_START]", {
     callId: ev.callId,
   });
   continue; // 🔒 segment 유지, 모델 재진입 허용
 }
 const isNativeTool =
   rawToolName === "web_search" ||
   rawToolName === "web_fetch" ||
   rawToolName === "code_interpreter" ||
   rawToolName === "analyze_image" ||
   rawToolName === "analyze_csv" ||
   rawToolName === "quant_analyze";

  // analyze_image: emit IMAGE_PANEL artifact, return image description to model
  if (rawToolName === "analyze_image" && opts.attachments?.length) {
    const imageUrl = opts.attachments.find(a => a.kind === "image")?.url;
    if (imageUrl) {
      const imgActivityId = `image_panel:${traceId}:${ev.callId}`;
      await publishActivity(StreamStage.THINKING, {
        op: "ADD",
        item: {
          id: imgActivityId,
          kind: ActivityKind.IMAGE_ANALYSIS as any,
          status: "RUNNING",
          title: "Analyzing image",
          at: Date.now(),
          artifact: {
            kind: "IMAGE_PANEL" as const,
            imageUrl,
            caption: (parsedArgs as any)?.query ?? "Image analysis",
          },
          meta: { tool: "analyze_image", callId: ev.callId },
        },
      });
      await publishActivity(StreamStage.THINKING, {
        op: "END",
        item: {
          id: imgActivityId,
          kind: ActivityKind.IMAGE_ANALYSIS as any,
          status: "OK",
          at: Date.now(),
        },
      });
      // Call real VisionEngine for actual image analysis
      const visionQuery = (parsedArgs as any)?.query ?? "Image analysis";
      let visionOutput: Record<string, unknown>;
      try {
        let localImagePath = imageUrl;
        if (imageUrl.startsWith("/api/assets/uploads/")) {
          localImagePath = imageUrl.replace("/api/assets/uploads/", "/mnt/yua/assets/uploads/");
        } else if (imageUrl.includes("/api/assets/uploads/")) {
          const idx = imageUrl.indexOf("/api/assets/uploads/");
          localImagePath = imageUrl.slice(idx).replace("/api/assets/uploads/", "/mnt/yua/assets/uploads/");
        }
        // Path traversal guard
        const resolvedPath = nodePath.resolve(localImagePath);
        if (!resolvedPath.startsWith("/mnt/yua/assets/uploads/")) {
          throw new Error("Invalid image path");
        }
        const imageBuffer = await fsReadFile(resolvedPath);
        const ext = nodePath.extname(resolvedPath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
        };
        const mimeType = mimeMap[ext] || "image/png";
        const visionResult = await OpenAIVisionProvider.analyze({
          imageBuffer,
          mimeType,
          tasks: ["ocr", "caption", "scene"],
          pathMode: "NORMAL",
        });
        visionOutput = visionResult.success && visionResult.contextText
          ? { status: "IMAGE_ANALYSIS_COMPLETE", query: visionQuery, analysis: visionResult.contextText, imageUrl }
          : { status: "IMAGE_ANALYSIS_COMPLETE", query: visionQuery, analysis: visionResult.failureCode ?? "No data", imageUrl };
      } catch (visionErr) {
        console.warn("[VISION_ENGINE_FALLBACK]", visionErr);
        visionOutput = { status: "IMAGE_ANALYSIS_COMPLETE", query: visionQuery, analysis: "Vision analysis unavailable", imageUrl };
      }
      nativeToolOutputs.set(ev.callId, visionOutput);
    } else {
      // No image attachment found — return explicit error
      nativeToolOutputs.set(ev.callId, { status: "IMAGE_ANALYSIS_ERROR", error: "No image attachment found" });
    }
  }

  // analyze_csv: emit CSV_PREVIEW artifact, run FileAnalyzer, return results to model
  if (rawToolName === "analyze_csv") {
    const csvActivityId = `csv_preview:${traceId}:${ev.callId}`;
    const csvQuery = (parsedArgs as any)?.query ?? "Analyze data";
    const csvFocus = (parsedArgs as any)?.focus ?? "all";
    await publishActivity(StreamStage.THINKING, {
      op: "ADD",
      item: {
        id: csvActivityId,
        kind: ActivityKind.TOOL as any,
        status: "RUNNING",
        title: "Analyzing data",
        inlineSummary: csvQuery,
        at: Date.now(),
        artifact: {
          kind: "CSV_PREVIEW" as const,
          caption: csvQuery,
        },
        meta: { tool: "analyze_csv", callId: ev.callId },
      },
    });

    // Find CSV attachment and resolve file path
    const csvAttachment = opts.attachments?.find(
      a => a.kind === "file" && (
        a.mimeType?.includes("csv") || a.mimeType?.includes("spreadsheet") ||
        a.name?.endsWith(".csv") || a.name?.endsWith(".xlsx")
      )
    );
    const csvUrl = csvAttachment?.url ?? "";
    const csvFilePath = csvUrl.includes("/api/assets/uploads/")
      ? csvUrl.replace(/.*\/api\/assets\/uploads\//, "/mnt/yua/assets/uploads/")
      : csvUrl;

    let csvResult: any;
    try {
      if (!csvFilePath) throw new Error("No CSV/spreadsheet attachment found");
      // Path traversal guard
      const resolvedCsvPath = nodePath.resolve(csvFilePath);
      if (!resolvedCsvPath.startsWith("/mnt/yua/assets/uploads/")) {
        throw new Error("Invalid file path");
      }
      type AnalysisGoal = "summary" | "types" | "stats" | "outliers" | "trend";
      const goalMap: Record<string, AnalysisGoal[]> = {
        schema: ["summary", "types"],
        statistics: ["stats"],
        anomalies: ["outliers"],
        trends: ["trend"],
        all: ["summary", "types", "stats", "outliers", "trend"],
      };
      const analysisResult = await runFileAnalysis({
        filePaths: [resolvedCsvPath],
        goals: goalMap[csvFocus] ?? goalMap.all,
      });
      csvResult = {
        status: "CSV_ANALYSIS_COMPLETE",
        query: csvQuery,
        focus: csvFocus,
        output: analysisResult.output,
        metrics: analysisResult.metrics,
        warnings: analysisResult.warnings,
      };
    } catch (csvErr: any) {
      console.warn("[CSV_ANALYSIS_ERROR]", csvErr);
      csvResult = { status: "CSV_ANALYSIS_ERROR", query: csvQuery, error: "CSV analysis failed" };
    }

    await publishActivity(StreamStage.THINKING, {
      op: "END",
      item: {
        id: csvActivityId,
        kind: ActivityKind.TOOL as any,
        status: csvResult.status === "CSV_ANALYSIS_COMPLETE" ? "OK" : "FAIL",
        at: Date.now(),
      },
    });
    nativeToolOutputs.set(ev.callId, csvResult);
  }

  // quant_analyze: Quant Service 호출
  if (rawToolName === "quant_analyze") {
    const { callQuantService } = await import("../../ai/quant/quant-client.js");
    const args = (parsedArgs ?? {}) as any;

    const quantActivityId = `quant:${traceId}:${ev.callId}`;
    await publishActivity(StreamStage.THINKING, {
      op: "ADD",
      item: {
        id: quantActivityId,
        kind: "QUANT_ANALYSIS" as any,
        status: "RUNNING",
        title: `${args.action ?? "analyze"}: ${args.ticker ?? ""}`,
      },
    });

    try {
      const quantResult = await callQuantService({
        action: args.action ?? "analyze",
        ticker: args.ticker ?? "",
        period: args.period,
        indicators: args.indicators,
        forecastDays: args.forecastDays,
        simulations: args.simulations,
      }, executionAbort.signal);

      nativeToolOutputs.set(ev.callId, quantResult);

      await publishActivity(StreamStage.THINKING, {
        op: "PATCH",
        item: {
          id: quantActivityId,
          status: quantResult.ok ? "OK" : "FAILED",
          title: quantResult.ok
            ? `${args.action}: ${args.ticker} 완료`
            : `${args.action}: 실패`,
          body: quantResult.ok
            ? quantResult.data?.summary ?? ""
            : quantResult.error ?? "",
          inlineSummary: quantResult.ok
            ? `${args.ticker} ${args.action} 완료`
            : "분석 실패",
          meta: {
            quantAction: args.action,
            quantData: quantResult.ok ? quantResult.data : null,
            disclaimer: quantResult.disclaimer ?? "",
          },
        },
      });
    } catch (qErr: any) {
      const fallback = {
        ok: false,
        action: args.action ?? "analyze",
        error: `Quant service unavailable: ${qErr.message}`,
        disclaimer: "",
      };
      nativeToolOutputs.set(ev.callId, fallback);

      await publishActivity(StreamStage.THINKING, {
        op: "PATCH",
        item: {
          id: quantActivityId,
          status: "FAILED",
          title: "분석 서비스 연결 실패",
        },
      });
    }
  }

  // OPENAI NATIVE TOOL — DO NOT DISPATCH TO YUA
  // OpenAI already executed web_search / web_fetch / code_interpreter internally.
  // We only need to send function_call_output back for continuation.

  const nativeToolOutput =
    nativeToolOutputs.get(ev.callId) ?? {};
  if (isNativeTool) {
    if (
      nativeToolOutput &&
      typeof nativeToolOutput === "object" &&
      Object.keys(nativeToolOutput as any).length === 0
    ) {
      console.warn("[EMPTY_NATIVE_TOOL_OUTPUT]", ev.callId);
      console.warn("[TOOL_OUTPUT_INVARIANT_VIOLATION]", { callId: ev.callId });
      toolOutputInvariantViolated = true;
      nativeToolOutputs.delete(ev.callId);
      continue;
    }
  }
  nativeToolOutputs.delete(ev.callId);

  completedToolCalls.add(ev.callId);

                hasThinkingActivity = true;
                await publishActivity(
                  StreamStage.THINKING,
                  {
                    op: "END",
                    item: {
                      id,
                      kind: ActivityKind.EXECUTING,
                      status: "OK",
                      title: startedToolNames.get(ev.callId) ?? "",
                      body: argsText,
                      inlineSummary: startedToolNames.get(ev.callId) ?? undefined,
                      at: Date.now(),
                      meta: {
                        tool: ev.toolType === "function" ? "OPENAI_FUNCTION" : "OPENAI_CUSTOM",
                        callId: ev.callId,
                        toolEvent: "TOOL_RESULT_RECEIVED",
                      },
                    },
                  },
               
                );
                const continuationCallId = ev.callId;

 // 🔥 SSOT FIX: ALL function calls (including native tools)
 // MUST receive function_call_output before continuation.
 const items = buildToolResultInput(
   continuationCallId,
   nativeToolOutput ?? {}
 );

 for (const it of items) {
   if (!it?.call_id) {
     throw new Error("TOOL_CONTINUATION_MISSING_CALL_ID");
   }

   if (!pendingToolOutputs.has(it.call_id)) {
     pendingToolOutputs.set(it.call_id, it);
   }
 }
              }
            }
            // 🔒 CONTINUATION PRIORITY (SSOT)
            // 1) batched tool outputs
            // 2) explicit pendingContinuation (tool/search)
            // 3) decideContinuation()
            // 🔥 CRITICAL: if model asked for function tool output and we didn't supply it,
            // do NOT re-call with previous_response_id (causes 400 "No tool output found...")
            if (pendingOpenAIToolCalls.size > 0) {
              console.warn("[OPENAI_TOOL_CALLS_PENDING_NO_OUTPUT]", {
                traceId,
                pending: Array.from(pendingOpenAIToolCalls.values()),
              });
              throw new Error("OPENAI_TOOL_CALL_OUTPUT_MISSING");
            }

            if (pendingToolOutputs.size > 0) {
              if (!previousResponseId && !conversationId) {
                throw new Error("OPENAI_CONTINUATION_CONTEXT_MISSING");
              }

              if (toolOutputInvariantViolated) {
                pendingToolOutputs.clear();
                toolOutputInvariantViolated = false;
                continue;
              }

              const batchedOutputs = Array.from(pendingToolOutputs.values()).filter(
                (it: any) => {
                  const out = it?.output;
                  if (out && typeof out === "object") {
                    return Object.keys(out as any).length > 0;
                  }
                  if (typeof out === "string") {
                    const t = out.trim();
                    if (t === "") return false;
                  }
                  return true;
                }
              );
              if (batchedOutputs.length === 0) {
                pendingToolOutputs.clear();
                continue;
              }
              const callIds = new Set<string>();

              for (const it of batchedOutputs) {
                if (!it || it.type !== "function_call_output") {
                  throw new Error("TOOL_CONTINUATION_INVALID_ITEM");
                }
                if (typeof it.call_id !== "string" || !it.call_id) {
                  throw new Error("TOOL_CONTINUATION_MISSING_CALL_ID");
                }
                if (callIds.has(it.call_id)) {
                  throw new Error(`TOOL_CONTINUATION_DUP_CALL_ID:${it.call_id}`);
                }
                callIds.add(it.call_id);
              }

              continuationInput = batchedOutputs;
              pendingToolOutputs.clear();
              console.log("[PRIORITY_CONTINUATION_TOOL_BATCH]", {
                count: batchedOutputs.length,
              });
              continue;
            }

            if (pendingContinuation) {
              if (!previousResponseId && !conversationId) {
                throw new Error("OPENAI_CONTINUATION_CONTEXT_MISSING");
              }

              const pendingLen =
                Array.isArray(pendingContinuation.input)
                  ? pendingContinuation.input.length
                  : 0;

              if (pendingLen === 0) {
                throw new Error("CONTINUATION_INPUT_EMPTY");
              }

              continuationInput = pendingContinuation.input;
              console.log("[PRIORITY_CONTINUATION_PENDING]", {
                reason: pendingContinuation.reason,
                length: pendingLen,
              });
              pendingContinuation = null;
              continue;
            }

            /* ✅⬇️⬇️⬇️ 여기!!! ⬇️⬇️⬇️ */
            if (executionAbort.signal.aborted) {
              buffer = "";
                throw new Error("EXEC_ABORTED");
            }

            // 🔥 SSOT: CONTINUATION DECISION (단일 진실)
            let decision = decideContinuation({
              segmentIndex,
              receivedAnyToken,
              tokenOverflow,
              turnIntent: StreamEngine.getTurnIntent(threadId),
              thinkingProfile,
 disallowContinuation:
   segmentIndex > 0 &&
   StreamEngine.getReasoning(threadId)?.conversationalOutcome === "CLOSE",
              nextAnchors:
                StreamEngine.getReasoning(threadId)?.nextAnchors,
              allowContinuation,
              isShallow,
              segmentTokenCount,
              accumulatedConfidenceDelta,
              remainingVerifierBudget: verifierBudget,
            });

// 🔒 segment 1 이후 SEARCH/TOOL 금지 (DEEP stream 제외)
if (segmentIndex > 0 && !(thinkingProfile === "DEEP" && opts.stream === true)) {
  if (decision.type === "RUN_TOOL") break;
}

 if (decision.type === "FINISH") {
  // 🔥 CRITICAL FIX:
  // 🔒 CRITICAL: token 없는 상태에서 무한 segment 방지
  if (!receivedAnyToken) {
    if (segmentIndex === 0) {
      segmentIndex++;
      continue; // 최초 1회만 허용
    }
    break; // 그 이후는 강제 종료
  }
await flushAnswerBufferNow();

   // 🔒 SSOT: FINISH는 segment 종료 + continuation 완전 차단
   finalEmitted = true;
   break;
 }
            if (decision.type === "RUN_TOOL") {
  if (thinkingProfile === "DEEP" && opts.stream === true) {
    const toolResult = StreamEngine.getLastToolResult(threadId);
    if (!toolResult) {
      break;
    }
    const toolActivityId = `tool:${traceId}:${segmentIndex}`;
    await publishActivity(StreamStage.SYSTEM, {
      op: "ADD",
      item: {
        id: toolActivityId,
        kind: ActivityKind.EXECUTING,
        status: "RUNNING",
        title: String(toolResult.tool) ?? undefined,
        inlineSummary: undefined,
        at: Date.now(),
        meta: { tool: toolResult.tool, toolEvent: "TOOL_CALL_DETECTED" },
      },
    });
    await publishActivity(StreamStage.SYSTEM, {
      op: "PATCH",
      item: {
        id: toolActivityId,
        kind: ActivityKind.EXECUTING,
        status: "RUNNING",
        title: "TOOL_EXECUTING",
        body: `tool=${String(toolResult.tool)}`,
        inlineSummary: "TOOL_EXECUTING",
        at: Date.now(),
        meta: { tool: toolResult.tool, toolEvent: "TOOL_EXECUTING" },
      },
    });

    await publishActivity(StreamStage.SYSTEM, {
      op: "END",
      item: {
        id: toolActivityId,
        kind: ActivityKind.EXECUTING,
        status: "OK",
        title: "TOOL_RESULT_RECEIVED",
        body: `tool=${String(toolResult.tool)}\nresult=${JSON.stringify(toolResult.result ?? null)}`,
        inlineSummary: "TOOL_RESULT_RECEIVED",
        at: Date.now(),
        meta: { tool: toolResult.tool, toolEvent: "TOOL_RESULT_RECEIVED" },
      },
    });

const rawToolJson = JSON.stringify(toolResult.result ?? null, null, 2);
// Sanitize tool output to prevent prompt injection
const sanitizedToolJson = rawToolJson
  .replace(/\[INSTRUCTION\]/gi, "[TOOL_DATA]")
  .replace(/\[SYSTEM\]/gi, "[TOOL_DATA]")
  .replace(/\[TOOL_RESULT\]/g, "[NESTED_DATA]")
  .replace(/\u27E6YUA\u27E7/g, "[YUA_ESCAPED]")
  .replace(/\u27E6\/YUA\u27E7/g, "[/YUA_ESCAPED]");

const toolMessage =
  `[TOOL_RESULT]\n` +
  `Tool: ${String(toolResult.tool)}\n` +
  `Result:\n${sanitizedToolJson}\n`;
const MAX_TOOL_RESULT_CHARS = 50000;

let safeToolMessage = toolMessage;
if (toolMessage.length > MAX_TOOL_RESULT_CHARS) {
  // Smart truncation: try to produce valid JSON by trimming low-priority fields
  try {
    const parsed = JSON.parse(rawToolJson);
    if (parsed?.output?.files) {
      for (const f of parsed.output.files) {
        // 1. Remove trend points (largest, lowest priority)
        if (f.trend?.points) f.trend.points = f.trend.points.slice(-10);
        // 2. Trim sampleRows to 10
        if (f.sampleRows?.length > 10) f.sampleRows = f.sampleRows.slice(0, 10);
        // 3. Trim anomalies examples
        if (f.anomalies?.outliers) {
          for (const o of f.anomalies.outliers) {
            if (o.examples?.length > 3) o.examples = o.examples.slice(0, 3);
          }
        }
      }
    }
    const trimmed = JSON.stringify(parsed, null, 2);
    const trimmedMsg = `[TOOL_RESULT]\nTool: ${String(toolResult.tool)}\nResult:\n${trimmed}\n`;
    safeToolMessage = trimmedMsg.length > MAX_TOOL_RESULT_CHARS
      ? trimmedMsg.slice(0, MAX_TOOL_RESULT_CHARS)
      : trimmedMsg;
  } catch {
    safeToolMessage = toolMessage.slice(0, MAX_TOOL_RESULT_CHARS);
  }
}

    pendingContinuation = {
      input: buildContinuationMessageInput(safeToolMessage),
      reason: "tool",
      activityId: toolActivityId,
    };
    continue;
  }
  // 🔒 verifier budget 0이면 즉시 종료
  if (verifierBudget <= 0) {
    break;
  }
              const toolResult =
                StreamEngine.getLastToolResult(threadId);

              if (!toolResult) {
                // 🔒 SSOT: tool result missing → hard stop
                break;
              }

              lastToolResult = toolResult;

              // toolScoreDelta가 있으면 그걸 SSOT로 누적 (없으면 0)
              if (typeof toolResult.toolScoreDelta === "number") {
                accumulatedConfidenceDelta += toolResult.toolScoreDelta;
                // 🔒 SSOT: persist tool score for confidence-router
                accumulateToolScore({ traceId, delta: toolResult.toolScoreDelta });
              }

              // verifier 실패 → same segment 재진입 + budget 감소 + UI signal
              if (toolResult.verified !== true && verifierBudget > 0) {
                verifierBudget--;
                await publishVerifierBudget();

                const verifyActivityId =
                  `verify:${traceId}:${segmentIndex}:${totalVerifierBudget - verifierBudget}`;

                await StreamEngine.publish(threadId, {
                  event: "activity",
                  stage: StreamStage.SYSTEM,
                  traceId,
                  activity: {
                    op: "END",
                    item: {
                      id: verifyActivityId,
                      kind: ActivityKind.VERIFYING,
                      status: "FAILED",
                      title: undefined,
                      body: String(toolResult.verifierNotes ?? toolResult.verifierFailed ?? "VERIFIER_FAILED"),
                      inlineSummary: undefined,
                      at: Date.now(),
                      meta: {
                        tool: toolResult.tool,
                        remainingVerifierBudget: verifierBudget,
                      },
                    },
                  },
                });

                // Don't anchor on unverified content — clear previousAnswerTail
                currentPrompt =
                  buildContinuationPrompt({
                    originalPrompt: basePrompt,
                    segmentIndex,
                    mode,
                    outmode: outmode as any,
                    previousAnswerTail: "",
                    contextSummary: opts.userProfile?.trim() || undefined,
                  }) +
                  `\n\n[VERIFIER_FAILED]\n` +
                  `Tool: ${String(toolResult.tool ?? "")}\n` +
                  `Reason: ${String(toolResult.verifierFailed ?? "VERIFIER_FAILED")}\n` +
                  (toolResult.verifierNotes ? `Notes: ${String(toolResult.verifierNotes)}\n` : "") +
                  `\nFix the issue and continue. If tool output is unreliable, use a different approach.\n`;

                continue;
              }
            }

            if (finalEmitted) break;

           segmentIndex++;
           reasoningDoneEmitted = false;
           reasoningDone = false;
 // 🔒 HARD SEGMENT RESET (SSOT)
 pendingToolOutputs.clear();
 startedToolNames.clear();
 toolArgText.clear();
 completedToolCalls.clear();
 ensuredActivityIds.clear();
endedActivityIds.clear();
 lastToolName = null;
 lastToolOutput = undefined;
 lastToolResult = null;

 console.log("[SEGMENT_RESET]", {
   segmentIndex,
 });
            lastToolResult = null;
// 🔥 Segment boundary seed (flat groupIndex 안정화)
await publishActivity(StreamStage.THINKING, {
  op: "ADD",
  item: {
    id: `segment_seed:${traceId}:${segmentIndex}`,
    kind: ActivityKind.ANALYZING_INPUT,
    status: "RUNNING",
    title: "",
    inlineSummary: "",
    at: Date.now(),
    meta: { segmentIndex },
  },
});
            currentPrompt = buildContinuationPrompt({
              originalPrompt: basePrompt,
              segmentIndex,
              mode,
              outmode: outmode as any,
              previousAnswerTail: fullAnswer.slice(-1200),
              contextSummary: opts.userProfile?.trim() || undefined,
            });
            { mode: mode as any }
          } // ✅ while 종료 위치

          /* -------------------------------------------
            🔥 ABORT 종료 보장 (SSOT 핵심)
            - 모든 segment 탈출 이후 단 1회
          ------------------------------------------- */
          if (executionAbort.signal.aborted && !doneEmitted) {
            doneEmitted = true;
            await StreamEngine.finish(threadId, { reason: "aborted" });
            return;
          }
          

          /* -------------------------------------------
            🔒 Execution 종료 후 정리 (DB / telemetry)
            ❌ DONE / SUGGESTION은 여기서 절대 처리하지 않는다
          ------------------------------------------- */
// 🔒 SSOT: 동일 traceId assistant 중복 저장 방지
// pendingAssistantMsgId가 있으면 이미 빈 row가 있으므로 existsCheck 스킵
const alreadyExists = pendingAssistantMsgId
  ? false  // pending row는 우리가 넣은 것 → UPDATE할 것이므로 false 취급
  : await MessageEngine.existsAssistantByTrace(threadId, traceId);

const reasoningSnapshotRaw =
  StreamEngine.getReasoning(threadId) ?? null;

const reasoningSnapshot =
  reasoningSnapshotRaw
    ? JSON.parse(JSON.stringify(reasoningSnapshotRaw))
    : null;
 // 🔥 DEEP reasoning blocks snapshot (SSOT: ExecutionEngine only)
 const session = StreamEngine.getSession(threadId);
 const reasoningBlocks =
   thinkingProfile === "DEEP" &&
   session?.reasoningBlocks &&
   session.reasoningBlocks.length > 0
     ? session.reasoningBlocks
     : null;

 // 🔒 SSOT: snapshot freeze (ExecutionEngine 단일 소유)
 const finalReasoningJson =
   reasoningBlocks
     ? {
         version: 1,
         thinkingProfile,
         startedAt: session?.startedAt ?? null,
         completedAt: Date.now(),
         blocks: reasoningBlocks.map(b => ({
           stage: b.stage,
           title: undefined, // 또는 제거
           body: b.body,
           bodyOriginal: b.body, // 🔥 원문 보존
           ts: b.ts,
         })),
       }
     : reasoningSnapshot;

const resolvedDomain =
  session?.tools?.[0]?.domain ?? null;

const resolvedToolUsed =
  typeof lastToolName === "string"
    ? lastToolName
    : session?.tools?.[0]?.tool ?? null;

const resolvedTokenUsage =
  session?.tokenUsage ?? null;

if (!alreadyExists && !executionAbort.signal.aborted) {
  try {
const withoutControl = fullAnswer
  .replace(YUA_CONTROL_RE, "")
 const sanitized =
   sanitizeAssistantForStorage(
     fullAnswer.replace(YUA_CONTROL_RE, "")
   );
 if (finalReasoningJson) {
   await ReasoningSnapshotEngine.save({
     threadId,
     traceId,
     thinkingProfile,
    domain: resolvedDomain,
    tool_used: resolvedToolUsed,
    token_usage: resolvedTokenUsage,
     snapshot: finalReasoningJson,
   });
 }

// 🔥 WEB SOURCES 추출 (StreamEngine session에서)
const session = StreamEngine.getSession(threadId);
const webSources =
  Array.isArray(session?.webSources)
    ? session.webSources
    : [];

// 🔥 SAFETY: tool output에서 바로 저장 못 한 경우 대비
if ((!webSources || webSources.length === 0) && nativeToolOutputs.size > 0) {
  const fallback: any[] = [];
  for (const out of nativeToolOutputs.values()) {
    if (Array.isArray((out as any)?.sources)) {
      for (const s of (out as any).sources) {
        if (typeof s?.url === "string") {
          fallback.push({
            id: s.url,
            label: s.title ?? s.url,
            url: s.url,
            host: (() => {
              try { return new URL(s.url).hostname; } catch { return null; }
            })(),
          });
        }
      }
    }
  }
  if (fallback.length > 0) {
    webSources.push(...fallback);
  }
}
console.log("[WEB_SOURCES_GENERATED]", {
  traceId,
  count: Array.isArray(webSources) ? webSources.length : 0,
});

    // 🔒 Build final meta
    const finalMeta = (() => {
  const plan = StreamEngine.getExecutionPlan(threadId);
  const isImageTask =
    plan?.task === "IMAGE_GENERATION" ||
    plan?.task === "IMAGE_ANALYSIS";

  const resolvedSectionId =
    opts.sectionId ??
    (plan as any)?.sectionId ??
    undefined;

  const session = StreamEngine.getSession(threadId) as any;
  const reasoningBlocksLen =
    Array.isArray(session?.reasoningBlocks) ? session.reasoningBlocks.length : 0;
  const hasReasoning =
    thinkingProfile === "DEEP" && (reasoningBlocksLen > 0 || Boolean(finalReasoningJson));

  const baseMeta = {
    thinkingProfile,
    hasReasoning: Boolean(hasReasoning),
    drawerOpen: thinkingProfile === "DEEP",
  };
  const meta =
    isImageTask && resolvedSectionId
      ? {
          ...baseMeta,
          studio: {
            sectionId: resolvedSectionId,
            assetType: "IMAGE" as const,
          },
        }
      : baseMeta;

  return {
    ...meta,
    sources: Array.isArray(webSources) ? webSources : [],
  };
})();

    // 🔒 SSOT: pendingAssistantMsgId가 있으면 UPDATE, 없으면 INSERT
    if (pendingAssistantMsgId && pendingAssistantMsgId > 0) {
      await MessageEngine.updateContent(pendingAssistantMsgId, sanitized, finalMeta);
    } else {
      await MessageEngine.addMessage({
        threadId,
        userId: opts.userId,
        role: "assistant",
        content: sanitized,
        traceId,
        meta: finalMeta,
      });
    }

   // 🔥 메시지 저장 성공 후 카운트 증가 (SSOT)
   const today = new Date().toISOString().slice(0, 10);

   await pool.query(
     `
     INSERT INTO yua_usage_daily (user_id, date, message_count)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE
       message_count = message_count + 1,
       updated_at = CURRENT_TIMESTAMP
     `,
     [opts.userId, today]
   );
    writeRawEvent({
      traceId,
      threadId,
      workspaceId: opts.workspaceId,
      actor: "YUA",
      eventKind: "message",
      phase: "chat",
      payload: {
        stage: "assistant_materialized",
        length: sanitized.length,
        stream: true,
      },
    });
  } catch (e) {
    console.error("[STREAM][ASSISTANT_MATERIALIZE_FAILED]", {
      traceId,
      error: String(e),
    });
  }
} else if (alreadyExists) {
  console.warn("[STREAM][DUPLICATE_ASSISTANT_SKIPPED]", {
    threadId,
    traceId,
  });
}

          if (!doneEmitted) {
            doneEmitted = true;
    if (thinkingProfile === "DEEP") {
    }
            // 🔥 HARD STOP: reasoning flush interval 강제 정리
            try {
              const s = StreamEngine.getSession(threadId);
              if (s?.reasoningFlushInterval) {
                clearInterval(s.reasoningFlushInterval);
                s.reasoningFlushInterval = null;
              }
            } catch {}
            // 🔥 FINAL 직전: 남은 buffer는 무조건 1회 flush
            await flushAnswerBufferNow();
  const sessionBeforeFinal = StreamEngine.getSession(threadId);

  const hasActivityFlow =
    Array.isArray(sessionBeforeFinal?.chunks) &&
    sessionBeforeFinal.chunks.length > 0;

  const hasRunningActivities =
    Array.isArray(sessionBeforeFinal?.chunks) &&
    sessionBeforeFinal.chunks.some((c: any) => c?.status === "RUNNING");

  // 🔒 NORMAL 모드에서 activity 없으면 기존처럼 바로 FINAL
  const shouldDelayFinal =
    hasActivityFlow && hasRunningActivities;

  if (shouldDelayFinal) {
    console.warn("[FINAL_DELAYED_WAITING_ACTIVITY_END]");
    await delay(60); // 1프레임 breathing space
  }

            // cleanup: unlock grace timer 정리
            if (answerUnlockGraceTimer) {
              clearTimeout(answerUnlockGraceTimer);
              answerUnlockGraceTimer = null;
            }
            // 🔥 DEEP: close last reasoning block (best-effort)
            try {
              if (thinkingProfile === "DEEP") {
                const s = StreamEngine.getSession(threadId) as any;
                const blocks = Array.isArray(s?.reasoningBlocks) ? s.reasoningBlocks : [];
                const last = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  if (last && !reasoningDoneEmitted) {
    reasoningDoneEmitted = true;
                  await StreamEngine.publish(threadId, {
                    event: "reasoning_done",
                    traceId,
                    meta: { openaiSeq: nextSeq() },
    reasoning_done: { 
      id: `reasoning-${last.groupIndex}` // 🔥 SSOT: activityId와 일치
    },
                  } as any);
                }
              }
            } catch {}
            // 🔥 1️⃣ FORCE FLUSH BEFORE FREEZE (SSOT)
            await StreamEngine.flushReasoningNow(threadId, traceId, { force: true });

            // 🔥 2️⃣ micro tick 대기 (flush 내부 loop 완전 종료 보장)
            await new Promise((res) => setTimeout(res, 10));

            // 🔥 3️⃣ FINAL 이전 snapshot HARD FREEZE
            const sessionStateRaw = StreamEngine.getSession(threadId);
            const frozenSessionState =
              sessionStateRaw
                ? JSON.parse(JSON.stringify(sessionStateRaw))
                : null;

            const sessionState = frozenSessionState;

            const activitySnapshot: ActivitySnapshot | null =
              sessionState
                ? {
                    version: 1 as const,
                    thinkingProfile,
                    startedAt: sessionState.startedAt ?? null,
                    finalized: true,
                    finalizedAt: Date.now(),
                    chunks: Array.isArray(sessionState.chunks)
                      ? sessionState.chunks
                      : [],
                    tools: Array.isArray(sessionState.tools)
                      ? sessionState.tools
                      : [],
                    summaries: Array.isArray(sessionState.summaries)
                      ? sessionState.summaries
                      : [],
                    primarySummaryId:
                      typeof sessionState.primarySummaryId === "string"
                        ? sessionState.primarySummaryId
                        : null,
                  }
                : null;

            console.log("[SNAPSHOT_FREEZE]", {
              traceId,
              chunkCount: sessionState?.chunks?.length,
              finalized: sessionState?.finalized,
            });

            // 🔥 4️⃣ SNAPSHOT SAVE (FINAL 이전 저장)
            if (activitySnapshot) {
              await ActivitySnapshotEngine.save({
                threadId,
                traceId,
                thinkingProfile,
                domain: resolvedDomain,
                tool_used: resolvedToolUsed,
                token_usage: resolvedTokenUsage,
                snapshot: activitySnapshot,
              });
            }

            // 🔥 5️⃣ 이제 FINAL emit
            await StreamEngine.publishFinal(threadId, { traceId });

            // 🔒 2️⃣ SUGGESTION (FINAL 이후 단 1회)
            await ChatEngine.emitSuggestions({
              threadId,
              traceId,
              reasoning: StreamEngine.getReasoning(threadId),
              verdict: "APPROVE",
              responseAffordance: StreamEngine.getResponseAffordance(threadId),
              turnIntent: StreamEngine.getTurnIntent(threadId),
            });

            // 🔒 SUMMARY: fire-and-forget (non-blocking)
            fetchRecentChatMessages(threadId, 50)
              .then((rows) => {
                const msgs = rows
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((r) => `[${r.role}] ${r.content}`);
                return updateConversationSummary(threadId, msgs);
              })
              .catch((e) => {
                console.warn("[CONVERSATION_SUMMARY][ERROR]", { threadId, error: String(e) });
              });

            // 🔒 MEMORY PIPELINE: stream end hook
            try {
              const { runMemoryPipeline } = await import("../memory/memory-pipeline-runner.js");
              await runMemoryPipeline({
                threadId,
                traceId,
                userId: String(opts.userId),
                workspaceId: String(opts.workspaceId),
                userMessage: opts.rawUserMessage ?? normalizedPrompt,
                assistantMessage: fullAnswer,
                mode: mode ?? "NORMAL",
                memoryIntent: opts.memoryIntent ?? "NONE",
                reasoning: StreamEngine.getReasoning(threadId) ?? { confidence: 0.5 },
                executionPlan: undefined,
                executionResult: undefined,
                allowMemory: true,
              });
            } catch (e) {
              console.warn("[MEMORY_PIPELINE][STREAM_ERROR]", { threadId, error: String(e) });
            }

            // 🔒 3️⃣ DONE (transport 종료, SSE close)
            await StreamEngine.publishDone(threadId, {
              traceId,
              reason: "completed",
            });
          }
        } catch (err) {
 if ((err as any)?.message === "terminated") {
    console.warn("[STREAM][TERMINATED_SUPPRESSED]");
    await StreamEngine.finish(threadId, {
      reason: "error",
      traceId,
    });
    return;
  }
  if (answerUnlockGraceTimer) {
    clearTimeout(answerUnlockGraceTimer);
    answerUnlockGraceTimer = null;
  }
if ((err as any)?.message === "EXEC_ABORTED") {
  // 🔒 abort 시 빈 pending 메시지 삭제
  if (pendingAssistantMsgId && pendingAssistantMsgId > 0) {
    await MessageEngine.deletePending(pendingAssistantMsgId).catch(() => {});
  }
  if (!doneEmitted) {
    doneEmitted = true;
    await StreamEngine.finish(threadId, {
      reason: "aborted",
      traceId,
    });
  }
  return;
}
          if (idleTimer) clearTimeout(idleTimer);

          // 🔒 에러 시 빈 pending 메시지 삭제
          if (pendingAssistantMsgId && pendingAssistantMsgId > 0) {
            await MessageEngine.deletePending(pendingAssistantMsgId).catch(() => {});
          }

          if (!executionAbort.signal.aborted && !doneEmitted) {
            doneEmitted = true;

            await StreamEngine.publishDone(threadId, {
              traceId,
              reason: "error",
            });
          }

          throw err;
        }
      }
    }
