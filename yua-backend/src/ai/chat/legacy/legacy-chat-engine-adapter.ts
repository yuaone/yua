import { Profiler } from "../../utils/profiler";
import { ChatEngine } from "../../engines/chat-engine";
import type {
  ChatRuntimeContext,
  ChatResponse,
} from "../types/chat-io";
import { OUTMODE } from "../types/outmode";
import type { ComputePolicy } from "../../compute/compute-policy";
import type { ThinkingProfile } from "yua-shared";

export interface LegacyChatPathOverrides {
  thinkingProfile?: ThinkingProfile;
  computePolicy?: ComputePolicy;
  reasoning?: {
    summary?: "auto" | "detailed";
    effort?: "low" | "medium" | "high";
  };
  maxSegments?: number;
}

export async function runLegacyChat(
  ctx: ChatRuntimeContext,
  overrides?: LegacyChatPathOverrides
): Promise<ChatResponse> {
  /* -------------------------------------------------- */
  /* 1️⃣ Persona + Policy                               */
  /* -------------------------------------------------- */
  const persona = Profiler.load(ctx.req.meta?.userType);
  const policy = Profiler.loadPolicy(ctx.req.meta?.userType);

  /* -------------------------------------------------- */
  /* 2️⃣ Meta 전달 (SSOT 유지)                          */
  /* -------------------------------------------------- */
  const meta = {
    userId: ctx.req.meta?.userId,
    planId: ctx.req.meta?.planId,
    traceId: ctx.traceId,
    ip: ctx.req.meta?.ip,
    apiKey: ctx.req.meta?.apiKey,
    instanceId: ctx.req.meta?.instanceId,
    threadId: ctx.req.threadId,
    stream: ctx.req.meta?.stream === true,
    policy,
    ...(overrides?.thinkingProfile && {
      thinkingProfile: overrides.thinkingProfile,
    }),
    ...(overrides?.computePolicy && {
      computePolicy: overrides.computePolicy,
    }),
    ...(overrides?.reasoning && {
      pathReasoning: overrides.reasoning,
    }),
  };

  /* -------------------------------------------------- */
  /* 3️⃣ ChatEngine 호출                                */
  /* -------------------------------------------------- */
  const result = await ChatEngine.generateResponse(
    ctx.req.content,
    persona,
    meta
  );

  /* -------------------------------------------------- */
  /* 4️⃣ outMode 정합성 보정                            */
  /* -------------------------------------------------- */
  const resolvedOutMode: OUTMODE =
    result.ok && "mode" in result && result.mode
      ? (result.mode as OUTMODE)
      : ctx.req.outMode;

  return {
    ok: result.ok,
    traceId: ctx.traceId,
    outMode: resolvedOutMode,
    latency: Date.now() - ctx.startedAt,
    answer:
      meta.stream === true
        ? ""
        : result.ok
        ? ("prompt" in result ? result.prompt : "")
        : "",
    debug: result.ok
      ? undefined
      : { engine: "chat-error" },
  };
}
