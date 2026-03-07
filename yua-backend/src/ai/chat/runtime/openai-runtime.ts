// 📂 src/ai/chat/runtime/openai-runtime.ts
// 🔥 OpenAI Runtime — Responses API SSOT (2026.01)
// ✔ Responses API 정식 타입 사용
// ✔ system / developer / user 분리
// ✔ stream / non-stream 동일 계약
// ✔ Prompt / ChatEngine 분리 보장

import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import type { Stream } from "openai/streaming";
import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
  ResponseTextDeltaEvent,
  ResponseFunctionCallArgumentsDeltaEvent,
  ResponseFunctionCallArgumentsDoneEvent,
  ResponseCustomToolCallInputDeltaEvent,
  ResponseCustomToolCallInputDoneEvent,
  ResponseOutputItemAddedEvent,
  ResponseFunctionToolCall,
  ResponseCustomToolCall,
  ResponseFunctionWebSearch,
} from "openai/resources/responses/responses";
import type { ChatMode } from "../types/chat-mode";
import { OUTMODE } from "../types/outmode";
import { SYSTEM_CORE_FINAL } from "../../system-prompts/system-core.final";
import { writeRawEvent } from "../../telemetry/raw-event-writer";

export type Verbosity = "low" | "medium" | "high";
export type DensityHint = "COMPACT" | "NORMAL" | "EXPANSIVE";
export type TextFormat =
  | { type: "text" }
  | { type: "json_schema"; name: string; strict?: boolean; schema: any };
// Responses API reasoning knobs (docs: summary/effort only)
export type ReasoningSummary = "auto" | "concise" | "detailed";
export type ReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";
export type ReasoningConfig = {
  summary?: ReasoningSummary;
  effort?: ReasoningEffort;
};
/**
 * ✅ SSOT(B안): Responses Streaming “server events”를 그대로 통과시키되,
 * - UI에 필요한 최소 이벤트만 런타임에서 정규화
 * - sequence_number(있으면) 보존 → downstream에서 순서 복원 가능
 *
 * NOTE:
 * - “생각하기/요약”을 토큰으로 흘리지 않는다 (answer token과 분리)
 * - tool call delta도 토큰으로 흘리지 않는다 (activity로 전환)
 */
export type RuntimeSeq = number | null;

export type OpenAIRuntimeEvent =
  | { kind: "text_delta"; delta: string; seq: RuntimeSeq }
  | { kind: "response_created"; responseId: string; conversationId: string | null; seq: RuntimeSeq }
  | {
     kind: "activity";
     activity: {
       type: string;
       callId?: string;
       query?: string;
       sources?: any[];
     };
     seq: RuntimeSeq;
   }
  | {
      kind: "reasoning_block";
      block: { id: string; title?: string; body?: string; inlineSummary?: string; groupIndex?: number };
      seq: RuntimeSeq;
    }
  | {
      kind: "reasoning_summary_delta";
      delta: { title?: string; body?: string; inlineSummary?: string };
      seq: RuntimeSeq;
    }
  | { kind: "reasoning_summary_done"; seq: RuntimeSeq }
  | { kind: "tool_call_started"; callId: string; name: string | null; toolType: "function" | "custom" | "builtin"; seq: RuntimeSeq }
  | { kind: "tool_call_arguments_delta"; callId: string; delta: string; toolType: "function" | "custom" | "builtin"; seq: RuntimeSeq }
  | { kind: "tool_call_arguments_done"; callId: string; toolType: "function" | "custom" | "builtin"; seq: RuntimeSeq }
  | { kind: "tool_call_output"; callId: string; output: unknown; toolType: "function" | "custom" | "builtin"; seq: RuntimeSeq }
  | {
      kind: "code_interpreter_output";
      callId: string;
      code: string;
      output: string;
      images: { url: string; mimeType?: string }[];
      seq: RuntimeSeq;
    }
  | {
      kind: "usage";
      usage: { input_tokens: number; output_tokens: number; total_tokens: number };
      seq: RuntimeSeq;
    }
  | { kind: "unknown"; type: string; seq: RuntimeSeq };

function extractUsageFromCompleted(ev: any): { input_tokens: number; output_tokens: number; total_tokens: number } | null {
  const u =
    ev?.response?.usage ??
    ev?.usage ??
    null;
  if (!u || typeof u !== "object") return null;
  const input_tokens = Number(u.input_tokens ?? 0);
  const output_tokens = Number(u.output_tokens ?? 0);
  const total_tokens = Number(u.total_tokens ?? (input_tokens + output_tokens));
  return {
    input_tokens: Number.isFinite(input_tokens) ? input_tokens : 0,
    output_tokens: Number.isFinite(output_tokens) ? output_tokens : 0,
    total_tokens: Number.isFinite(total_tokens) ? total_tokens : 0,
  };
}
export type OpenAIStreamResult =
  | { type: "stream"; stream: AsyncGenerator<OpenAIRuntimeEvent> }
  | { type: "text"; text: string };

  /* -------------------------------------------------------------------------- */
/* Minimal Responses Input Types (SDK-agnostic)                                 */
/* - Avoids breaking when OpenAI SDK types differ by version                    */
/* - Matches Responses API shape: type:"message" + role + content[]             */
/* -------------------------------------------------------------------------- */
type ResponseRole = "system" | "developer" | "user";
type ResponseContentItem =
  | { type: "input_text"; text: string }
  | {
      type: "input_image";
      image_url: string;
      detail: "auto" | "low" | "high";
    };

type ResponseMessageInputItem = {
  type: "message";
  role: ResponseRole;
  content: ResponseContentItem[];
};
type ResponseToolResultInputItem = {
  type: "tool_result";
  tool_call_id: string;
  output: string;
};
type ResponseFunctionCallOutputInputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};
type ResponseInputItem =
  | ResponseMessageInputItem
  | ResponseFunctionCallOutputInputItem;
function toSeq(ev: { sequence_number?: number }): RuntimeSeq {
  // Responses streaming events: sequence_number가 있으면 우선 사용
  const n = ev.sequence_number;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  return null;
}

function safeStr(x: any) {
  const s = String(x ?? "");
  return s;
}

function isResponseWebSearchCall(
  item: ResponseOutputItemAddedEvent["item"]
): item is ResponseFunctionWebSearch {
  return (item as any)?.type === "web_search_call";
}

function extractWebSearchQuery(item: ResponseFunctionWebSearch): string | null {
  const a: any = (item as any)?.action;
  if (!a || typeof a?.type !== "string") return null;
  if (a.type === "search") {
    const qs = Array.isArray(a.queries) ? a.queries : null;
    const q = (typeof qs?.[0] === "string" ? qs[0] : null) ?? (typeof a.query === "string" ? a.query : null);
    return q ? String(q).trim() : null;
  }
  if (a.type === "open_page") return typeof a.url === "string" ? a.url : null;
  if (a.type === "find_in_page") {
    const url = typeof a.url === "string" ? a.url : "";
    const pat = typeof a.pattern === "string" ? a.pattern : "";
    const t = [pat && `find: ${pat}`, url && `url: ${url}`].filter(Boolean).join(" | ");
    return t || null;
  }
  return null;
}

function extractResponseMeta(ev: any): { responseId: string | null; conversationId: string | null } {
  const responseId =
    safeStr(ev?.response?.id ?? ev?.response_id ?? ev?.id) || null;
  const conversationId =
    safeStr(ev?.response?.conversation ?? ev?.conversation_id ?? ev?.conversation) || null;
  return {
    responseId: responseId && responseId !== "undefined" && responseId !== "null" ? responseId : null,
    conversationId:
      conversationId && conversationId !== "undefined" && conversationId !== "null"
        ? conversationId
        : null,
  };
}

function isResponseTextDeltaEvent(
  ev: ResponseStreamEvent
): ev is ResponseTextDeltaEvent {
  return ev.type === "response.output_text.delta";
}
function isResponseReasoningSummaryTextDeltaEvent(ev: ResponseStreamEvent): ev is any {
  return (ev as any)?.type === "response.reasoning_summary_text.delta";
}

function isResponseReasoningSummaryTextDoneEvent(ev: ResponseStreamEvent): ev is any {
  return (ev as any)?.type === "response.reasoning_summary_text.done";
}

function isResponseFunctionCallArgumentsDeltaEvent(
  ev: ResponseStreamEvent
): ev is ResponseFunctionCallArgumentsDeltaEvent {
  return ev.type === "response.function_call_arguments.delta";
}

function isResponseCustomToolCallInputDeltaEvent(
  ev: ResponseStreamEvent
): ev is ResponseCustomToolCallInputDeltaEvent {
  return ev.type === "response.custom_tool_call_input.delta";
}

function isResponseFunctionCallArgumentsDoneEvent(
  ev: ResponseStreamEvent
): ev is ResponseFunctionCallArgumentsDoneEvent {
  return ev.type === "response.function_call_arguments.done";
}

function isResponseCustomToolCallInputDoneEvent(
  ev: ResponseStreamEvent
): ev is ResponseCustomToolCallInputDoneEvent {
  return ev.type === "response.custom_tool_call_input.done";
}


function isResponseOutputItemAddedEvent(
  ev: ResponseStreamEvent
): ev is ResponseOutputItemAddedEvent {
  return ev.type === "response.output_item.added";
}
function isResponseOutputItemDoneEvent(
  ev: ResponseStreamEvent
): ev is any {
  return (ev as any)?.type === "response.output_item.done";
}

function isResponseFunctionToolCall(
  item: ResponseOutputItemAddedEvent["item"]
): item is ResponseFunctionToolCall {
  return item.type === "function_call";
}

function isResponseCustomToolCall(
  item: ResponseOutputItemAddedEvent["item"]
): item is ResponseCustomToolCall {
  return item.type === "custom_tool_call";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolveVerbosity(args: {
  verbosity?: Verbosity | number;
  densityHint?: DensityHint;
}): Verbosity | undefined {
  const v = args.verbosity;
  if (v === "low" || v === "medium" || v === "high") return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    // 네가 말한 2/3/4 스케일을 low/medium/high로 안전 매핑
    if (v <= 2) return "low";
    if (v === 3) return "medium";
    return "high";
  }
  if (args.densityHint === "COMPACT") return "low";
  if (args.densityHint === "EXPANSIVE") return "high";
  if (args.densityHint === "NORMAL") return "medium";
  return undefined;
}

function resolveRecommendedMaxTokensByDensity(h?: DensityHint): number | undefined {
  // 너가 준 가이드(대략치). 필요하면 여기 숫자만 튜닝하면 됨.
  if (h === "COMPACT") return 800;     // 500~900
  if (h === "NORMAL") return 1400;     // 900~1600 (중간값)
  if (h === "EXPANSIVE") return 2200;  // 더 길게
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Model Selection (SSOT)                                                      */
/* -------------------------------------------------------------------------- */
const MODEL_BY_MODE: Record<ChatMode, string> = {
  FAST: "gpt-5-mini",
  NORMAL: "gpt-5.2-chat-latest",
  SEARCH: "gpt-5.2-chat-latest",
  DEEP: "gpt-5.2",
  BENCH: "gpt-5.2-chat-latest",
  RESEARCH: "gpt-5.2-chat-latest",
};

export function resolveRuntimeModelId(mode: ChatMode): string {
  return MODEL_BY_MODE[mode] ?? MODEL_BY_MODE.NORMAL;
}

/* -------------------------------------------------------------------------- */
/* Base Token Limits                                                           */
/* -------------------------------------------------------------------------- */
const BASE_MAX_TOKENS_BY_MODE: Record<ChatMode, number> = {
  FAST: 256,
  NORMAL: 3048,
  SEARCH: 2048,
  DEEP: 4048,
  BENCH: 4048,
  RESEARCH: 5048,
};

const OUTMODE_MAX_TOKENS: Partial<Record<OUTMODE, number>> = {
  [OUTMODE.DEEP]: 5096,
  [OUTMODE.RESEARCH]: 5096,
};

/* -------------------------------------------------------------------------- */
/* Token Resolver                                                              */
/* -------------------------------------------------------------------------- */
function resolveMaxOutputTokens(args: {
  mode: ChatMode;
  outmode?: OUTMODE;
}): number {
  if (args.outmode && OUTMODE_MAX_TOKENS[args.outmode]) {
    return OUTMODE_MAX_TOKENS[args.outmode]!;
  }
  return BASE_MAX_TOKENS_BY_MODE[args.mode] ?? 512;
}

// NOTE: Runtime layer should NOT sentence-buffer.
// Flush/throttle belongs to ExecutionEngine / UI layer.

/* -------------------------------------------------------------------------- */
/* Runtime                                                                     */
/* -------------------------------------------------------------------------- */
export async function runOpenAIRuntime(args: {
  traceId?: string;
  workspaceId: string;   // 🔥 ADD
  userMessage?: string;
  attachments?: { kind: "image" | "file"; url: string; name?: string; mimeType?: string }[];
  developerHint?: string;
  reasoningLanguageHint?: "ko" | "en";
  reasoning?: ReasoningConfig;
  mode: ChatMode;
  outmode?: OUTMODE;
  computePolicy?: {
    tier: "FAST" | "NORMAL" | "DEEP";
  };
    // ✅ length/tone controls (Responses knobs)
  responseDensityHint?: DensityHint;      // COMPACT/NORMAL/EXPANSIVE
  verbosity?: Verbosity | number;         // low/medium/high or 2/3/4
  temperature?: number;                  // 0.0 ~ 2.0
  top_p?: number;                        // 0.0 ~ 1.0
  seed?: number;
  textFormat?: TextFormat;               // json_schema 등 구조 고정
  // ✅ tools (native or function tools) - pass-through
  tools?: any[];
  toolChoice?: any;                      // "auto" | {type:"function",function:{name:string}} ...
  include?: string[];
  previousResponseId?: string | null;
  conversationId?: string | null;
  inputOverride?: ResponseInputItem[];
   stream: boolean;
  signal?: AbortSignal;
}): Promise<OpenAIStreamResult> {
  const { userMessage, developerHint, mode, outmode, stream, signal } = args;
  console.log("[OPENAI_RUNTIME_MODE]", mode ?? null);

  if (!userMessage?.trim() && (!args.inputOverride || args.inputOverride.length === 0)) {
    throw new Error("OPENAI_PROMPT_EMPTY");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_NOT_SET");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = MODEL_BY_MODE[mode] ?? "gpt-4.1-mini";
let maxOutputTokens = resolveMaxOutputTokens({ mode, outmode });

// 🔥 SSOT: ComputePolicy overrides model budget
if (args.computePolicy?.tier === "DEEP") {
  maxOutputTokens = Math.max(maxOutputTokens, 5096);
}
if (args.computePolicy?.tier === "FAST") {
  maxOutputTokens = Math.min(maxOutputTokens, 512);
}
  // ✅ DensityHint 기반 “안정 길이” 상한 오버라이드(원하면)
  const recommended = resolveRecommendedMaxTokensByDensity(args.responseDensityHint);
  if (recommended) {
    // 기존 모드 상한과의 충돌 방지: 너무 크게 올리진 말고, 너무 작게도 자르지 않게 clamp
    maxOutputTokens = clamp(recommended, 256, maxOutputTokens);
  }

  const verbosity = resolveVerbosity({
    verbosity: args.verbosity,
    densityHint: args.responseDensityHint,
  });

  // ✅ 기본값(안정용): 요청에서 주면 그걸 우선
  const temperature =
    typeof args.temperature === "number"
      ? args.temperature
      : args.computePolicy?.tier === "FAST"
      ? 0.4
      : args.computePolicy?.tier === "DEEP"
      ? 0.5
      : 0.6;

  const top_p =
    typeof args.top_p === "number" ? args.top_p : 0.95;


    // 🔥 PHASE 9: RAW EVENT — MODEL CALL
  writeRawEvent({
 traceId: args.traceId ?? "unknown",
 workspaceId: args.workspaceId,
 actor: "MODEL",              // 🔒 더 정확
 eventKind: "execution",
 phase: "execution",
    payload: {
      stage: "model_call",
      model,
      mode,
      outmode,
      stream,
      maxOutputTokens,
    },
  });

   // Build Responses API input (SSOT)
  // ✅ CR-1: SYSTEM_CORE_FINAL is ALWAYS prepended, even when inputOverride is provided.
  const input: ResponseInputItem[] = [
    {
      type: "message",
      role: "system",
      content: [{ type: "input_text", text: SYSTEM_CORE_FINAL }],
    },
  ];
// 🔥 Language preference for reasoning summary (soft hint only)
if (args.reasoningLanguageHint) {
  const hint =
    args.reasoningLanguageHint === "ko"
      ? [
          "Reasoning summary language preference:",
 "- If a reasoning summary is generated, it MUST be written in Korean.",
 "- The reasoning summary language is strictly bound to this instruction.",
          "- Proper nouns, API names, tickers/symbols, URLs, and quoted source text may remain in the original language.",
          "- Keep it concise and user-facing if applicable.",
        ].join("\n")
      : [
          "Reasoning summary language preference:",
 "- If a reasoning summary is generated, it MUST be written in English.",
 "- The reasoning summary language is strictly bound to this instruction.",
          "- Proper nouns, API names, tickers/symbols, URLs, and quoted source text may remain in the original language.",
          "- Keep it concise and user-facing if applicable.",
        ].join("\n");

  input.push({
    type: "message",
    role: "system",
    content: [{ type: "input_text", text: hint }],
  });
}
  // ✅ DEEP mode uses Responses reasoning.summary
  // ⟦REASONING_BLOCK⟧ injection removed (SSOT v4)
  // ✅ CR-1: developerHint is ALWAYS included, even when inputOverride is provided.
  if (developerHint?.trim()) {
    input.push({
      type: "message",
      role: "developer",
      content: [{ type: "input_text", text: developerHint.trim() }],
    });
  }
  // ✅ CR-1: inputOverride items come AFTER system/developer messages
  if (args.inputOverride) {
    input.push(...args.inputOverride);
  }
  // ✅ inputOverride는 "완전한 input"으로 취급 (SSOT)
  // - tool continuation에서 빈 user message/attachments를 자동으로 덧붙이지 않는다.
  if (!args.inputOverride) {
    const userContent: ResponseContentItem[] = [];

    if (userMessage?.trim()) {
      userContent.push({ type: "input_text", text: userMessage });
    }

    if (Array.isArray(args.attachments)) {
      for (const a of args.attachments) {
        if (a.kind === "image" && a.url) {
          const m = a.url.match(/\/api\/assets\/uploads\/([^/]+)\/([^/]+)\/([^/?#]+)/);
          if (m) {
            const [, workspaceId, userId, fileName] = m;
            try {
              const resolvedPath = path.resolve(
                "/mnt/yua/assets/uploads",
                workspaceId,
                userId,
                fileName
              );
              const fileBuffer = await fs.readFile(resolvedPath);
              userContent.push({
                type: "input_image",
                image_url: `data:image/png;base64,${fileBuffer.toString("base64")}`,
                detail: "auto",
              });
              continue;
            } catch {}
          }
          userContent.push({
            type: "input_image",
            image_url: a.url,
            detail: "auto",
          });
        }
      }
    }

    if (userContent.length > 0) {
      input.push({
        type: "message",
        role: "user",
        content: userContent,
      });
    }
  }
    // ✅ Build request payload (Responses)
  const baseReq: any = {
    model,
    input: input as unknown as any,
    max_output_tokens: maxOutputTokens,
  };
  // ✅ include: ask Responses API to attach extra data (e.g. web_search_call.action.sources)
  // Docs: include supports "web_search_call.action.sources" / "web_search_call.results"
  if (Array.isArray(args.include) && args.include.length > 0) {
    baseReq.include = args.include;
  }  
 if (mode === "DEEP") {
 const effort =
   args.computePolicy?.tier === "DEEP" &&
   (args.computePolicy as any)?.deepVariant === "EXPANDED"
     ? "high"
     : "medium";

  const reasoningConfig: any = {
    summary: "detailed",
    effort,
  };

  // ✅ Responses API reasoning supports summary/effort (NO language field)
  baseReq.reasoning = {
    summary: args.reasoning?.summary ?? "detailed",
    effort: args.reasoning?.effort ?? effort,
  };
 }

  if (args.previousResponseId) {
    baseReq.previous_response_id = args.previousResponseId;
  }
  if (args.conversationId) {
    baseReq.conversation = args.conversationId;
  }

  // 🔒 SSOT: Responses API (GPT-5.x) does NOT support sampling params
  // - temperature / top_p are ignored by design
  // - verbosity / reasoning.effort are the supported controls
  if (typeof args.seed === "number") baseReq.seed = args.seed;
  if (verbosity) baseReq.verbosity = verbosity; // 최신 모델 가이드 기준 :contentReference[oaicite:6]{index=6}
  if (args.textFormat) baseReq.text = { format: args.textFormat };

  if (Array.isArray(args.tools) && args.tools.length > 0) {
    baseReq.tools = args.tools;
    // toolChoice 지정 없으면 auto
    baseReq.tool_choice = args.toolChoice ?? "auto";
  }


  /* ======================================================================== */
  /* STREAM MODE                                                              */
  /* ======================================================================== */
  if (stream) {
    // SSOT: Use Responses streaming (SSE events)
    const streamReq: ResponseCreateParamsStreaming = {
      ...baseReq,
      stream: true,
    };
    const responseStream: Stream<ResponseStreamEvent> =
      await client.responses.create(streamReq, { signal });
    async function* generator(): AsyncGenerator<OpenAIRuntimeEvent> {
      const itemIdToCallId = new Map<string, string>();
      const startedBuiltin = new Set<string>();
      let sawOutputTextDelta = false;

      let reasoningSummaryBuffer = "";
      let reasoningSummaryHasDelta = false;
      let lastReasoningDeltaAt = 0;
      let reasoningIndex = 0;
      const REASONING_MIN_LEN = 320;
      const REASONING_IDLE_MS = 1200;
      let lastReasoningEmitted = "";
      let reasoningParseFailLogged = false;
      let reasoningLogged = false;
      let currentReasoningPartId: string | null = null;
       let reasoningPartAddedLogged = false;
       let reasoningPartDoneLogged = false;
      let responseIdEmitted = false;
      let structuredStepEmitted = false;

      try {
        for await (const ev of responseStream) {
  
          if (signal?.aborted) break;
          const now = Date.now();
          if (
            reasoningSummaryBuffer &&
            lastReasoningDeltaAt > 0 &&
            now - lastReasoningDeltaAt > REASONING_IDLE_MS
          ) {
            let textToEmit: string | null = null;
            const paragraphCut = reasoningSummaryBuffer.indexOf("\n\n");
            if (paragraphCut !== -1) {
              textToEmit = reasoningSummaryBuffer.slice(0, paragraphCut + 2);
              reasoningSummaryBuffer = reasoningSummaryBuffer.slice(paragraphCut + 2);
            } else if (reasoningSummaryBuffer.length >= REASONING_MIN_LEN) {
              const sentenceMatch = reasoningSummaryBuffer.match(/[\s\S]*[.!?](\s|$)/);
              if (sentenceMatch && typeof sentenceMatch[0] === "string") {
                textToEmit = sentenceMatch[0];
                reasoningSummaryBuffer = reasoningSummaryBuffer.slice(textToEmit.length);
              }
            }

            if (textToEmit && textToEmit !== lastReasoningEmitted) {
              const groupIndex = reasoningIndex++;
              yield {
                kind: "reasoning_block",
                block: {
                  id: `reasoning:${groupIndex}`,
                  title: undefined,
                  body: textToEmit,
                  inlineSummary: textToEmit.slice(0, 120),
                  groupIndex,
                },
                seq: toSeq(ev),
              };
              lastReasoningEmitted = textToEmit;
            }
          }

          if (!responseIdEmitted) {
            const meta = extractResponseMeta(ev);
            if (meta.responseId) {
              responseIdEmitted = true;
              yield {
                kind: "response_created",
                responseId: meta.responseId,
                conversationId: meta.conversationId ?? null,
                seq: toSeq(ev),
              };
            }
          }
if (ev?.type === "response.reasoning_summary_text.delta") {
  const d = safeStr((ev as any).delta);
  if (!d) continue;

  // 🔒 prefix-growing delta dedupe (same logic as answer delta)
  let appendPart = d;
  const prev = reasoningSummaryBuffer;
  if (prev && d.startsWith(prev)) {
    appendPart = d.slice(prev.length);
  } else if (prev) {
    const maxOverlap = Math.min(prev.length, d.length);
    for (let i = maxOverlap; i > 0; i--) {
      if (prev.endsWith(d.slice(0, i))) {
        appendPart = d.slice(i);
        break;
      }
    }
  }
  if (appendPart) {
    reasoningSummaryBuffer += appendPart;
  }
  reasoningSummaryHasDelta = true;
  lastReasoningDeltaAt = Date.now();

  const paragraphCut = reasoningSummaryBuffer.indexOf("\n\n");
  if (paragraphCut !== -1) {
    const text = reasoningSummaryBuffer.slice(0, paragraphCut + 2);
    reasoningSummaryBuffer = reasoningSummaryBuffer.slice(paragraphCut + 2);
    if (text && text !== lastReasoningEmitted) {
      const groupIndex = reasoningIndex++;
      yield {
        kind: "reasoning_block",
        block: {
          id: `reasoning:${groupIndex}`,
          title: undefined, // 제목은 ExecutionEngine에서 언어 맞춰서
          body: text,
          inlineSummary: text.slice(0, 120),
          groupIndex,
        },
        seq: toSeq(ev),
      };
      lastReasoningEmitted = text;
    }
  } else if (reasoningSummaryBuffer.length >= REASONING_MIN_LEN) {
    const sentenceMatch = reasoningSummaryBuffer.match(/[\s\S]*[.!?](\s|$)/);
    if (sentenceMatch && typeof sentenceMatch[0] === "string") {
      const text = sentenceMatch[0];
      reasoningSummaryBuffer = reasoningSummaryBuffer.slice(text.length);
      if (text && text !== lastReasoningEmitted) {
        const groupIndex = reasoningIndex++;
        yield {
          kind: "reasoning_block",
          block: {
            id: `reasoning:${groupIndex}`,
            title: undefined, // 제목은 ExecutionEngine에서 언어 맞춰서
            body: text,
            inlineSummary: text.slice(0, 120),
            groupIndex,
          },
          seq: toSeq(ev),
        };
        lastReasoningEmitted = text;
      }
    }
  }

  continue;
}

 if (ev?.type === "response.reasoning_summary_text.done") {
   if (reasoningSummaryBuffer && reasoningSummaryBuffer !== lastReasoningEmitted) {
     const groupIndex = reasoningIndex++;
     yield {
       kind: "reasoning_block",
       block: {
         id: `reasoning:${groupIndex}`,
         title: undefined,
         body: reasoningSummaryBuffer,
         inlineSummary: reasoningSummaryBuffer.slice(0, 120),
         groupIndex,
       },
       seq: toSeq(ev),
     };
     lastReasoningEmitted = reasoningSummaryBuffer;
   }

   reasoningSummaryBuffer = "";
   reasoningSummaryHasDelta = false;
   lastReasoningDeltaAt = 0;

   yield { kind: "reasoning_summary_done", seq: toSeq(ev) };
   continue;
 }
          
          // ✅ Answer text delta: emit immediately (smallest granularity)
          if (ev?.type === "response.output_text.delta") {
            const d = safeStr((ev as any).delta);
  if (!d) continue;

  // 🔒 절대 reasoning JSON이 answer로 흘러가지 않게 방어
  if (
    d.trim().startsWith("{") &&
    (d.includes('"steps"') || d.includes('"reasoning"'))
  ) {
    console.warn("[BLOCK_REASONING_LEAK]");
    continue;
  }

  sawOutputTextDelta = true;
  yield { kind: "text_delta", delta: d, seq: toSeq(ev) };
            continue;
          }

                    // ✅ SDK에 정의된 web_search_call 전용 스트림 이벤트도 있음
          // - query는 여기서 안 오지만, 시작/상태는 이걸로도 잡을 수 있음
          // code_interpreter in-progress events
          if (
            ev?.type === "response.code_interpreter_call.in_progress" ||
            ev?.type === "response.code_interpreter_call.interpreting" ||
            ev?.type === "response.code_interpreter_call.completed"
          ) {
            const callId = safeStr((ev as any)?.item_id ?? "");
            if (callId && !startedBuiltin.has(callId)) {
              startedBuiltin.add(callId);
              yield {
                kind: "tool_call_started",
                callId,
                name: "code_interpreter",
                toolType: "builtin",
                seq: toSeq(ev),
              };
              yield {
                kind: "activity",
                activity: { type: "code_interpreter", callId },
                seq: toSeq(ev),
              };
            }
            continue;
          }

          if (
            ev?.type === "response.web_search_call.in_progress" ||
            ev?.type === "response.web_search_call.searching" ||
            ev?.type === "response.web_search_call.completed"
          ) {
            const callId = safeStr((ev as any)?.item_id ?? "");
            if (callId && !startedBuiltin.has(callId)) {
              startedBuiltin.add(callId);
              yield {
                kind: "tool_call_started",
                callId,
                name: "web_search",
                toolType: "builtin",
                seq: toSeq(ev),
              };
              // 상태만 먼저 (query는 output_item에서 보통 잡힘)
              yield {
                kind: "activity",
                activity: { type: "web_search", callId },
                seq: toSeq(ev),
              };
            }
            continue;
          }

          // ✅ tool call “start” signal (output_item.added)
 if (ev?.type === "response.output_item.added") {
   const item = (ev as any).item;
            // ✅ Built-in web search tool call item
            // Response output items can include type:"web_search_call"
            if (item && isResponseWebSearchCall(item)) {
              const callId = safeStr((item as any).id ?? "web_search:unknown");
              const query = extractWebSearchQuery(item);
              yield {
                kind: "tool_call_started",
                callId,
                name: "web_search",
                toolType: "builtin",
                seq: toSeq(ev),
              };
              // ✅ query는 action.queries[0] 우선, action.query fallback (deprecated)
              // query가 없어도 "검색 시작" 자체는 보내서 UI가 인라인 표시 가능
              yield {
                kind: "activity",
                activity: {
                  type: "web_search",
                  callId,
                  ...(query ? { query } : {}),
                  sources: [],
                },
                seq: toSeq(ev),
              };
              startedBuiltin.add(callId);
             continue;
            }
   if (item?.type === "message") {
     if (!sawOutputTextDelta) {
       const text =
         item?.content?.map((c: any) => c?.text ?? "").join("") ??
         item?.output_text ??
         "";
       if (text) {
         yield { kind: "text_delta", delta: text, seq: toSeq(ev) };
       }
     }
     continue;
   }
   if (item?.type === "function_call") {
             // 🔒 SSOT: tool call 매칭 키는 항상 item.id (== item_id)로 통일
              const itemId = safeStr(item.id ?? "item:unknown");
              const callId = safeStr(item.call_id ?? itemId);
              if (itemId && callId) itemIdToCallId.set(itemId, callId);
              const name = typeof item.name === "string" ? item.name : null;
              yield { kind: "tool_call_started", callId, name, toolType: "function", seq: toSeq(ev) };
              continue;
            }
            if (item?.type === "custom_tool_call") {
              const itemId = safeStr(item.id ?? "item:unknown");
              const callId = safeStr(item.call_id ?? itemId);
              if (itemId && callId) itemIdToCallId.set(itemId, callId);
              const name = typeof item.name === "string" ? item.name : null;
              yield { kind: "tool_call_started", callId, name, toolType: "custom", seq: toSeq(ev) };
              continue;
            }
            // code_interpreter call started (built-in)
            if (item?.type === "code_interpreter_call") {
              const callId = safeStr(item.id ?? "code_interpreter:unknown");
              startedBuiltin.add(callId);
              yield {
                kind: "tool_call_started",
                callId,
                name: "code_interpreter",
                toolType: "builtin",
                seq: toSeq(ev),
              };
              yield {
                kind: "activity",
                activity: { type: "code_interpreter", callId },
                seq: toSeq(ev),
              };
              continue;
            }
          }

          // ✅ tool call output (output_item.done)
 if ((ev as any)?.type === "response.output_item.done") {
   const item = (ev as any).item;
            if (item && isResponseWebSearchCall(item)) {
              const callId = safeStr((item as any).id ?? "web_search:unknown");
              const sources = Array.isArray((item as any)?.action?.sources)
                ? (item as any).action.sources
                : [];
              const query = extractWebSearchQuery(item);

  // 🔥 결과 즉시 activity publish
  yield {
    kind: "activity",
    activity: {
      type: "web_search_result",
      callId,
      sources,
      ...(query ? { query } : {}),
    },
    seq: toSeq(ev),
  };
              const output = {
                // ExecutionEngine expects output.sources[*].url
                sources,
                 action: (item as any)?.action ?? null,
              };

              if (process.env.YUA_DEBUG_WEB_SOURCES === "1") {
                console.log("[WEB_SEARCH_RAW_OUTPUT]", JSON.stringify(output, null, 2));
              }

              yield {
                kind: "tool_call_output",
                callId,
                output,
                toolType: "builtin",
                seq: toSeq(ev),
              };
              continue;
            }
   if (item?.type === "message") {
     if (!sawOutputTextDelta) {
       const text =
         item?.content?.map((c: any) => c?.text ?? "").join("") ??
         item?.output_text ??
         "";
       if (text) {
         yield { kind: "text_delta", delta: text, seq: toSeq(ev) };
       }
     }
     continue;
   }
   if (item?.type === "function_call") {
     const itemId = safeStr(item.id ?? "item:unknown");
     const callId = safeStr(item.call_id ?? itemId);
     if (itemId && callId) itemIdToCallId.set(itemId, callId);
    const output =
      item?.output ??
      item?.output_text ??
      item?.result ??
      {};
     yield {
       kind: "tool_call_output",
       callId,
       output,
       toolType: "function",
       seq: toSeq(ev),
     };
     continue;
   }
   if (item?.type === "custom_tool_call") {
     const itemId = safeStr(item.id ?? "item:unknown");
     const callId = safeStr(item.call_id ?? itemId);
     if (itemId && callId) itemIdToCallId.set(itemId, callId);
    const output =
      item?.output ??
      item?.output_text ??
      item?.result ??
      {};
     yield {
       kind: "tool_call_output",
       callId,
       output,
       toolType: "custom",
       seq: toSeq(ev),
     };
     continue;
   }
   // code_interpreter output (built-in tool)
   if (item?.type === "code_interpreter_call") {
     const callId = safeStr(item.id ?? "code_interpreter:unknown");
     const code = safeStr(item.code ?? (item as any)?.input ?? "");
     const results = Array.isArray((item as any)?.results) ? (item as any).results : [];
     const textOutput = results
       .filter((r: any) => r?.type === "text" || r?.type === "logs")
       .map((r: any) => safeStr(r?.text ?? r?.logs ?? ""))
       .join("\n");
     const images = results
       .filter((r: any) => r?.type === "image")
       .map((r: any) => ({
         url: safeStr(r?.image?.url ?? r?.url ?? r?.image_url ?? ""),
         mimeType: safeStr(r?.image?.content_type ?? r?.mime_type ?? "image/png"),
       }))
       .filter((img: any) => img.url);

     yield {
       kind: "code_interpreter_output",
       callId,
       code,
       output: textOutput,
       images,
       seq: toSeq(ev),
     };

     // Also yield as tool_call_output for continuation flow
     yield {
       kind: "tool_call_output",
       callId,
       output: { code, text: textOutput, images },
       toolType: "builtin",
       seq: toSeq(ev),
     };
     continue;
   }
 }

          // ✅ function call args delta/done
 if (ev?.type === "response.function_call_arguments.delta") {
            const itemId = safeStr((ev as any).item_id ?? "item:unknown");
            const callId = itemIdToCallId.get(itemId) ?? itemId;
   const d = safeStr((ev as any).delta);
            if (d) yield { kind: "tool_call_arguments_delta", callId, delta: d, toolType: "function", seq: toSeq(ev) };
            continue;
          }
 if (ev?.type === "response.function_call_arguments.done") {
            const itemId = safeStr((ev as any).item_id ?? "item:unknown");
            const callId = itemIdToCallId.get(itemId) ?? itemId;
            yield { kind: "tool_call_arguments_done", callId, toolType: "function", seq: toSeq(ev) };
            continue;
          }

          // ✅ custom tool input delta (및 done이 있으면 같이)
 if (ev?.type === "response.custom_tool_call_input.delta") {
const itemId = safeStr((ev as any).item_id ?? "item:unknown");
const callId = itemIdToCallId.get(itemId) ?? itemId;
   const d = safeStr((ev as any).delta);
            if (d) yield { kind: "tool_call_arguments_delta", callId, delta: d, toolType: "custom", seq: toSeq(ev) };
            continue;
          }
 if (ev?.type === "response.custom_tool_call_input.done") {
const itemId = safeStr((ev as any).item_id ?? "item:unknown");
const callId = itemIdToCallId.get(itemId) ?? itemId;
            yield { kind: "tool_call_arguments_done", callId, toolType: "custom", seq: toSeq(ev) };
            continue;
          }

 if (ev?.type === "response.completed") {
  const usage = extractUsageFromCompleted(ev);
  if (usage) {
    yield { kind: "usage", usage, seq: toSeq(ev) };
  }
  // 🔥 FINAL SAFETY FLUSH: reasoningSummaryBuffer 남아있으면 마지막 block 방출
  if (reasoningSummaryBuffer) {
    yield {
      kind: "reasoning_block",
      block: {
        id: `reasoning:${reasoningIndex++}`,
        title: undefined,
        body: reasoningSummaryBuffer,
        inlineSummary: reasoningSummaryBuffer.slice(0, 120),
      },
      seq: toSeq(ev),
    };
    reasoningSummaryBuffer = "";
    lastReasoningEmitted = "";
  }
   // allow outer loop to decide continuation
   continue;
 }
          // ✅ 나머지는 unknown으로 남겨두되, 디버깅/원형 보존
          if (typeof ev?.type === "string") {
            yield { kind: "unknown", type: ev.type, seq: toSeq(ev) };
          }
        }
      } finally {
      }
    }

    return { type: "stream", stream: generator() };
  }

  /* ======================================================================== */
  /* NON-STREAM MODE                                                          */
  /* ======================================================================== */
  const res = await client.responses.create(
{ ...baseReq },
    { signal }
  );

 const raw = String(res.output_text ?? "").trim();

 // 🔒 SSOT: Auto-title normalization
 let normalized = raw
   .split("\n")[0]              // 한 줄만
   .replace(/["'`]/g, "")       // 따옴표 제거
   .replace(/[^\w가-힣\s]/g, "") // 특수문자 제거
   .replace(/\s+/g, " ")
   .trim();

 const MAX = 24;
 if (normalized.length > MAX) {
   normalized = normalized.slice(0, MAX).trim();
 }

 return {
   type: "text",
   text: normalized || "New Chat",
 };
}
