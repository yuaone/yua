// 🔥 YUA Prompt Runtime — STABLE CORE (2026.01)
// --------------------------------------------------
// ✔ Prompt 생성 ❌
// ✔ Decision 결과 소비 ONLY
// ✔ 메타 정리 + PromptBuilder로 위임
// --------------------------------------------------

import type { ChatMode } from "../types/chat-mode";
import { OUTMODE } from "../types/outmode";
import type { PersonaContext } from "../../persona/persona-context.types";
import type { FlowAnchor } from "../../reasoning/reasoning-engine";
import type { ExecutionPlan } from "../../execution/execution-plan";
import type { ExecutionResult } from "../../execution/execution-result";
import { sanitizeContent } from "../../utils/sanitizer";
import type { TurnIntent } from "../types/turn-intent";
import type { TopicShift } from "../../decision/topic-shift-detector";
import { PromptBuilder } from "../../utils/prompt-builder";
import { PromptBuilderDeep } from "../../utils/prompt-builder-deep";
import { estimateTokens } from "../../../utils/tokenizer";
import type { ISO639_1 } from "../../style/detector.interface";
import type { ResponseHint } from "../types/response.final";
import type { FailureSurface } from "../../selfcheck/failure-surface-engine";
import type { ThinkingProfile }
  from "yua-shared/types/thinkingProfile";
  import { StructuredCodeIngest } from "../../code-ingest/structured-code-ingest";
import type { DbClient } from "../../file-intel/vector/db";
import type { Embedder as FileEmbedder } from "../../file-intel/vector/embedder";
/* -------------------------------------------------- */
/* Prompt Runtime Result                               */
/* -------------------------------------------------- */
export interface PromptRuntimeResult {
  message: string;
  meta: {
    memoryContext?: string;
     referenceContext?: string;
    trustedFacts?: string;
    constraints?: string[];
    uiThinkingAllowed?: boolean;
    fileRagConfidence?: number;
    personaPermission?: {
  allowNameCall: boolean;
  allowPersonalTone: boolean;
  displayName?: string | null;
};
    reasoning?: PromptRuntimeMeta["reasoning"];
    outmode?: OUTMODE;
  };
}

/* -------------------------------------------------- */
/* Prompt Runtime Meta (SSOT SAFE)                     */
/* -------------------------------------------------- */
export interface PromptRuntimeMeta {
    conversationTurns?: {
    role: "user" | "assistant" | "system";
    content: string;
  }[];

  /**
   * 🔥 Design Observations (SSOT)
   * - Reference only
   * - MUST NOT be treated as instruction or constraint
   */
  designHints?: {
    stage: string;
    observations: string[];
    confidence: number;
  }[];
   // 🔥 SSOT: Multimodal hint (READ-ONLY)
  // - PromptRuntime에서 Vision framing 용도로만 사용
  // - 판단 / Decision / Memory 영향 ❌
  attachments?: {
    kind: "image" | "audio" | "video" | "file";
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    url?: string;
  }[];
  memoryContext?: string;
  referenceContext?: string;
  trustedFacts?: import("../../tools/tool-runner").TrustedFactHint[];
  signals?: import("../../signals/yua-signal.types").YuaSignal[];
  toneBias?: import("../../decision/decision-context.types").DecisionContext["toneBias"];
  constraints?: string[];
    // 🔥 Continuity (from ContextRuntime)
  anchorConfidence?: number;
  continuityAllowed?: boolean;
  contextCarryLevel?: "RAW" | "SEMANTIC" | "ENTITY";
  responseDensityHint?: import("../types/response-density").ResponseDensityHint;
  conversationalOutcome?: import("../../decision/conversational-outcome").ConversationalOutcome;
  outputTransformHint?: 
   | "DELTA_ONLY"
   | "ROTATE"
   | "SUMMARIZE"
   | "CONCLUDE"
   | "SOFT_EXPAND";

    // 🔥 SSOT: Response Mode (controls output structure, not tone)
  responseMode?: {
  mode: "ANSWER" | "CONTINUE" | "CLARIFY";
  forbidQuestion?: boolean;
    forbid?: {
      intro?: boolean;
      domainDefinition?: boolean;
      backgroundExplanation?: boolean;
      reSummary?: boolean;
    };
  };

    // 🔥 Response Density Hint (NON-BINDING)
  // - 말의 밀도에 대한 참고 신호
  // - enforcement 금지
  responseHint?: ResponseHint;
  leadHint?: import("../types/lead-hint").LeadHint; // 🔥 READ-ONLY
  explanationRequested?: boolean;
  failureSurface?: FailureSurface;
  turnIntent?: TurnIntent;
  topicShift?: TopicShift;

  reasoning?: {
    stage?: "clarifying" | "explaining" | "solving" | "closing";
    depthHint: "shallow" | "normal" | "deep";
    cognitiveLoad: "low" | "medium" | "high";
    nextAnchors: FlowAnchor[];
    confidence?: number;
  };

  executionPlan?: ExecutionPlan;
  executionResult?: ExecutionResult;
  threadId?: number;
  workspaceId?: string;
  fileSessionId?: string;
  fileRag?: {
    db: DbClient;
    embedder: FileEmbedder;
    workspaceId: string;
  };
  fileSignals?: {
    hasFile: boolean;
    hasFileIntent: boolean;
    relevanceScore: number;
  };
  fileRagForceOnce?: boolean; // 🔥 ADD
  fileRagConfidence?: number;
  fileRagConflict?: boolean;

  personaPermission?: {
    allowNameCall: boolean;
    allowPersonalTone: boolean;
    displayName?: string | null;
  };
  outmode?: OUTMODE;
}

function buildLanguageConstraint(
  language?: ISO639_1
): string | undefined {
  if (!language || language === "unknown") return undefined;

  switch (language) {
    case "ko":
      return (
        "자연어 설명은 반드시 한국어로 작성해야 한다. " +
        "코드 블록, 식별자, 키워드, API 이름은 번역하지 말고 원문을 그대로 유지해야 한다."
      );

    case "en":
      return (
        "All natural language explanations must be written in English. " +
        "Do not translate code blocks, identifiers, keywords, or API names. Keep them exactly as-is."
      );

    default:
      return (
        "All natural language explanations must be written in the detected user language. " +
        "Do not translate code blocks, identifiers, keywords, or API names."
      );
  }
}

const HARD_REF_TOKEN_CAP = 6000;

function trimByTokenBudget(text: string, maxTokens: number): string {
  if (!text) return "";
  const tokens = estimateTokens(text);
  if (tokens <= maxTokens) return text;

  // Smart trim: keep beginning (system rules) AND end (recent context)
  const halfBudget = Math.floor(maxTokens * 4 / 2);
  const head = text.slice(0, halfBudget);
  const tail = text.slice(-halfBudget);
  return head + "\n\n(...middle context truncated...)\n\n" + tail;
}

/**
 * Sanitize external data before embedding in system prompt.
 * Strips potential prompt injection patterns.
 */
export function sanitizeToolOutput(raw: unknown): string {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
  return text
    // Strip common injection patterns
    .replace(/\[(?:SYSTEM|INSTRUCTION|RULE|IMPORTANT|OVERRIDE|IGNORE)[^\]]*\]/gi, "[REDACTED]")
    .replace(/(?:ignore|disregard|forget)\s+(?:above|previous|all)\s+(?:instructions?|rules?|prompts?)/gi, "[REDACTED]")
    .replace(/you\s+are\s+now\b/gi, "[REDACTED]")
    .replace(/(?:^|\n)\s*(?:system|developer|admin)\s*:/gi, "\n[REDACTED]:")
    // Limit length per field
    .slice(0, 2000);
}

function renderTrustedFacts(
  facts?: import("../../tools/tool-runner").TrustedFactHint[]
): string[] | undefined {
  if (!facts || facts.length === 0) return undefined;

  return facts.map(f => {
    switch (f.kind) {
      case "MARKET_SERIES":
        return `시장 데이터 (${sanitizeToolOutput(f.market)} ${sanitizeToolOutput(f.symbol)})
- 기간: ${sanitizeToolOutput(f.coverage.start)} ~ ${sanitizeToolOutput(f.coverage.end)}
- 최신 OHLCV: ${sanitizeToolOutput(f.latest?.fields)}`;
      default:
        return "";
    }
  }).filter(Boolean);
}

function renderSignals(
  signals?: import("../../signals/yua-signal.types").YuaSignal[]
): string | undefined {
  if (!signals || signals.length === 0) return undefined;

  const eventSignals = signals.filter(
    s => s.origin === "EventMarketSolver"
  );

  if (!eventSignals.length) return undefined;

  return (
    "[MARKET EVENT SIGNAL]\n" +
    eventSignals
      .map(
        s =>
          `- value=${s.value}, confidence=${s.confidence}`
      )
      .join("\n")
  );
}




/* -------------------------------------------------- */
/* Prompt Runtime                                     */
/* -------------------------------------------------- */
export async function runPromptRuntime(args: {
  personaRole: string;
  message: string;
  mode: ChatMode;
  thinkingProfile?: ThinkingProfile; // 🔥 ADD
  meta: PromptRuntimeMeta;
  styleProfile?: never;
  styleHint?: string;
  turnIndex?: number;
  language?: ISO639_1; 
  threadId?: number;      // ✅ (옵션) 여기서 바로 받을 수 있으면 베스트
  traceId?: string;
  stream?: boolean;
}): Promise<PromptRuntimeResult> {
  const sanitizedMessage = sanitizeContent(args.message);
 // 🔥 LARGE CODE SAFE INGEST
 const structured = StructuredCodeIngest.run({
   message: sanitizedMessage,
 });

 const finalUserMessage =
   structured?.focusPrompt ?? sanitizedMessage;
  const { meta } = args;
const hasText = sanitizedMessage.trim().length > 0;


    // 🔥 SSOT: Vision signal (HINT ONLY, no control)
 const hasImage =
   Array.isArray(meta.attachments) &&
   meta.attachments.some(
     a => a.kind === "image" && typeof (a as any).url === "string"
   );
     /* -------------------------------------------------- */
  /* 🔥 Vision Response Mode Split (SSOT)              */
  /* - IMAGE_ANALYSIS라도 항상 분석형으로 가지 않음   */
  /* - 자연 대화형 Vision 허용                         */
  /* -------------------------------------------------- */

  const isVisionTask =
    meta.executionPlan?.task === "IMAGE_ANALYSIS";

  const conversationalVision =
    isVisionTask &&
    meta.turnIntent === "QUESTION" &&
    meta.reasoning?.depthHint !== "deep";

  if (conversationalVision) {
    meta.constraints = [
      ...(meta.constraints ?? []),
      "이미지에 대해 사람이 대화하듯 자연스럽게 반응하라.",
      "보고서형 분석 구조(항목 나열, 구조화된 관찰 목록)는 피하라.",
      "불필요하게 세부 분석으로 과도하게 확장하지 말 것.",
    ];
  }

      // 🔒 SSOT: PromptBuilder로 전달 가능한 attachment만 선별
  // - image | file 만 허용
  // - fileName + url 있는 경우만
  const builderAttachments =
    Array.isArray(meta.attachments)
      ? meta.attachments
          .map((a) => {
            const url = (a as any).url;
            if (a.kind === "image") {
              // ✅ image는 fileName 없을 수도 있으니 허용 (PromptBuilder는 image에 fileName을 강제하지 않아도 됨)
              return typeof url === "string"
                ? {
                    kind: "image" as const,
                    fileName: (a as any).fileName ?? "image",
                    mimeType: a.mimeType,
                    sizeBytes: (a as any).sizeBytes,
                    url,
                  }
                : null;
            }
            if (a.kind === "file") {
              const fileName = (a as any).fileName;
              return typeof url === "string" && typeof fileName === "string"
                ? {
                    kind: "file" as const,
                    fileName,
                    mimeType: a.mimeType,
                    sizeBytes: (a as any).sizeBytes,
                    url,
                  }
                : null;
            }
            return null;
          })
          .filter(Boolean) as {
          kind: "image" | "file";
          fileName: string;
          mimeType?: string;
          sizeBytes?: number;
          url: string;
        }[]
      : undefined;

  const fileRagMeta = {
    fileRag: meta.fileRag,
    fileSessionId: meta.fileSessionId,
    threadId: args.threadId ?? meta.threadId,
    workspaceId: meta.workspaceId ?? meta.fileRag?.workspaceId,
    fileSignals: meta.fileSignals,
    fileRagForceOnce: meta.fileRagForceOnce,
  };

 // ✅ Guard: 이미지 생성 요청인데 attachments가 없으면
  // - "외부 이미지 URL을 답변으로 출력" 금지
  // - "JSON만 던지고 끝" 금지
  // - 대신 "Execution 결과를 기다리는 안내" 정도의 자연어만 허용
  //   (실제로는 ChatEngine에서 Execution으로 보내는 게 정답)
  if (!hasImage) {
    meta.constraints = [
      ...(meta.constraints ?? []),
      "이미지 생성 결과를 외부 URL 링크로 직접 제공하지 말 것.",
      "JSON 객체만 단독으로 출력하지 말 것.",
      "사용자에게는 자연어로 짧게 안내하고, 실제 이미지는 시스템의 생성 파이프라인 결과로 제공할 것.",
    ];
  }

 // 🔒 SSOT: ExecutionResult narrowing
  const evidenceSignals =
    meta.executionResult?.ok === true
      ? meta.executionResult.evidenceSignals
      : undefined;

   // 🔒 SSOT: CLARIFY는 "첫 턴 + 진짜 애매"에서만 허용해야 함.
  // PromptRuntime는 강제하지 않고, Builder에게 정책 힌트로만 전달한다.
  // (실제 ambiguous 판별은 Decision 단계가 더 맞지만, 최소 방어)
  const isFirstTurn = (args.turnIndex ?? 0) < 1;
  const looksAmbiguous =
    hasText &&
    sanitizedMessage.length <= 18 &&
    !/[?.!]|(왜|어떻게|뭐|무엇|어떤|which|what|why|how)/i.test(sanitizedMessage);
  if (!isFirstTurn && meta.responseMode?.mode === "CLARIFY") {
    meta.responseMode = { mode: "ANSWER" };
  }
  if (!meta.responseMode && isFirstTurn && looksAmbiguous) {
    meta.responseMode = { mode: "CLARIFY" };
  }

   // 🔒 SSOT: Output Language Enforcement (Constraint-level)
  const languageConstraint = buildLanguageConstraint(
    args.language
  );

 const effectiveConstraints = languageConstraint
   ? [...(meta.constraints ?? []), languageConstraint]
   : meta.constraints;

    // -------------------------------
  // 🎨 STYLE SIGNAL DETECTION (SSOT)
  // -------------------------------
// 🔒 SSOT: Tone must never be inferred or modified here
const styleHint = args.styleHint;


console.log("[TRACE][PROMPT_RUNTIME_ENTRY]", {
  messageLength: sanitizedMessage?.length ?? 0,
  turnIntent: meta.turnIntent,
  outmode: meta.outmode,
  depthHint: meta.reasoning?.depthHint,
});



 console.log("[DEBUG][PROMPT_RUNTIME_REFERENCE_CHECK]", {
   hasReferenceContext: !!meta.referenceContext,
   referenceLength: meta.referenceContext?.length ?? 0,
 });
   
    /* -------------------------------------------------- */
  /* 🔥 TOKEN PREFLIGHT GUARD (SSOT)                    */
  /* - PromptBuilder 호출 전 위험 차단                 */
  /* -------------------------------------------------- */

  const rawReference =
    meta.referenceContext ?? meta.memoryContext ?? "";

  const cappedReference = trimByTokenBudget(
    rawReference,
    HARD_REF_TOKEN_CAP
  );

  const estimatedTokens =
    args.mode === "FAST"
      ? 0
      : estimateTokens(
          [
            sanitizedMessage,
            cappedReference,
            renderTrustedFacts(meta.trustedFacts)?.join("\n"),
            meta.constraints?.join("\n"),
          ]
            .filter(Boolean)
            .join("\n\n")
        );
   /* -------------------------------------------------- */
  /* 🔥 DESIGN INTENT RESOLUTION (SSOT)                 */
  /* -------------------------------------------------- */
  const isDesignLike =
     meta.executionPlan?.task === "CODE_GENERATION" ||
    meta.executionPlan?.task === "REFACTOR" ||
    // 🔒 SSOT: 코드 리뷰도 설계/분석 범주
    meta.executionPlan?.task === "CODE_REVIEW";

  const implementationMode =
    meta.executionPlan?.task === "CODE_GENERATION" ||
    meta.executionPlan?.task === "REFACTOR" ||
    meta.executionPlan?.task === "TYPE_ERROR_FIX" ||
    meta.executionPlan?.task === "RUNTIME_ERROR_FIX";

  // 🔥 SSOT: FOLLOW-UP은 "짧은 후속 질문"에서만 켠다.
  // - 새 주제 질문(길고 완결형)은 FOLLOW-UP 금지
    const isFollowUp =
    meta.continuityAllowed === true;
  // 🔒 SSOT: PromptRuntime에서는 CLARIFY / 요약 모드 강제 금지
  // 응답 성격은 Decision 단계에서만 결정한다

const TOKEN_LIMIT =
  args.mode === "FAST"
    ? 2000
    : args.mode === "DEEP"
    ? 32000
    : 6000;

  /* ---------------- HARD GUARD ---------------- */
  // 🔒 SSOT: Token overflow 시 "출력 금지"가 아니라
  const tokenOverflow =
    estimatedTokens > TOKEN_LIMIT * 1.2;

  const effectiveReferenceContext =
    [cappedReference, renderSignals(meta.signals)]
      .filter(Boolean)
      .join("\n\n");

  const effectiveMemoryContext = cappedReference;

  const effectiveReasoning = tokenOverflow && meta.reasoning
    ? {
        ...meta.reasoning,
        depthHint: "shallow" as const,
        stage: "explaining" as const,
        confidence:
          meta.reasoning.confidence != null
            ? Math.min(meta.reasoning.confidence, 0.45)
            : 0.45,
      }
    : meta.reasoning;



  const effectiveTrustedFacts =
    tokenOverflow
      ? meta.trustedFacts?.slice(0, 5)
      : meta.trustedFacts;

  const effectiveOutputTransformHint =
    tokenOverflow ? "SOFT_EXPAND" : meta.outputTransformHint;

  const effectiveResponseMode =
    tokenOverflow ? { mode: "ANSWER" as const } : meta.responseMode;

 const explanationRequested =
   meta.explanationRequested === true;

 const designMode =
   meta.toneBias?.profile === "DESIGNER" ||
   meta.executionPlan?.task === "CODE_GENERATION" ||
   meta.executionPlan?.task === "REFACTOR" ||
   meta.executionPlan?.task === "CODE_REVIEW" ||
   (meta.reasoning?.depthHint === "deep" &&
     meta.turnIntent === "QUESTION" &&
     meta.leadHint !== "SOFT" &&
     meta.responseMode?.mode !== "ANSWER");

 const guardedConstraints = [
   ...(effectiveConstraints ?? []),
   ...(meta.turnIntent === "QUESTION" &&
   (explanationRequested || meta.reasoning?.depthHint === "deep") &&
   !designMode
     ? [
         "이 질문은 단일 응답으로 자연스럽게 완결되는 설명이 적절하다.",
         "후속 논의나 다음 단계 제안은 필요하지 않다면 생략해도 된다.",
       ]
     : []),
 ];

  /* ---------------- SOFT GUARD ---------------- */
 const effectiveMode = args.mode;
 const thinkingProfile = args.thinkingProfile ?? "NORMAL";

   /**
   * 🔒 SSOT: DEEP + QUESTION 종료 가드
   * - DEEP는 깊이 허용이지 무한 확장 허가가 아니다
   * - QUESTION에서는 반드시 "완결형"으로 끝나야 한다
   * - 강제 행동 ❌, 힌트만 전달
   */
 const guardedOutputTransformHint =
   designMode
     ? undefined
     : effectiveOutputTransformHint;

// 🔥 SSOT GUARD: Invalid CONTINUATION rollback
 // 🔥 SSOT: CONTINUATION은 의미 신호가 있으면 QUESTION보다 우선
 const safeTurnIntent =
   meta.turnIntent === "CONTINUATION"
     ? "CONTINUATION"
     : meta.turnIntent;

        // 🔒 SSOT: PromptBuilder는 대화 제어용 intent만 허용
 const builderTurnIntent =
   safeTurnIntent === "QUESTION" ||
   safeTurnIntent === "CONTINUATION" ||
   safeTurnIntent === "SHIFT"
     ? safeTurnIntent
     : undefined;

    // 🔥 ROLLBACK: 출력 밀도 / 델타 제어 전부 제거
  // PromptRuntime는 출력 제어를 하지 않는다
// 🔒 SSOT: outputTransformHint is a constraint-only signal.
// PromptRuntime MUST NOT translate it into behavior.
// It is forwarded as-is to PromptBuilder.
 // 🔥 ROLLBACK: CONTINUATION framing 제거

  let executionContextBlock = "";
  if (meta.executionPlan && meta.executionResult?.ok) {
   const observationHints =
      (meta.executionResult.output as any)?.observation?.hints;

    executionContextBlock = observationHints
      ? `
[IMAGE OBSERVATION HINTS]
${observationHints.join("\n")}
`
      : "";
  }

  if (
    meta.executionPlan?.task === "FILE_INTELLIGENCE" &&
    meta.executionResult?.ok === true
  ) {
    meta.constraints = [
      ...(meta.constraints ?? []),
      "The uploaded file has already been opened locally. Do NOT say you cannot access external URLs.",
    ];
  }

    // PromptRuntime NEVER auto-falls back to Lite by token size
    /* -------------------------------------------------- */
  /* 🔥 BUILDER ROUTING (SSOT CORE)                     */
  /* -------------------------------------------------- */

  let message: string | undefined;

  /* ---------- FAST PATH ---------- */
  if (args.mode === "FAST") {
    // 🔥 SSOT: Vision 입력은 Lite Builder 금지 (덮어쓰기 버그 방지: else-if 체인)
    if (hasImage) {
      message = await PromptBuilder.buildChatPrompt(args.personaRole, finalUserMessage, {
        evidenceSignals,
        ...fileRagMeta,
        personaPermission: meta.personaPermission,
        attachments: builderAttachments,
        memoryContext: effectiveMemoryContext,
        trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
        constraints: guardedConstraints,
        styleHint,
        responseMode: effectiveResponseMode?.mode,
        outputTransformHint: guardedOutputTransformHint,
        policy: {
          allowSearch: meta.executionPlan?.task === "SEARCH",
          allowMemory: !!meta.memoryContext,
          restrictAnswer: false,
          forceUseTrustedFacts: true,
          forbidAccessLimitationMentions: true,
        },
      });
    } else if (
      safeTurnIntent === "QUESTION" &&
      meta.reasoning?.depthHint === "deep"
    ) {
      message = await PromptBuilder.buildChatPrompt(args.personaRole, finalUserMessage, {
        ...fileRagMeta,
        personaPermission: meta.personaPermission,
        memoryContext: effectiveMemoryContext,
        trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
        constraints: guardedConstraints,
        styleHint,
        responseMode: effectiveResponseMode?.mode,
        outputTransformHint: guardedOutputTransformHint,
        policy: {
          allowSearch: meta.executionPlan?.task === "SEARCH",
          allowMemory: !!meta.memoryContext,
          restrictAnswer: false,
        },
      });
    } else if (safeTurnIntent === "CONTINUATION") {
      message = await PromptBuilder.buildChatPrompt(
        args.personaRole,
        sanitizedMessage,
        {
          ...fileRagMeta,
          personaPermission: meta.personaPermission,
          memoryContext: effectiveMemoryContext,
          trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
          constraints: guardedConstraints,
          styleHint,
          responseMode: effectiveResponseMode?.mode,
          outputTransformHint: guardedOutputTransformHint,
          policy: {
            allowSearch: meta.executionPlan?.task === "SEARCH",
            allowMemory: !!meta.memoryContext,
            restrictAnswer: false,
          },
        }
      );
    } else {
      message = await PromptBuilder.buildChatPrompt(
        args.personaRole,
        finalUserMessage,
        {
          evidenceSignals,
          ...fileRagMeta,
          personaPermission: meta.personaPermission,
          memoryContext: effectiveMemoryContext,
          trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
          constraints: guardedConstraints,
          styleHint,
          responseMode: effectiveResponseMode?.mode,
          outputTransformHint: guardedOutputTransformHint,
          policy: {
            allowSearch: meta.executionPlan?.task === "SEARCH",
            allowMemory: !!meta.memoryContext,
            restrictAnswer: false,
          },
        }
      );
    }
  }

  /* ---------- DEEP PATH ---------- */
  else if (
    implementationMode
  ) {
message = await PromptBuilder.buildChatPrompt(
  args.personaRole,
  finalUserMessage,
  {
    // 🔥 implementation mode explicit override
    implementationMode: true,
    ...fileRagMeta,

    // ✅ NORMAL PATH와 동일한 안전 필드만 전달
    executionPlan: meta.executionPlan,
    executionResult: meta.executionResult,
    personaPermission: meta.personaPermission,
    turnIntent: builderTurnIntent,
    attachments: builderAttachments,
    responseMode: effectiveResponseMode?.mode,
    responseDensityHint: meta.responseDensityHint,
    outputTransformHint: guardedOutputTransformHint,
    memoryContext: effectiveReferenceContext,
    trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
    constraints: guardedConstraints,
    styleHint,

    // 🔒 tone은 PromptBuilder에서 implementationMode로 override됨
    tone: meta.toneBias?.profile
      ? meta.toneBias.profile === "DESIGNER"
        ? "structured-design"
        : "expert-friendly-explanatory"
      : undefined,

    policy: {
      allowSearch: meta.executionPlan?.task === "SEARCH",
      allowMemory: !!meta.memoryContext,
      restrictAnswer: false,
    },
  }
);
  }
  else if (
    thinkingProfile === "DEEP" &&
    meta.reasoning?.depthHint === "deep" &&
    (
      safeTurnIntent !== "CONTINUATION" ||
      meta.anchorConfidence != null &&
      meta.anchorConfidence >= 0.4
    )
  ) {
 message = PromptBuilderDeep.build({
      message: [
        finalUserMessage,
        executionContextBlock,
      ]
        .filter(Boolean)
        .join("\n\n"),
      trustedFacts: renderTrustedFacts(effectiveTrustedFacts),
    researchContext:
      meta.memoryContext &&
      meta.memoryContext.length > 0
        ? meta.memoryContext
        : undefined,
      depth:
        meta.reasoning?.depthHint === "deep"
          ? "DENSE"
          : "STANDARD",
      ssot: true,
    });
  }
  

  /* ---------- NORMAL PATH ---------- */
  else {
    message = await PromptBuilder.buildChatPrompt(
      args.personaRole,
      finalUserMessage,
      {
        evidenceSignals,
        ...fileRagMeta,
        // ✅ SSOT: PromptBuilder가 intent-aware 하게 동작하려면 꼭 전달
        personaPermission: meta.personaPermission,
        turnIntent: builderTurnIntent,
        attachments: builderAttachments,
        responseMode: effectiveResponseMode?.mode,
        responseDensityHint: meta.responseDensityHint,
        outputTransformHint: guardedOutputTransformHint,
        instanceId: (meta as any).personaContext?.instanceId ?? (meta as any).instanceId,
        memoryContext: effectiveReferenceContext,
        trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
         constraints:
   safeTurnIntent === "QUESTION" &&
   meta.reasoning?.depthHint !== "deep" &&
   meta.reasoning?.stage !== "solving"
     ? undefined
     : meta.constraints,
        styleHint,
         responseHint:
   safeTurnIntent === "CONTINUATION" ||
   meta.reasoning?.depthHint === "deep"
     ? meta.responseHint
     : undefined,
        depthHint: effectiveReasoning?.depthHint,
          // 🔥 SSOT: tone은 turnIntent가 아니라
          // reasoning 결과를 기반으로 결정
        tone:
          conversationalVision
            ? "friendly-step-by-step"
            : meta.toneBias?.profile === "DESIGNER"
            ? "structured-design"
            : meta.toneBias?.profile === "EXECUTIVE"
            ? "expert-friendly-explanatory"
            : meta.toneBias?.profile === "CASUAL"
            ? "friendly-step-by-step"
            : meta.toneBias?.profile
            ? "expert-friendly-explanatory"
            : undefined,
        policy: {
          allowSearch: meta.executionPlan?.task === "SEARCH",
          allowMemory: !!meta.memoryContext,
          restrictAnswer: false,
          }
        },
    );
  }

  // 🔒 SSOT HARD GUARD: PromptBuilder 결과 검증
  
 if (
   meta.executionPlan?.task !== "IMAGE_ANALYSIS" &&
   (!message || message.trim().length === 0)
 ) {
   throw new Error(
     "[SSOT_VIOLATION] PromptRuntime produced empty prompt"
   );
 }

 const uiThinkingAllowed =
  args.thinkingProfile === "DEEP";

  return {
    message,
    meta: {
      referenceContext: effectiveReferenceContext,
      trustedFacts: renderTrustedFacts(effectiveTrustedFacts)?.join("\n"),
      constraints: guardedConstraints,
      personaPermission: meta.personaPermission,
      reasoning: meta.reasoning,
      uiThinkingAllowed,
      fileRagConfidence: meta.fileRagConfidence,
      outmode: meta.outmode,
    },
  };
}
