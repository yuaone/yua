// 📂 src/routes/v1-completions-router.ts
// OpenAI-compatible /v1/chat/completions endpoint (SSOT wrapper)

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { withWorkspace } from "../middleware/with-workspace";
import { ThreadEngine } from "../ai/engines/thread.engine";
import { MessageEngine } from "../ai/engines/message-engine";
import { ChatEngine } from "../ai/engines/chat-engine";
import { ExecutionEngine } from "../ai/execution/execution-engine";
import { DecisionOrchestrator } from "../ai/decision/decision-orchestrator";
import { StreamEngine } from "../ai/engines/stream-engine";
import { sanitizeUserMessage } from "../ai/utils/sanitize-user-message";
import { errorResponse } from "../utils/error-response";
import type { Persona } from "../ai/persona/persona-context.types";
import type { YuaStreamEvent } from "../types/stream";

const router = Router();

// Model name → internal mode mapping
const MODEL_MAP: Record<string, string> = {
  "yua-basic": "basic",
  "yua-normal": "normal",
  "yua-pro": "pro",
  "yua-spine": "spine",
};

interface V1Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface V1RequestBody {
  model?: string;
  messages: V1Message[];
  stream?: boolean;
  thread_id?: string | number;
  workspace_id?: string;
}

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completions endpoint.
 */
router.post(
  "/chat/completions",
  requireAuthOrApiKey,
  withWorkspace,
  async (req: Request, res: Response): Promise<Response | void> => {
    const traceId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const body = req.body as V1RequestBody;

      // --- Validate ---
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return res.status(400).json({
          error: {
            message: "messages is required and must be a non-empty array",
            type: "invalid_request_error",
            code: "invalid_messages",
          },
        });
      }

      const model = body.model ?? "yua-basic";
      const stream = body.stream === true;
      const threadIdParam = body.thread_id;

      // Extract last user message
      const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
      if (!lastUserMsg || !lastUserMsg.content?.trim()) {
        return res.status(400).json({
          error: {
            message: "messages must contain at least one user message with content",
            type: "invalid_request_error",
            code: "no_user_message",
          },
        });
      }

      const rawUserId = (req as any).user?.userId ?? (req as any).user?.id;
      const userId = Number(rawUserId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(401).json({
          error: {
            message: "Authentication required",
            type: "authentication_error",
            code: "auth_required",
          },
        });
      }

      const workspace = (req as any).workspace;
      if (!workspace?.id) {
        return res.status(400).json({
          error: {
            message: "Workspace context missing",
            type: "invalid_request_error",
            code: "workspace_required",
          },
        });
      }
      const workspaceId: string = workspace.id;

      const message = sanitizeUserMessage(lastUserMsg.content);

      // --- 1. Resolve or create thread ---
      let resolvedThreadId: number;
      if (threadIdParam) {
        const thread = await ThreadEngine.getThread({
          threadId: Number(threadIdParam),
          userId,
          workspaceId,
        });
        if (!thread) {
          return res.status(404).json({
            error: {
              message: "Thread not found",
              type: "invalid_request_error",
              code: "thread_not_found",
            },
          });
        }
        resolvedThreadId = thread.id;
      } else {
        resolvedThreadId = await ThreadEngine.createThread({
          userId,
          workspaceId,
          title: message.slice(0, 60),
        });
      }

      // --- 2. Save user message ---
      await MessageEngine.addMessage({
        threadId: resolvedThreadId,
        userId,
        role: "user",
        content: message,
        traceId,
      });

      // --- 3. Decision Orchestrator ---
      const persona: Persona = "unknown";
      const decisionCtx = await DecisionOrchestrator.run({
        message,
        persona,
        traceId,
        userId,
        threadId: resolvedThreadId,
        workspaceId,
        requestedThinkingProfile: "NORMAL",
        forceThinking: false,
      });

      if (decisionCtx.decision.verdict !== "APPROVE") {
        return res.status(200).json(buildNonStreamResponse(
          traceId,
          model,
          "[Request was blocked by safety filter]",
          "content_filter",
        ));
      }

      // --- 4. ChatEngine prompt build ---
      const engineResult = await ChatEngine.generateFromDecision(decisionCtx, {
        stream,
        workspaceId,
      });

      if (!engineResult.ok) {
        return res.status(200).json(buildNonStreamResponse(
          traceId,
          model,
          "[Unable to generate response]",
          "stop",
        ));
      }

      // Direct response shortcut
      if ((engineResult as any).directResponse === true) {
        const text = typeof (engineResult as any).text === "string"
          ? (engineResult as any).text
          : "";

        await MessageEngine.addMessage({
          threadId: resolvedThreadId,
          userId,
          role: "assistant",
          content: text,
          traceId,
        });

        if (stream) {
          return writeStreamResponse(res, traceId, model, text);
        }
        return res.json(buildNonStreamResponse(traceId, model, text, "stop"));
      }

      if (!("prompt" in engineResult)) {
        return res.status(500).json({
          error: {
            message: "Internal engine error",
            type: "server_error",
            code: "engine_error",
          },
        });
      }

      const { prompt, mode, meta } = engineResult;

      // --- 5. Stream mode ---
      if (stream) {
        StreamEngine.register(resolvedThreadId, traceId, {
          reasoning: decisionCtx.reasoning,
          conversationalOutcome: decisionCtx.conversationalOutcome,
          responseAffordance: decisionCtx.responseAffordance,
          turnIntent: decisionCtx.turnIntent,
          executionPlan: decisionCtx.executionPlan,
          allowContinuation: false,
        });

        // Start execution in background
        ExecutionEngine.execute({
          threadId: resolvedThreadId,
          traceId,
          workspaceId,
          userId,
          userName: (req as any).user?.name ?? null,
          prompt,
          mode,
          thinkingProfile: decisionCtx.thinkingProfile,
          sessionId: null,
          outmode: meta?.outmode,
          stream: true,
          path: decisionCtx.path,
        }).catch((e) => {
          console.error("[V1][STREAM_EXEC_ERROR]", { traceId, error: String(e) });
        });

        // SSE response — subscribe to stream events and convert to OpenAI chunk format
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.flushHeaders();

        const completionId = `chatcmpl-${traceId.replace(/-/g, "").slice(0, 24)}`;
        const created = Math.floor(Date.now() / 1000);

        try {
          const streamIter = StreamEngine.subscribe(resolvedThreadId);

          for await (const rawEvent of streamIter as AsyncGenerator<YuaStreamEvent>) {
            if (rawEvent.event === "token" && typeof rawEvent.token === "string") {
              const chunk = {
                id: completionId,
                object: "chat.completion.chunk" as const,
                created,
                model,
                choices: [
                  {
                    index: 0,
                    delta: { content: rawEvent.token },
                    finish_reason: null,
                  },
                ],
              };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }

            if (rawEvent.event === "done") {
              // Final chunk with finish_reason
              const finalChunk = {
                id: completionId,
                object: "chat.completion.chunk" as const,
                created,
                model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: "stop",
                  },
                ],
              };
              res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
              res.write("data: [DONE]\n\n");
              break;
            }
          }
        } catch (e) {
          console.error("[V1][STREAM_SSE_ERROR]", { traceId, error: String(e) });
        }

        res.end();
        return;
      }

      // --- 6. Non-stream mode ---
      const aiResult = await ExecutionEngine.execute({
        threadId: resolvedThreadId,
        traceId,
        workspaceId,
        userId,
        userName: (req as any).user?.name ?? null,
        prompt,
        mode,
        thinkingProfile: decisionCtx.thinkingProfile,
        sessionId: null,
        outmode: meta?.outmode,
        stream: false,
        path: decisionCtx.path,
      });

      const text =
        typeof (aiResult as any).text === "string" ? (aiResult as any).text : "";

      // Save assistant message
      await MessageEngine.addMessage({
        threadId: resolvedThreadId,
        userId,
        role: "assistant",
        content: text,
        traceId,
      });

      return res.json(buildNonStreamResponse(traceId, model, text, "stop"));
    } catch (e: any) {
      console.error("[V1][FATAL]", {
        traceId,
        message: e?.message,
        stack: e?.stack,
      });

      return res.status(500).json({
        error: {
          message: "Internal server error",
          type: "server_error",
          code: "internal_error",
        },
      });
    }
  }
);

// --- Helpers ---

function buildNonStreamResponse(
  traceId: string,
  model: string,
  content: string,
  finishReason: "stop" | "length" | "content_filter"
) {
  return {
    id: `chatcmpl-${traceId.replace(/-/g, "").slice(0, 24)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

function writeStreamResponse(
  res: Response,
  traceId: string,
  model: string,
  content: string
): void {
  const completionId = `chatcmpl-${traceId.replace(/-/g, "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1000);

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Send content as single token chunk
  const chunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: { content }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);

  // Final chunk
  const finalChunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

export default router;
