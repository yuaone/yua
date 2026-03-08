// ❌ DO NOT classify intent here
// ✅ Intent is decided in DecisionOrchestrator only
// ⚠️ CRITICAL: STREAM PIPELINE IS IMMUTABLE
// DO NOT:
// - chunk tokens manually
// - simulate streaming via publish loops
// - bypass ExecutionEngine for text generation
// Stream lifecycle must remain single-source-of-truth.
import type { Request, Response } from "express";
import crypto from "crypto";
import { sanitizeUserMessage } from "../ai/utils/sanitize-user-message";
import { ThreadEngine } from "../ai/engines/thread.engine";
import { MessageEngine } from "../ai/engines/message-engine";
import { executePlan } from "../ai/execution/execution-entry";
import { ChatEngine } from "../ai/engines/chat-engine";
import { ExecutionEngine } from "../ai/execution/execution-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";
import { errorResponse } from "../utils/error-response";
import { DecisionOrchestrator } from "../ai/decision/decision-orchestrator";
import type { Persona } from "../ai/persona/persona-context.types";
import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { TokenSafety } from "../ai/safety/token-safety";
import { StreamEngine } from "../ai/engines/stream-engine";
import { composeResponse } from "../ai/response/response-composer";
import { writeRawEvent } from "../ai/telemetry/raw-event-writer";
import type { ThinkingProfile } from "../types/stream";
import type { ComputePolicy } from "../ai/compute/compute-policy";
import { CompletionVerdictEngine } from "../ai/selfcheck/completion-verdict-engine";
import { ComputeGate } from "../ai/compute/compute-gate";
import { StreamStage } from "yua-shared/stream/stream-stage";
import { ActivityKind } from "yua-shared/stream/activity";
import { pgPool } from "../db/postgres";
import { updateConversationSummary } from "../ai/context/updateConversationSummary";
import { fetchRecentChatMessages } from "../db/pg-readonly";
import { createOpenAIEmbedder } from "../ai/vector/embedder";
import { getSessionIdByThread, type DbClient } from "../ai/file-intel/vector/db";
import type { Embedder as FileEmbedder } from "../ai/file-intel/vector/embedder";
export const chatController = {
  handleChat: [
    async (req: Request, res: Response): Promise<Response> => {
      const request = req as Request & { workspace?: { id: string; role?: string } };
if (!request.workspace) {
  return errorResponse(
    res,
    "workspace_required",
    "Workspace context missing",
    400
  );
}
const workspaceId = request.workspace.id;
      const startTime = Date.now();

      const traceId =
        typeof (req as any).traceId === "string"
          ? (req as any).traceId
          : crypto.randomUUID();
      (req as any).traceId = traceId;

const rawUserId =
  (req as any).user?.userId ??
  (req as any).user?.id;

const userId = Number(rawUserId);
const userName: string | null = (req as any).user?.name ?? null;

if (!Number.isFinite(userId) || userId <= 0) {
  console.warn("[CHAT][ANON_USER_BLOCKED]", {
    traceId,
    ip: req.ip,
    path: req.originalUrl,
  });
  return errorResponse(
    res,
    "auth_required",
    "Authentication required",
    401
  );
}
      const requestedStream =
  req.body?.stream === true || req.body?.stream === "true";

      console.log("[CHAT][ENTER]", {
        traceId,
        userId,
        requestedStream,
        ip: req.ip,
        inputLength:
   typeof req.body?.message === "string"
     ? req.body.message.length
     : 0,
      });

 console.log("[CHAT][BODY_META]", {
   hasBody: Boolean(req.body),
   threadId: req.body?.threadId,
   messageType: typeof req.body?.message,
   messageLength:
     typeof req.body?.message === "string"
       ? req.body.message.length
       : 0,
   thinkingProfile:
     req.body?.thinkingProfile ?? req.body?.meta?.thinking?.profile,
   attachmentsLength: Array.isArray(req.body?.attachments)
     ? req.body.attachments.length
     : 0,
 });

      try {
         const { message: rawMessage, threadId } = req.body ?? {};
         const rawAttachments =
           (req.body as any)?.attachments ??
           (req.body as any)?.files;
         const attachments = Array.isArray(rawAttachments)
           ? rawAttachments.map((a: any) => ({
               kind: a.kind ?? a.fileKind,
               url: a.url ?? a.fileUrl,
               fileName: a.fileName,
               mimeType: a.mimeType,
               sizeBytes: a.sizeBytes,
             }))
           : undefined;

// 🔒 SSOT: LaTeX 보호 (표현 계층, 판단 아님)
const isLatex =
  typeof rawMessage === "string" &&
  /\\(frac|pm|sqrt|boxed|mathrm|left|right|\$)/.test(rawMessage);

 const message =
   typeof rawMessage === "string"
     ? isLatex
       ? rawMessage
       : sanitizeUserMessage(rawMessage)
     : "";

 console.log("[CHAT][MESSAGE_SANITIZED_META]", {
   rawLength:
     typeof rawMessage === "string"
       ? rawMessage.length
       : 0,
   sanitizedLength:
     typeof message === "string"
       ? message.length
       : 0,
 });

 const hasText =
   typeof message === "string" && message.trim().length > 0;
 const hasAttachments =
   Array.isArray(attachments) && attachments.length > 0;

 // 🔒 SSOT: text OR attachments 중 하나는 반드시 존재
 if (!hasText && !hasAttachments) {
   return errorResponse(
     res,
     "invalid_message",
     "EMPTY_MESSAGE",
     400
   );
 }
 // 🔥 B안: attachments-only → synthetic message
 const cleanMessage =
   hasText
     ? message
     : hasAttachments
       ? "[IMAGE_INPUT]"
       : "";

         /* -------------------------
           🔒 Token Safety (SSOT)
           - 유저 입력 ONLY
           - Prompt / Context / System ❌
        ------------------------- */

       const tokenSafety = hasText
          ? await TokenSafety.stabilizeInput(cleanMessage, {
          mode: "NORMAL",
          stream: requestedStream,
        })
        : { status: "OK", tokens: 0 };

        if (tokenSafety.status === "OVERFLOW" && requestedStream !== true) {
  console.error("[CHAT][TOKEN_OVERFLOW][NON_STREAM_BLOCK]", {
    traceId,
    tokens: tokenSafety.tokens,
  });

   
   return res.status(200).json({
   ok: false,
   traceId,
   threadId,
   reason: "TOKEN_OVERFLOW",
   tokens: tokenSafety.tokens,
 });
}

if (tokenSafety.status === "OVERFLOW" && requestedStream === true) {
  console.warn("[CHAT][TOKEN_OVERFLOW][STREAM_ALLOW]", {
    traceId,
    tokens: tokenSafety.tokens,
  });
}

        /* -------------------------
           0️⃣ 입력 검증
        ------------------------- */
        if (!hasText && !hasAttachments) {
          console.warn("[CHAT][INVALID_MESSAGE]", {
            traceId,
            body: req.body,
          });
          return errorResponse(res, "invalid_message", "message required", 400);
        }

        /* -------------------------
           1️⃣ Thread 확보
        ------------------------- */
if (!threadId) {
  return errorResponse(res, "thread_required", "threadId required", 400);
}

const thread = await ThreadEngine.getThread({
  threadId: Number(threadId),
  userId,
  workspaceId,
});

if (!thread) {
  return errorResponse(res, "thread_not_found", "Thread not found", 404);
}

const resolvedThreadId = thread.id;

const fileDb: DbClient = {
  query: pgPool.query.bind(pgPool),
};

const fileEmbedder: FileEmbedder | undefined =
  process.env.OPENAI_API_KEY
    ? createOpenAIEmbedder(process.env.OPENAI_API_KEY)
    : undefined;

let fileSessionId: string | undefined;
if (process.env.ENABLE_FILE_RAG === "1") {
  try {
    fileSessionId =
      (await getSessionIdByThread({
        db: fileDb,
        workspaceId,
        threadId: resolvedThreadId,
      })) ?? undefined;
  } catch (e) {
    console.warn("[FILE_RAG][SESSION_LOOKUP_FAIL]", {
      traceId,
      threadId: resolvedThreadId,
      error: String(e),
    });
  }
}

 console.log("[CHAT][MESSAGE_INPUT_META]", {
   hasText,
   hasAttachments,
   cleanMessageLength:
     typeof cleanMessage === "string"
       ? cleanMessage.length
       : 0,
   attachmentsCount:
     Array.isArray(attachments)
       ? attachments.length
       : 0,
 });

        /* -------------------------
           2️⃣ 사용자 메시지 저장
        ------------------------- */
        // 🔒 SSOT: text-only / attachments-only / mixed 모두 저장
        const inputMethod = req.body?.meta?.inputMethod;
        const messageId = await MessageEngine.addMessage({
          threadId: resolvedThreadId,
          userId,
          role: "user",
          content: cleanMessage,
          traceId,
          meta: inputMethod ? { inputMethod } : undefined,
          files: Array.isArray(attachments)
            ? attachments.map((a: any) => ({
                fileName: a.fileName ?? null,
                mimeType: a.mimeType ?? null,
                fileKind: a.kind,              // 'image' | 'audio' | 'video' | 'file'
                fileUrl: a.url ?? null,        // 🔒 DB column
                sizeBytes: a.sizeBytes ?? null,
              }))
            : null,
        });

         console.log("[CHAT][MESSAGE_ENGINE_OK]", {
   traceId,
   threadId: resolvedThreadId,
   filesCount: Array.isArray(attachments) ? attachments.length : 0,
 });

        console.log("[CHAT][USER_MESSAGE_SAVED]", {
          traceId,
          threadId: resolvedThreadId,
          length: cleanMessage.length,
        });

 // ⚠️ REACTION은 절대 여기서 응답하지 않는다
 // → Decision / Reasoning / ContextRuntime으로 전달


        // 🔥 PHASE 9: RAW EVENT — USER PROMPT (SSOT FIXED)
writeRawEvent({
  traceId,
  threadId: resolvedThreadId,
  workspaceId, // ✅ 이제 항상 존재
  actor: "USER",
  eventKind: "message",
  phase: "chat",
  payload: {
    stage: "user_prompt",
    messageLength:
      typeof cleanMessage === "string"
        ? cleanMessage.length
        : 0,
    stream: requestedStream,
    ip: req.ip,
  },
});

        const persona: Persona = "unknown";

        /* -------------------------
           3️⃣ Decision Orchestrator
        ------------------------- */
        console.log("[CHAT][DECISION_START]", {
          traceId,
          persona,
          threadId: resolvedThreadId,
        });

        console.log("[FILE_DEBUG][CONTROLLER]", {
          attachmentsRaw: (req.body as any)?.attachments,
          normalizedAttachments: attachments,
          attachmentKinds: Array.isArray(attachments)
            ? attachments.map((a: any) => a?.kind)
            : undefined,
        });

   function normalizeThinkingProfile(
   v: any
 ): ThinkingProfile | undefined {
   if (v === "FAST" || v === "NORMAL" || v === "DEEP") return v;
   return undefined;
 }

        const decisionCtx = await DecisionOrchestrator.run({
          message: cleanMessage,
          persona,
          traceId,
          userId,
          threadId: resolvedThreadId,
          workspaceId,
          attachments,
          requestedThinkingProfile:
 normalizeThinkingProfile(
   req.body?.thinkingProfile ??
   req.body?.meta?.thinking?.profile
 ) ?? "NORMAL",
 forceThinking: req.body?.meta?.thinking?.force === true, // 🔥 ADD
        });

        console.log("[CHAT][DECISION_DONE]", {
          traceId,
          verdict: decisionCtx.decision.verdict,
          
          memoryIntent: decisionCtx.memoryIntent,
        });

        const stream = requestedStream === true;
 /* ----------------------------------
  🔥 EARLY STREAM REGISTER (SSOT FIX)
  - OpenAI 호출 전에 반드시 세션 오픈
 ---------------------------------- */
 if (stream === true) {
   StreamEngine.register(resolvedThreadId, traceId, {
     reasoning: decisionCtx.reasoning,
     conversationalOutcome: decisionCtx.conversationalOutcome,
     responseAffordance: decisionCtx.responseAffordance,
     turnIntent: decisionCtx.turnIntent,
     executionPlan: decisionCtx.executionPlan,
     allowContinuation:
       decisionCtx.turnIntent === "CONTINUATION" &&
       decisionCtx.conversationalOutcome === "CONTINUE_HARD",
   });

   console.log("[CHAT][STREAM_REGISTER_EARLY]", {
     traceId,
     threadId: resolvedThreadId,
   });
 }

        if (decisionCtx.decision.verdict !== "APPROVE") {
          console.warn("[CHAT][DECISION_BLOCKED]", {
            traceId,
            verdict: decisionCtx.decision.verdict,
          });

          // Clean up stream session to prevent zombie leak
          if (stream === true) {
            await StreamEngine.finish(resolvedThreadId, {
              reason: "error",
              traceId,
            });
          }

    return res.status(200).json({
    ok: false,
    traceId,
    threadId: resolvedThreadId,
    reason: "DECISION_BLOCKED",
    verdict: decisionCtx.decision.verdict,
  });
        }

        /* -------------------------
           3.5️⃣ IMAGE_GENERATION short-circuit (SSOT)
        ------------------------- */
        if (decisionCtx.executionPlan?.task === "IMAGE_GENERATION") {
          const plan = decisionCtx.executionPlan;

          if (stream === true) {
        // 🔒 SSOT: register stream session for studio events
            StreamEngine.register(resolvedThreadId, traceId, {
              reasoning: decisionCtx.reasoning,
              responseAffordance: decisionCtx.responseAffordance,
              turnIntent: decisionCtx.turnIntent,
              executionPlan: plan,
              allowContinuation: false,
            });

            // 🔒 Media Pipeline side-effect only
            executePlan(plan, {
              threadId: resolvedThreadId,
              traceId,
              workspaceId,
              userId,
              thinkingProfile: decisionCtx.thinkingProfile,
              message: cleanMessage,
              attachments,
              db: fileDb,
              fileEmbedder,
              fileSessionId,
            })
            .then(() => {
}).catch((e) => {
              console.error("[CHAT][IMAGE_GENERATION_EXEC_ERROR]", {
                traceId,
                error: String(e),
              });
            });

            return res.status(200).json({
              ok: true,
              traceId,
              threadId: resolvedThreadId,
              streaming: true,
            });
          }

          // NON-STREAM: execute side-effect then return empty view
          await executePlan(plan, {
            threadId: resolvedThreadId,
            traceId,
            workspaceId,
            userId,
            thinkingProfile: decisionCtx.thinkingProfile,
            message: cleanMessage,
            attachments,
            db: fileDb,
            fileEmbedder,
            fileSessionId,
          });

          const view = composeResponse("", {
            isPartial: false,
            variant: "CHAT",
          });

          return res.status(200).json({
            ok: true,
            traceId,
            threadId: resolvedThreadId,
            response: view,
          });
        }

        /* -------------------------
           4️⃣ ChatEngine (SSOT)
        ------------------------- */
        console.log("[CHAT][ENGINE_START]", {
          traceId,
          stream,
        });

        let preExecutionResult;
        if (decisionCtx.executionPlan?.task === "FILE_INTELLIGENCE") {
          try {
            preExecutionResult = await executePlan(decisionCtx.executionPlan, {
              threadId: resolvedThreadId,
              traceId,
              workspaceId,
              userId,
              thinkingProfile: decisionCtx.thinkingProfile,
              message: cleanMessage,
              attachments,
              db: fileDb,
              fileEmbedder,
              fileSessionId,
            });
          } catch (e) {
            console.error("[FILE_INTELLIGENCE_EXEC_ERROR]", {
              traceId,
              error: String(e),
            });
          }
        }

        const engineResult = await ChatEngine.generateFromDecision(
          decisionCtx,
          {
            attachments,
             stream,
            workspaceId,
            fileRag: fileEmbedder
              ? {
                  db: fileDb,
                  embedder: fileEmbedder,
                  workspaceId,
                }
              : undefined,
            fileSessionId,
            executionResult: preExecutionResult,
           }
        );

        if (!engineResult.ok) {
          console.warn("[CHAT][ENGINE_SOFT_BLOCK]", {
            traceId,
            reason: engineResult.message,
          });

          // NON-STREAM fallback
            return res.status(200).json({
    ok: false,
    traceId,
    threadId: resolvedThreadId,
    reason: "ENGINE_SOFT_BLOCK",
    message: engineResult.message,
  });
        }
        if ((engineResult as any).directResponse === true) {
          const text =
            typeof (engineResult as any).text === "string"
              ? (engineResult as any).text
              : "";

          await MessageEngine.addMessage({
            threadId: resolvedThreadId,
            userId,
            role: "assistant",
            content: text,
            traceId,
          });

          if (requestedStream === true) {
            StreamEngine.register(resolvedThreadId, traceId, {
              reasoning: decisionCtx.reasoning,
              conversationalOutcome: decisionCtx.conversationalOutcome,
              responseAffordance: decisionCtx.responseAffordance,
              turnIntent: decisionCtx.turnIntent,
              executionPlan: decisionCtx.executionPlan,
              allowContinuation: false,
            });

            await StreamEngine.publish(resolvedThreadId, {
              traceId,
              event: "token",
              stage: "answer",
              token: text,
            });

            await StreamEngine.publish(resolvedThreadId, {
              traceId,
              event: "done",
              stage: "system",
              done: true,
            });
          }

          return res.status(200).json({
            ok: true,
            traceId,
            threadId: resolvedThreadId,
          });
        }

        if (!("prompt" in engineResult)) {
          throw new Error(
            "[SSOT_VIOLATION] directResponse fell through to prompt branch"
          );
        }

        let { prompt } = engineResult;
        const { mode, meta } = engineResult;
        const computePolicy: ComputePolicy | undefined = meta?.computePolicy;

    if (!meta.responseAffordance) {
  console.warn("[AFFORDANCE][FALLBACK_APPLIED]", {
    traceId,
  });

  meta.responseAffordance = {
    describe: 0.4,
    expand: 0.4,
    branch: 0.2,
    clarify: 0.1,
    conclude: 0.25,
  };
}

      if (
  requestedStream === true &&
  (!prompt || typeof prompt !== "string" || prompt.trim().length === 0)
) {
  console.error("[CHAT][EMPTY_PROMPT_BLOCK]", {
    traceId,
    threadId: resolvedThreadId,
  });

  await StreamEngine.finish(resolvedThreadId, {
    reason: "error",
  });

  return res.status(200).json({
    ok: false,
    traceId,
    threadId: resolvedThreadId,
    reason: "EMPTY_PROMPT",
  });
}

        console.log("[CHAT][ENGINE_READY]", {
          traceId,
          mode,
          outmode: meta?.outmode,
          promptLength: prompt.length,
        });

        const hasImageAttachments =
          Array.isArray(attachments) &&
          attachments.some((a: any) => a?.kind === "image");

               /* ----------------------------------
           🔥 EXECUTION PLAN (SSOT)
           - MUST run before Stream / Prompt
           - Side-effect only (IMAGE_ANALYSIS)
        ---------------------------------- */
        let executionResult;

        if (meta?.executionPlan) {
          const plan = meta.executionPlan;
          const isImagePlan = plan.task === "IMAGE_ANALYSIS";
const wantsImageAsset =
  isImagePlan &&
  plan.payload?.nextAction === "GENERATE_ASSET";
          // ✅ SSOT: 텍스트-only 요청에서 IMAGE_ANALYSIS side-effect 금지
 const shouldExecutePlan =
   !isImagePlan ||
   (hasImageAttachments && isImagePlan);

          if (!shouldExecutePlan || plan.task === "FILE_INTELLIGENCE") {
            console.warn("[SSOT][EXEC_PLAN_SKIPPED]", {
              traceId,
              threadId: resolvedThreadId,
              task: plan.task,
            reason:
              plan.task === "FILE_INTELLIGENCE"
                ? "FILE_INTELLIGENCE_PRE_EXECUTED"
                : "IMAGE_ANALYSIS_WITHOUT_IMAGE_ATTACHMENTS",
          });
          } else {
  try {
    executionResult = await executePlan(plan, {
      threadId: resolvedThreadId,
      traceId,
      workspaceId,
      userId,
      thinkingProfile: decisionCtx.thinkingProfile,
      message: cleanMessage,
      attachments,
      db: fileDb,
      fileEmbedder,
      fileSessionId,
      prompt,
      mode,
      outmode: meta?.outmode,
      stream,
      path: decisionCtx.path,
      forceSearch: decisionCtx.runtimeHints?.forceSearch,
    });
  } catch (e) {
    writeRawEvent({
      traceId,
      threadId: resolvedThreadId,
      workspaceId,
      actor: "YUA",
      eventKind: "error",
      phase: "execution",
      payload: {
        task: plan.task,
        error: String(e),
      },
    });
    throw e;
  }
}

        }

        if (
          stream === true &&
          meta?.executionPlan?.task === "FILE_ANALYSIS" &&
          executionResult?.ok === true
        ) {
          prompt = ChatEngine.attachFileAnalysisResult(
            prompt,
            executionResult
          );
        }

        /* -------------------------
           5️⃣ STREAM MODE
        ------------------------- */
        if (stream === true) {
  const initialTier: "FAST" | "NORMAL" | "DEEP" =
   computePolicy?.tier ?? "NORMAL";

 const { rows } = await pgPool.query(
   `SELECT tier FROM workspace_plan_state WHERE workspace_id = $1 LIMIT 1`,
   [workspaceId]
 );

 const planTier =
   (rows?.[0]?.tier as "free" | "pro" | "business" | "enterprise") ?? "free";

 const gateResult = await ComputeGate.acquire({
   threadId: resolvedThreadId,
   traceId,
   userId,
   workspaceId,
   computeTier: initialTier,
   planTier,
 });

 if (!gateResult.allowed) {
   console.warn("[COMPUTE_GATE][BLOCKED]", {
     traceId,
     threadId: resolvedThreadId,
     reason: gateResult.reason,
   });

   return res.status(429).json({
     ok: false,
     traceId,
     threadId: resolvedThreadId,
     reason: gateResult.reason,
   });
 }

  // 🔒 SSOT: tier mutation 방지 — 실제 실행 tier를 고정 저장
  const acquiredTier =
    gateResult.downgradedTier ?? initialTier;

  if (computePolicy) {
    computePolicy.tier = acquiredTier;
  }
          console.log("[CHAT][STREAM_START]", {
            traceId,
            threadId: resolvedThreadId,
          });

          const isImageOnly =
  (meta?.executionPlan?.task === "IMAGE_ANALYSIS" &&
   meta.executionPlan.payload?.nextAction === "GENERATE_ASSET" &&
   hasImageAttachments) ||
  meta?.executionPlan?.task === "IMAGE_GENERATION";

       // 🔒 SSOT: continuation 허용 여부 (Decision 단 단일 진실)
        const allowContinuation =
          decisionCtx.turnIntent === "CONTINUATION" &&
          decisionCtx.conversationalOutcome === "CONTINUE_HARD";
       


          // 🔒 IMAGE_ANALYSIS / IMAGE_GENERATION은 MediaPipeline side-effect만 수행
          if (!isImageOnly) {
ExecutionEngine.execute({
  threadId: resolvedThreadId,
  traceId,
  workspaceId,
  userId,
  userName,
  prompt,
  rawUserMessage: cleanMessage,
  mode,
  thinkingProfile: decisionCtx.thinkingProfile,
  sessionId: fileSessionId ?? null,
  outmode: meta?.outmode,
  stream: true,
  attachments,
  path: decisionCtx.path,
  forceSearch: decisionCtx.runtimeHints?.forceSearch,
  memoryIntent: decisionCtx.memoryIntent,
  sectionId:
    executionResult && executionResult.ok
      ? executionResult.sectionId
      : undefined,
  computePolicy,
  computeTier: acquiredTier,
  planTier,
            }).catch((e) => {
              console.error("[CHAT][STREAM_EXEC_ERROR]", {
                traceId,
                error: String(e),
              });
            });
          }
          LoggingEngine.record({
            route: "/api/chat",
            method: "POST",
            status: "success",
            latency: Date.now() - startTime,
            request: { stream: true },
            response: {
              streaming: true,
              threadId: resolvedThreadId,
              traceId,
            },
          }).catch(() => {});

          return res.status(200).json({
            ok: true,
            traceId,
            threadId: resolvedThreadId,
            streaming: true,
          });
        }

        /* -------------------------
           6️⃣ NON-STREAM MODE
        ------------------------- */
        console.log("[CHAT][NON_STREAM_START]", {
          traceId,
          threadId: resolvedThreadId,
        });

        if (meta?.executionPlan?.task === "IMAGE_GENERATION") {
          const view = composeResponse("", {
            isPartial: false,
            variant: "CHAT",
          });

          return res.status(200).json({
            ok: true,
            traceId,
            threadId: resolvedThreadId,
            response: view,
          });
        }

        const aiResult = await ExecutionEngine.execute({
          threadId: resolvedThreadId,
          traceId,
          workspaceId,
          userId,
          userName,
          prompt,
          rawUserMessage: cleanMessage,
          mode,
          thinkingProfile: decisionCtx.thinkingProfile,
          sessionId: fileSessionId ?? null,
          outmode: meta?.outmode,
          stream: false,
          attachments,
          path: decisionCtx.path,
          forceSearch: decisionCtx.runtimeHints?.forceSearch,
          memoryIntent: decisionCtx.memoryIntent,
          computePolicy,
        });


// 🔒 SSOT: NON-STREAM execution result guard
if (!aiResult || (aiResult as any).type === "stream") {
  throw new Error(
    "[SSOT_VIOLATION] NON-STREAM chat returned invalid execution result"
  );
}

const text =
  typeof (aiResult as any).text === "string"
    ? (aiResult as any).text
    : "";

if (!text.trim()) {
  throw new Error(
    "[SSOT_VIOLATION] NON-STREAM chat produced empty text"
  );
}

        // 🔒 SSOT: Completion Verdict (READ-ONLY, NEXT TURN SIGNAL)
        try {
          const completionVerdict =
            CompletionVerdictEngine.evaluate({
              reasoning: decisionCtx.reasoning,
              executionResult: executionResult,
              answerText: text,
            });

          writeRawEvent({
            traceId,
            threadId: resolvedThreadId,
            workspaceId,
            actor: "YUA",
            eventKind: "execution",
            phase: "execution",
            payload: {
              kind: "COMPLETION_VERDICT",
              verdict: completionVerdict.verdict,
              reason: completionVerdict.reason,
            },
            confidence: decisionCtx.reasoning.confidence,
            path: decisionCtx.path,
          });
        } catch (e) {
          // 🔒 best-effort
        }

        // 🔥 SSOT: NON-STREAM assistant message materialize
const resolvedSectionId =
  executionResult && executionResult.ok
    ? executionResult.sectionId
    : undefined;

await MessageEngine.addMessage({
  threadId: resolvedThreadId,
  userId,
  role: "assistant",
  content: text,
  traceId,
  meta:
    resolvedSectionId
      ? {
          studio: {
            sectionId: resolvedSectionId,
            assetType: "IMAGE",
          },
        }
      : undefined,
});

         // 🔥 SSOT: NON-STREAM → suggestion emit
 await ChatEngine.emitSuggestions({
   threadId: resolvedThreadId,
   traceId,
   reasoning: decisionCtx.reasoning,
   verdict: decisionCtx.decision.verdict,
   responseAffordance: meta?.responseAffordance,
 });

 // 🔒 SUMMARY: fire-and-forget (non-blocking)
 fetchRecentChatMessages(resolvedThreadId, 50)
   .then((rows) => {
     const msgs = rows
       .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
       .map((r) => `[${r.role}] ${r.content}`);
     return updateConversationSummary(resolvedThreadId, msgs);
   })
   .catch((e) => {
     console.warn("[CONVERSATION_SUMMARY][ERROR]", { threadId: resolvedThreadId, error: String(e) });
   });

 // 🔒 MEMORY PIPELINE: non-stream hook
 try {
   const { runMemoryPipeline } = await import("../ai/memory/memory-pipeline-runner.js");
   await runMemoryPipeline({
     threadId: resolvedThreadId,
     traceId,
     userId: String(userId),
     workspaceId,
     userMessage: cleanMessage,
     assistantMessage: text,
     mode: mode ?? "NORMAL",
     memoryIntent: decisionCtx.memoryIntent ?? "NONE",
     reasoning: decisionCtx.reasoning ?? { confidence: 0.5 },
     executionPlan: meta?.executionPlan,
     executionResult: executionResult,
     allowMemory: true,
   });
 } catch (e) {
   console.warn("[MEMORY_PIPELINE][NON_STREAM_ERROR]", { threadId: resolvedThreadId, error: String(e) });
 }

        if (!aiResult || aiResult.type !== "text") {
          console.error("[CHAT][NON_STREAM_INVALID_RESULT]", {
            traceId,
            resultType: aiResult?.type,
          });
          throw new Error("NON_STREAM_EXPECTED_TEXT");
        }

        console.log("[CHAT][NON_STREAM_DONE]", {
          traceId,
          textLength: aiResult.text.length,
        });

        LoggingEngine.record({
          route: "/api/chat",
          method: "POST",
          status: "success",
          latency: Date.now() - startTime,
          request: { stream: false },
          response: {
            threadId: resolvedThreadId,
            traceId,
            textLength: aiResult.text.length,
          },
        }).catch(() => {});

         const view = composeResponse(aiResult.text, {
         isPartial: false,
         variant: "CHAT",
        });

        return res.status(200).json({
          ok: true,
          traceId,
          threadId: resolvedThreadId,
          response: view,
        });
       } catch (e: any) {
  console.error("[CHAT][FATAL]", {
    traceId,
    message: e?.message,
    stack: e?.stack,
    raw: e,
  });

        LoggingEngine.record({
          route: "/api/chat",
          method: "POST",
          status: "error",
          latency: Date.now() - startTime,
          request: { body: req.body },
          response: null,
          error: String(e),
        }).catch(() => {});

         return errorResponse(res, "chat_error", e?.message ?? "Internal error", 500);
      }
    },
  ],
};
