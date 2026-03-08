// 🔥 YUA-AI StreamEngine — SSOT STREAM BROKER (FINAL+)
// 책임: 스트림 상태 머신 + DONE/ABORT 단일 게이트 + 브로드캐스트 단일 소유
// ⚠️ STREAM SSOT LOCKED
// FINAL → DONE → CLEANUP 헌법 고정if (DONE_STATES.has(session.state)) return;
// 수정 시 반드시 로그 기반 재검증 필요
// 🔥 token 병합 (20~40ms)
// ⚠️ SSOT: StreamEngine는 AnswerBuffer를 절대 수정하지 않는다.
// AnswerBuffer.append는 ExecutionEngine 단일 책임.
// ⚠️ CRITICAL: STREAM PIPELINE IS IMMUTABLE
// DO NOT:
// - chunk tokens manually
// - simulate streaming via publish loops
// - bypass ExecutionEngine for text generation
// Stream lifecycle must remain single-source-of-truth.
import { insertStreamEvent } from "../../db/mysql";
import { pgPool } from "../../db/postgres";
import type { YuaStreamStage, YuaStreamEvent } from "../../types/stream";
import type { ThinkingProfile } from "../../types/stream";
import type { ResponseAffordanceVector } 
  from "../decision/response-affordance";
import { ActivityKind } from "yua-shared/stream/activity";
import {
  redisPub,
  redisSub,
  streamChannel,
  ensureRedisSubscriber,
} from "../../db/redis";
import { titlePatchChannel } from "../../db/redis";
import type { TurnIntent } from "../chat/types/turn-intent";
import { writeFailureSurface } from "../telemetry/failure-surface-writer";
import type { ExecutionPlan } from "../execution/execution-plan";
import { StreamStage } from "yua-shared/stream/stream-stage";
import { enqueueActivityTitleJob } from "../activity/activity-title.queue";
import { threadTitlePatchChannel } from "../../db/redis";


/* ==================================================
   Stream State (SSOT)
================================================== */

export enum StreamState {
  READY = "READY",
  STREAMING = "STREAMING",
  FINAL = "FINAL", // 🔥 logical end
  DONE_COMPLETED = "DONE_COMPLETED",
  DONE_ABORTED = "DONE_ABORTED",
  DONE_ERROR = "DONE_ERROR",
}

const DONE_STATES = new Set<StreamState>([
  StreamState.DONE_COMPLETED,
  StreamState.DONE_ABORTED,
  StreamState.DONE_ERROR,
]);

const FINAL_STATES = new Set<StreamState>([
  StreamState.FINAL,
]);

/* ==================================================
   Stream Session
================================================== */

export type StreamSession = {
  threadId: number;
  traceId: string;
  abort: AbortController;
  initialUserLang?: "ko" | "en" | "unknown";
  webSources?: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
  executionAbort?: AbortController;
  state: StreamState;
  nextEventId: number; // 🔥 monotonic eventId (resume / reorder)
  // 🔥 Activity Snapshot hydrate 지원
  finalized?: boolean;
  finalizedAt?: number | null;
  reasoningBlocks?: {
   stage?: string | null;
   title: string;
   body: string;
   ts: number;
   groupIndex: number;
 }[];
  reasoningBuffers?: Map<number, ReasoningBuffer>;
  reasoningFlushInterval?: NodeJS.Timeout | null;
  reasoningFlushing?: boolean;
  // 🔥 Activity Snapshot hydrate 지원 필드 (SSOT)
  chunks?: any[];
  tools?: any[];
  summaries?: any[];
  primarySummaryId?: string | null;
  /** 🔒 SSOT: last tool execution result (read-only for ExecutionEngine) */
  lastToolResult?: {
    tool: import("../tools/tool-types").ToolType;
    result: unknown;
  confidence?: number;
  verified?: boolean;
  toolScoreDelta?: number;
  verifierNotes?: string;
  verifierFailed?: string;
  };
  reasoning?: any;
  responseAffordance?: ResponseAffordanceVector;
  turnIntent?: TurnIntent;
  allowContinuation?: boolean;
  executionPlan?: import("../execution/execution-plan").ExecutionPlan;
  conversationalOutcome?: import("../decision/conversational-outcome").ConversationalOutcome;
 startedAt?: number;
  // 🔥 OpenAI usage snapshot (ExecutionEngine 단일 소유)
  tokenUsage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
  // 🔒 SSOT: activity dedup (session-local, in-memory)
  activitySeen?: Set<string>;                 // op+id 기준 1회 보장
  activityLastHash?: Map<string, string>;     // id 기준 동일 PATCH/ADD payload 드롭
  titleJobEnqueued?: Set<string>;             // activityId 기준 title enqueue 1회 보장

};

const sessions = new Map<number, StreamSession>();

type ReasoningBuffer = {
  groupIndex: number;
  title?: string;
  body: string;
  lastTokenAt: number;
  lastEmittedLength?: number;
  flushed: boolean;
  activityAdded?: boolean;
};

function cleanText(input: string) {
  return String(input ?? "").replace(/\0/g, "");
}

/* ==================================================
   🔥 Semantic Title Generator (Deterministic, SSOT-safe)
   - No LLM
   - No randomness
   - Stable output for same input
================================================== */

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","so",
  "이","그","저","그리고","하지만","또한",
  "에서","으로","이다","합니다","한다","해야","합니다",
  "을","를","이","가","은","는"
]);

function isEnglish(token: string) {
  return /^[a-zA-Z0-9]+$/.test(token);
}

function toCamelCase(token: string) {
  if (!token) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function nominalizeVerb(token: string) {
  return token
    .replace(/(합니다|한다|하였다|했다|해야|하다)$/g, "")
    .replace(/(됩니다|되다|되었다)$/g, "")
    .replace(/(발생했습니다|발생했다)$/g, "발생")
    .replace(/(해결해야|해결했다|해결합니다)$/g, "해결")
    .replace(/(분석해야|분석했다|분석합니다)$/g, "분석")
    .replace(/(개발해야|개발했다|개발합니다)$/g, "개발")
    .replace(/(구현해야|구현했다|구현합니다)$/g, "구현")
    .replace(/(생성해야|생성했다|생성합니다)$/g, "생성")
    .trim();
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ==================================================
   In-memory buffers / subscribers
================================================== */

const subscribers = new Map<number, Set<(e: YuaStreamEvent) => void>>();
const buffers = new Map<number, YuaStreamEvent[]>();

function getSubscribers(threadId: number) {
  let set = subscribers.get(threadId);
  if (!set) {
    set = new Set();
    subscribers.set(threadId, set);
  }
  return set;
}

function getBuffer(threadId: number) {
  let buf = buffers.get(threadId);
  if (!buf) {
    buf = [];
    buffers.set(threadId, buf);
  }
  return buf;
}

/* ==================================================
   Redis Bridge
================================================== */

const channelToThread = new Map<string, number>();
let redisAttached = false;

function attachRedisOnce() {
  if (redisAttached) return;

  redisSub.on("message", async (channel, message) => {
    const threadId = channelToThread.get(channel);
    if (!threadId) return;

    try {
      // 🔥 Title patch message (worker → session instance)
      if (channel.startsWith("yua:activity_title:patch:")) {
        const payload = JSON.parse(message) as {
          traceId: string;
          activityId: string;
          title: string;
          stage?: "THINKING" | "ANSWER";
        };

        const session = sessions.get(threadId);
        if (!session) return; // ✅ 세션 없는 인스턴스는 무시
        if (DONE_STATES.has(session.state)) return;
        console.debug("[TITLE_PATCH_RECEIVED]", {
          channel,
          payloadTitle: payload.title,
          sessionLang: session?.initialUserLang,
        });
        // DONE/FINAL guard는 StreamEngine.publish 내부에서 걸림
       void StreamEngine.publish(threadId, {
          event: "activity",
          traceId: payload.traceId ?? session.traceId,
          stage: StreamStage.THINKING,
          activity: {
            op: "PATCH",
            item: {
              id: payload.activityId,
              title: payload.title,
            },
          },
        } as any).catch(() => {});

        return; // 🔒 patch 메시지는 SSE로 직접 전달하지 않음
      }
      // 🔥 Thread title patch (worker → DB update + (optional) live notify)
      if (channel.startsWith("yua:thread_title:patch:")) {
        const payload = JSON.parse(message) as {
          title: string;
          traceId?: string;
        };

        const title = String(payload.title ?? "").trim().slice(0, 80);
  console.log("[STREAM][THREAD_TITLE_PATCH_RECEIVED]", {
    threadId,
    title,
    traceId: payload.traceId
  });
        if (!title) return;

     void (async () => {
          try {
            const r = await pgPool.query(
              `
              UPDATE conversation_threads
              SET title = $1,
                  auto_titled = true
              WHERE id = $2
              RETURNING id
              `,
              [title, threadId]
            );

        if (!r.rows?.length) {
         console.warn("[THREAD_TITLE_PATCH][DB_SKIP]", { threadId });
         return;
       }

       // 🔒 cache는 DB 성공 후만
       await redisPub.set(
         `yua:thread_title:cache:${threadId}`,
         title,
         "EX",
         60 * 10
       );

       // 🔥 SSE forward (A 옵션 핵심)
       const session = sessions.get(threadId);
       if (!session) return; // 세션 없는 인스턴스는 조용히 skip

       await StreamEngine.publish(threadId, {
         event: "stage",
         stage: StreamStage.SYSTEM, // ✅ THINKING ❌ SYSTEM 사용
         traceId: payload.traceId ?? session.traceId,
         meta: {
           threadTitle: title,
         },
       } as any);
          } catch {
            // noop (best-effort)
          }
        })();
        return;
      }

      // ✅ normal stream events (stream channel)
      const event = JSON.parse(message) as YuaStreamEvent;
      const subs = subscribers.get(threadId);
      if (!subs) return;
      for (const fn of subs) fn(event);
    } catch (e) {
      console.error("[STREAM][REDIS][PARSE]", e);
    }
  });

  redisAttached = true;
}

async function ensureRedis(threadId: number) {
  const ch = streamChannel(threadId);
  if (channelToThread.has(ch)) return;

  await ensureRedisSubscriber();
  await redisSub.subscribe(ch);
  channelToThread.set(ch, threadId);
  // 🔥 Title patch channel도 같이 subscribe (세션 가진 인스턴스만 처리)
  const patchCh = titlePatchChannel(threadId);
  await redisSub.subscribe(patchCh);
  channelToThread.set(patchCh, threadId);
 const threadCh = threadTitlePatchChannel(threadId);
  await redisSub.subscribe(threadCh);
  channelToThread.set(threadCh, threadId)
}

/* ==================================================
   Zombie Session Reaper
   - 60s interval scan
   - Kills sessions with no subscribers older than 5 min
   - Kills DONE sessions older than 30s
================================================== */

const REAPER_INTERVAL_MS = 60_000;
const ZOMBIE_MAX_AGE_MS = 5 * 60_000;
const DONE_LINGER_MS = 30_000;

setInterval(() => {
  const now = Date.now();
  let reaped = 0;

  for (const [threadId, session] of sessions) {
    const age = now - (session.startedAt ?? now);
    const subCount = subscribers.get(threadId)?.size ?? 0;
    const isDone = DONE_STATES.has(session.state);

    const isZombie =
      (age > ZOMBIE_MAX_AGE_MS && subCount === 0) ||
      (isDone && age > DONE_LINGER_MS);

    if (!isZombie) continue;

    if (session.reasoningFlushInterval) {
      clearInterval(session.reasoningFlushInterval);
    }

    sessions.delete(threadId);
    buffers.delete(threadId);
    subscribers.delete(threadId);

    const ch = streamChannel(threadId);
    const patchCh = titlePatchChannel(threadId);
    const threadCh = threadTitlePatchChannel(threadId);
    channelToThread.delete(ch);
    channelToThread.delete(patchCh);
    channelToThread.delete(threadCh);
    redisSub.unsubscribe(ch).catch(() => {});
    redisSub.unsubscribe(patchCh).catch(() => {});
    redisSub.unsubscribe(threadCh).catch(() => {});

    reaped++;
    console.log("[STREAM][REAPER]", {
      threadId,
      traceId: session.traceId,
      state: session.state,
      ageMs: age,
      subCount,
    });
  }

  if (reaped > 0) {
    console.log("[STREAM][REAPER_SUMMARY]", {
      reaped,
      remaining: sessions.size,
    });
  }
}, REAPER_INTERVAL_MS).unref();

/* ==================================================
   StreamEngine (SSOT FINAL+)
================================================== */

export class StreamEngine {
  private static registry = new Map<number, Set<string>>();

  static hasRegistered(threadId: number, traceId: string): boolean {
    const set = this.registry.get(threadId);
    return set ? set.has(traceId) : false;
  }

  static markRegistered(threadId: number, traceId: string) {
  if (!this.registry.has(threadId)) {
    this.registry.set(threadId, new Set());
  }
  this.registry.get(threadId)!.add(traceId);
  }
  static getReasoning(threadId: number) {
    return sessions.get(threadId)?.reasoning;
  }

  static getResponseAffordance(threadId: number): ResponseAffordanceVector | undefined {
  return sessions.get(threadId)?.responseAffordance;
}

static getTurnIntent(
  threadId: number
): TurnIntent | undefined {
  return sessions.get(threadId)?.turnIntent;
}

  static getState(threadId: number): StreamState | undefined {
    return sessions.get(threadId)?.state;
  }

  static getSession(threadId: number): StreamSession | undefined {
  return sessions.get(threadId);
}

 /** 🔒 SSOT: tool runner reports result here */
  static setLastToolResult(
    threadId: number,
    data: {
      tool: import("../tools/tool-types").ToolType;
      result: unknown;
      confidence?: number;
    }
  ) {
    const session = sessions.get(threadId);
    if (!session) return;
    session.lastToolResult = data;
  }

  /** 🔒 SSOT: ExecutionEngine read-only access */
  static getLastToolResult(threadId: number) {
    return sessions.get(threadId)?.lastToolResult;
  }
  static async publishMeta(args: {
    threadId: number;
    traceId: string;
    meta: Record<string, unknown>;
  }) {
    await this.publish(args.threadId, {
      event: "stage",
      stage: StreamStage.THINKING,
      traceId: args.traceId,
      meta: args.meta,
    } as any);
  }
  /* ----------------------------------------------
     🧠 Reasoning Block SSOT (SESSION STORAGE)
     - 패널 / FINAL snapshot 기준 데이터
  ---------------------------------------------- */

  static appendReasoningBlock(
    threadId: number,
    block: {
      stage?: string | null;
      title?: string | null;
      body?: string | null;
      ts: number;
      groupIndex: number;
    }
  ) {
    const session = sessions.get(threadId);
    if (!session) return;

    if (!session.reasoningBlocks) {
      session.reasoningBlocks = [];
    }

  // 🔥 SSOT FIX: groupIndex 기반 replace
 const existingIndex = session.reasoningBlocks.findIndex(
   (b) => b.groupIndex === block.groupIndex
 );


  const newBlock = {
    stage: block.stage ?? null,
    title: block.title ?? "",
    body: block.body ?? "",
    ts: block.ts,
    groupIndex: block.groupIndex,
  };

  if (existingIndex !== -1) {
    session.reasoningBlocks[existingIndex] = newBlock;
  } else {
    session.reasoningBlocks.push(newBlock);
  }
  }

  // 🔥 Activity Snapshot Materializer (SSOT)
  private static materializeActivity(
    session: StreamSession,
    op: "ADD" | "PATCH" | "END",
    item: any
  ) {
    if (!session.chunks) session.chunks = [];

    const id = String(item?.id ?? "");
    if (!id) return;

    const now = Date.now();
    const existingIndex = session.chunks.findIndex(
      (c: any) => c.id === id
    );

    if (op === "ADD") {
      if (existingIndex !== -1) return; // idempotent

      session.chunks.push({
        id,
        kind: item.kind ?? null,
        status: item.status ?? "RUNNING",
        title: item.title ?? null,
        body: item.body ?? null,
        inlineSummary: item.inlineSummary ?? null,
        meta: item.meta ?? null,
        startedAt: item.at ?? now,
        endedAt: null,
      });
      return;
    }

    if (op === "PATCH") {
      // SSOT safety: PATCH가 ADD보다 먼저 와도 snapshot 복원이 비지 않도록 upsert 처리
      if (existingIndex === -1) {
        session.chunks.push({
          id,
          kind: item.kind ?? null,
          status: item.status ?? "RUNNING",
          title: item.title ?? null,
          body: item.body ?? null,
          inlineSummary: item.inlineSummary ?? null,
          meta: item.meta ?? null,
          startedAt: item.at ?? now,
          endedAt: null,
        });
        return;
      }

      const prev = session.chunks[existingIndex];
      session.chunks[existingIndex] = {
        ...prev,
        ...item,
        id, // protect id
      };
      return;
    }

    if (op === "END" && existingIndex !== -1) {
      session.chunks[existingIndex] = {
        ...session.chunks[existingIndex],
        status: item.status ?? "OK",
        endedAt: item.at ?? now,
      };
    }
  }
  /** 🔥 FINAL = UI logical end (SSE 유지) */
  static async publishFinal(threadId: number, args: { traceId: string }) {
    const session = sessions.get(threadId);
    if (!session) return;
    if (DONE_STATES.has(session.state)) return;
    console.log("[STREAM][FINAL]", {
    threadId,
    traceId: args.traceId,
    prevState: session.state,
  });
    if (session.state !== StreamState.FINAL) {
      session.state = StreamState.FINAL;
      session.finalized = true;
      session.finalizedAt = Date.now();
    }
  // 🔥 reasoning buffer hard clear
  if (session.reasoningBuffers) {
    session.reasoningBuffers.clear();
  }
    return this.publish(threadId, {
      event: "final",
      stage: StreamStage.ANSWER,
      traceId: args.traceId,
      final: true,
    } as any);
  }

  /** ✅ DONE = transport end (SSE close) */
  static async publishDone(
    
    threadId: number,
    args: { traceId: string; reason: "completed" | "aborted" | "error" }
  ) {
    
    const session = sessions.get(threadId);
    if (!session) return;
    
      session.state =
        args.reason === "completed"
          ? StreamState.DONE_COMPLETED
          : args.reason === "aborted"
          ? StreamState.DONE_ABORTED
          : StreamState.DONE_ERROR;
console.log("[PUBLISH_DONE_CALLED]", {
  threadId,
  state: session?.state
});
    console.log("[STREAM][DONE]", {
    threadId,
    traceId: args.traceId,
    reason: args.reason,
    finalState: session?.state,
  });

    return this.publish(threadId, {
      event: "done",
      stage: StreamStage.SYSTEM,
      traceId: args.traceId,
      done: true, // 🔥 server-side break 조건
      meta: { 
    reason: args.reason 
  },
    } as any);
  }

  /* ----------------------------------------------
     SESSION CONTROL
  ---------------------------------------------- */

  static register(
  threadId: number,
  traceId: string,
  opts?: {
    reasoning?: any;
    responseAffordance?: ResponseAffordanceVector;
    turnIntent?: TurnIntent;
    executionPlan?: import("../execution/execution-plan").ExecutionPlan;
    allowContinuation?: boolean;
    conversationalOutcome?: import("../decision/conversational-outcome").ConversationalOutcome;
  }
): StreamSession {
    if (sessions.has(threadId)) {
      // Clear old session buffers before abort to prevent reasoning context leak
      const oldSession = sessions.get(threadId);
      if (oldSession) {
        if (oldSession.reasoningBuffers) oldSession.reasoningBuffers.clear();
        if (oldSession.reasoningBlocks) oldSession.reasoningBlocks = undefined;
        if (oldSession.activitySeen) oldSession.activitySeen.clear();
        if (oldSession.activityLastHash) oldSession.activityLastHash.clear();
        if (oldSession.reasoningFlushInterval) {
          clearInterval(oldSession.reasoningFlushInterval);
          oldSession.reasoningFlushInterval = null;
        }
      }
      this.abort(threadId, "superseded");
    }

    const session: StreamSession = {
      threadId,
      traceId,
      abort: new AbortController(),
      state: StreamState.READY,
      nextEventId: 1,
      initialUserLang: undefined,
      chunks: [],
      tools: [],
      summaries: [],
      primarySummaryId: null,
      reasoning: opts?.reasoning
        ? Object.freeze({ ...opts.reasoning })
        : undefined,
      responseAffordance: opts?.responseAffordance,
      turnIntent: opts?.turnIntent,
      executionPlan: opts?.executionPlan,
      allowContinuation: opts?.allowContinuation,
      conversationalOutcome: opts?.conversationalOutcome,
      startedAt: Date.now(),
       activitySeen: new Set(),
      activityLastHash: new Map(),
      titleJobEnqueued: new Set(),
    };

    sessions.set(threadId, session);
    buffers.set(threadId, []);

  console.log("[STREAM][REGISTER]", {
    threadId,
    traceId,
    hasReasoning: Boolean(opts?.reasoning),
    hasExecutionPlan: Boolean(opts?.executionPlan),
    startedAt: session.startedAt,
  });


// ❌ SSOT: action은 ExecutionEngine에서만 emit

    return session;
  }

   static attachExecutionAbort(threadId: number, controller: AbortController) {
   const session = sessions.get(threadId);
   if (session) {
     session.executionAbort = controller;
   }
 }
static getExecutionPlan(threadId: number) {
  return sessions.get(threadId)?.executionPlan;
}

  /* ----------------------------------------------
     🧠 Thinking Stage Scheduler (SSOT)
     - token과 완전 분리
     - abort / supersede 안전
  ---------------------------------------------- */
  static async publishReasoningDelta(
    threadId: number,
    delta: {
      id: string;
      ts: number;
      source: "decision" | "tool_gate" | "prompt_runtime";
      title: string;
      body: string;
    },
    traceId: string
  ) {
    const session = sessions.get(threadId);
    if (!session) return;
    if (DONE_STATES.has(session.state)) return;
    if (session.state === StreamState.FINAL) return;

  console.log("[STREAM][SESSION_REASONING_COUNT]", {
    threadId,
  });
    const groupIndex = (() => {
      const raw = delta.id ?? "";
      const last = typeof raw === "string" ? raw.split(":").pop() : null;
      const n = last != null ? Number(last) : NaN;
      return Number.isFinite(n) ? n : undefined;
    })();
    return this.publish(threadId, {
      event: "reasoning_block",
      traceId,
      stage: StreamStage.THINKING,
      block: {
        id: `reasoning-${groupIndex ?? 0}`,
        title: delta.title ?? undefined,
        body: delta.body,
        inlineSummary: delta.body?.slice(0, 180),
        groupIndex,
      },
    } as any);
  }

  /**
   * ✅ STREAM READY (SSOT)
   * - 프론트 계약: (event: "ready") OR (event:"stage" && topic:"stream.ready")
   * - 백엔드는 ready 이벤트 타입을 쓰지 않으므로 stage+topic으로 통일한다.
   * - 반드시 register 직후, 다른 의미 이벤트(stage/narration/token)보다 먼저 publish되어야 한다.
   */
 private static emitStreamReady(
   threadId: number,
   traceId: string
 ) {
  const session = sessions.get(threadId);
  if (!session) return;
    return this.publish(threadId, {
      event: "stage",
      topic: "stream.ready",
      stage: StreamStage.THINKING,
      traceId,
    meta: { openaiSeq: session.nextEventId },
    } as any);
  }

  /* ----------------------------------------------
     DONE GATE (🔥 핵심)
     - DONE는 여기서 1회 발행
     - cleanup ❌ (subscriber가 책임)
  ---------------------------------------------- */

  private static async emitDone(
    threadId: number,
    reason: "completed" | "aborted" | "error"
  ) {
    const session = sessions.get(threadId);
    if (!session) return;
    if (DONE_STATES.has(session.state)) return;

    // 🔒 SSOT: DONE 상태 선반영 (race 방지)
  session.state =
    reason === "completed"
      ? StreamState.DONE_COMPLETED
      : reason === "aborted"
      ? StreamState.DONE_ABORTED
      : StreamState.DONE_ERROR;

          if (reason === "aborted") {
      writeFailureSurface({
        traceId: session.traceId,
        threadId,
        path: session.reasoning?.path ?? "unknown",
        phase: "stream",
        failureKind: "ABORT",
        surfaceKey: `STREAM:ABORT`,
      });
    }

    // 1️⃣ transport DONE 발행 (SSE close)
    try {
      await this.publishDone(threadId, {
        traceId: session.traceId,
        reason,
      });
    } catch {}
    buffers.set(threadId, []);
 }
  static abort(threadId: number, reason = "aborted"): boolean {
    const session = sessions.get(threadId);
    if (!session) return false;
    if (DONE_STATES.has(session.state)) return false;
    session.abort.abort();
    session.executionAbort?.abort();
    return true;
  }

  static async finish(
    threadId: number,
    args: { reason: "completed" | "aborted" | "error"; skipDoneEvent?: boolean; traceId?: string }
  ) {
    const session = sessions.get(threadId);
    // ✅ SSOT: FINAL → DONE invariant (all paths)
    if (session && session.state !== StreamState.FINAL) {
      await this.publishFinal(threadId, {
        traceId: args.traceId ?? session.traceId,
      });
    }
    await this.emitDone(threadId, args.reason);
    }

  /* ----------------------------------------------
     PRODUCER
  ---------------------------------------------- */

  static async publish(
    threadId: number,
    event: YuaStreamEvent
  ): Promise<void> {
    const session = sessions.get(threadId);
    if (!session) return;
  // 🔒 SSOT: traceId 강제 보정 (publish 초입)
  const resolvedTraceId = event.traceId ?? session.traceId;

  // event 객체를 여기서부터는 traceId 보장된 것으로 취급
  event = {
    ...event,
    traceId: resolvedTraceId,
  };
  // 🔥 SSOT: eventId는 StreamEngine 단일 소유 (ordering / resume)
  if (typeof (event as any).eventId !== "number") (event as any).eventId = session.nextEventId++;
 // 🔥 SSOT: openaiSeq는 항상 eventId와 동일
 const assignedEventId = (event as any).eventId;

 if (!event.meta) event.meta = {};
 event.meta = {
   ...event.meta,
   openaiSeq: assignedEventId,
 };
  const evType = event.event ?? (event as any).event;

  // 🔒 DONE 이후에는 publish 금지
  // 단, done 이벤트 자체는 반드시 통과시킨다
// 🔥 DONE 이후 publish 금지
// 단, "done" 이벤트 자체는 반드시 통과시킨다
if (DONE_STATES.has(session.state)) {
  if (event.event !== "done") return;
}

  if (session.state === StreamState.FINAL) {
    if (evType !== "final" && evType !== "suggestion" && evType !== "done" && evType !== "memory") {
      console.warn("[DROP_AFTER_FINAL]", evType);
      return;
    }
  }

  /* -------------------------------------------
     🔥 ACTIVITY SAFE GUARD (SSOT)
     - reasoning_block intercept 이후 activity는
       StreamEngine가 직접 emit한 것만 통과
     - malformed payload 방지
  ------------------------------------------- */
  if (event.event === "activity") {
    const act = (event as any).activity;
    const op = act?.op;
    const item = act?.item ?? {};
    const itemId = item?.id;
    if (!op || !itemId) return;

    // ---------------------------
    // 🔒 SSOT: publish-level dedup
    // - ADD: 같은 id는 세션당 1회만 통과
    // - PATCH/END: 동일 payload면 드롭 (hash)
    // ---------------------------
    if (!session.activitySeen) session.activitySeen = new Set();
    if (!session.activityLastHash) session.activityLastHash = new Map();

    const id = String(itemId);
    const seenKey = `${op}:${id}`;

    if (op === "ADD") {
      if (session.activitySeen.has(seenKey)) {
        console.log("[DROP_DUP_ACTIVITY_ADD]", { threadId, id });
        return;
      }
      session.activitySeen.add(seenKey);
    } else {
      // PATCH/END는 payload hash로 중복 드롭
      const hash = JSON.stringify({
        op,
        id,
        title: item?.title ?? null,
        body: item?.body ?? null,
        status: item?.status ?? null,
        kind: item?.kind ?? null,
        inlineSummary: item?.inlineSummary ?? null,
        meta: item?.meta ?? null,
      });
      const prev = session.activityLastHash.get(seenKey);
      if (prev && prev === hash) {
        console.log("[DROP_DUP_ACTIVITY_PATCH]", { threadId, op, id });
        return;
      }
      session.activityLastHash.set(seenKey, hash);
    }

    // ---------------------------
    // 🔒 SSOT: title job enqueue 1회 보장
    // ---------------------------
    if (!session.titleJobEnqueued) session.titleJobEnqueued = new Set();
    if (
      (op === "ADD" || op === "PATCH") &&
      typeof item?.body === "string" &&
      item.body.trim().length >= 12 &&
      (
        item?.kind !== ActivityKind.RESEARCHING ||
        (
          item?.meta &&
          typeof item.meta === "object" &&
          Array.isArray((item.meta as Record<string, unknown>).sources) &&
          ((item.meta as Record<string, unknown>).sources as unknown[]).length > 0
        )
      )
    ) {
      const k = `title:${id}`;
      if (!session.titleJobEnqueued.has(k)) {
        session.titleJobEnqueued.add(k);
        void enqueueActivityTitleJob({
          threadId,
          traceId: resolvedTraceId,
          sources: (() => {
            const meta = item?.meta;
            if (!meta || typeof meta !== "object") return undefined;
            const raw = (meta as Record<string, unknown>).sources;
            if (!Array.isArray(raw)) return undefined;
            return raw
              .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
              .map((s) => ({
                id: typeof s.id === "string" ? s.id : undefined,
                label: typeof s.label === "string" ? s.label : undefined,
                url: typeof s.url === "string" ? s.url : "",
                host: typeof s.host === "string" ? s.host : null,
              }))
              .filter((s) => s.url.length > 0);
          })(),
          activityId: id,
          kind: String(item.kind ?? ""),
          body: item.body,
          hint:
            typeof item.inlineSummary === "string"
              ? item.inlineSummary.slice(0, 80)
              : undefined,
        }).catch(() => {});
      } else {
        console.log("[DROP_DUP_TITLE_ENQUEUE]", { threadId, id });
      }
    }
      // 🔥 SNAPSHOT MATERIALIZE (SSOT)
      try {
        if (act?.op && act?.item) {
          this.materializeActivity(session, act.op, act.item);
        }
      } catch (e) {
        console.error("[ACTIVITY_MATERIALIZE_ERROR]", e);
      }
  }
    /* -------------------------------------------
       🔥 SUGGESTION GATE (SSOT)
       - FINAL 이전: 무조건 차단
       - FINAL 이후: 중복 1회만 허용
    ------------------------------------------- */
    if (event.event === "suggestion") {
  const session = sessions.get(threadId);
  // 🔒 FINAL 이후에만 허용
  if (!session || session.state !== StreamState.FINAL) return;

  // 🔒 단 1회만 허용
  if (this.hasRegistered(threadId, event.traceId!)) return;
  this.markRegistered(threadId, event.traceId!);
    }


    if (session.state === StreamState.READY) {
      session.state = StreamState.STREAMING;
    }

    if (event.event === "reasoning_block") {
      const block = (event as any)?.block;

      if (!block) {
        console.error(
          "[STREAM][CONTRACT_VIOLATION] reasoning_block missing block payload",
          event
        );
        return;
      }

      if (typeof session.reasoningFlushing !== "boolean") {
        session.reasoningFlushing = false;
      }
  // 🔥 safety init
  if (typeof session.reasoningFlushing !== "boolean") {
    session.reasoningFlushing = false;
  }

      const groupIndex =
        typeof block.groupIndex === "number"
          ? block.groupIndex
          : 0;
      const body =
        typeof block.body === "string" ? block.body : "";
      const title =
        typeof block.title === "string" ? block.title : undefined;

      if (!session.reasoningBuffers) {
        session.reasoningBuffers = new Map();
      }

      const existing = session.reasoningBuffers.get(groupIndex);
      if (!existing) {
        session.reasoningBuffers.set(groupIndex, {
          groupIndex,
          title,
          body,
          lastTokenAt: Date.now(),
          flushed: false,
          activityAdded: false,
        });
      } else {
        if (!existing.title && title) existing.title = title;
        existing.body = body;
}
      void this.flushReasoningBuffers(threadId, resolvedTraceId);
    }

    // 🔒 stage 보정
    const lastStage =
      getBuffer(threadId).length > 0
        ? (getBuffer(threadId).slice(-1)[0].stage as YuaStreamStage)
        : undefined;

        const resolvedStage: YuaStreamStage =
      event.event === "stage"
        ? ((event.stage ??
            (event.topic === "stream.ready"
              ? StreamStage.THINKING
              : "system")) as YuaStreamStage)
        : ((event.stage ??
            (event.event === "done"
              ? StreamStage.SYSTEM
              : event.token
              ? lastStage ?? StreamStage.ANSWER
              : "system")) as YuaStreamStage);
              
    const safeEvent: YuaStreamEvent = {
      ...event,
    // eventId는 위에서 강제 주입됨
      eventId: (event as any).eventId,
      traceId: event.traceId ?? session.traceId,
      event:
        event.event ??
        (event.done ? "done" : event.token ? "token" : "stage"),
      stage: resolvedStage,
    };



        if (safeEvent.event === "suggestion") {
      console.log("[STREAM][PUBLISH][SUGGESTION]", {
        threadId,
        stage: safeEvent.stage,
        hasSuggestion: Boolean(safeEvent.suggestion),
        itemCount: safeEvent.suggestion?.items?.length,
      });
    }

    getBuffer(threadId).push(safeEvent);
insertStreamEvent(threadId, safeEvent).catch(() => {});

    if (safeEvent.event === "token" && typeof safeEvent.token === "string") {
 }

    await redisPub.publish(
      streamChannel(threadId),
      JSON.stringify(safeEvent)
    );
  }

  /** 🔥 PUBLIC: force reasoning flush before FINAL/DONE */
  static async flushReasoningNow(
    threadId: number,
    traceId: string,
    opts?: { force?: boolean }
  ) {
    const session = sessions.get(threadId);
    if (!session) return;
    if (session?.finalized) return;
    if (DONE_STATES.has(session.state)) return;

    await this.flushReasoningBuffers(
      threadId,
      traceId,
      { force: opts?.force === true }
    );
  }

  private static async flushReasoningBuffers(
    threadId: number,
    traceId: string,
    opts?: { force?: boolean }
  ) {
    const session = sessions.get(threadId);
    if (!session || session.reasoningFlushing) return;
    if (DONE_STATES.has(session.state)) {
      if (session.reasoningFlushInterval) {
        clearInterval(session.reasoningFlushInterval);
        session.reasoningFlushInterval = null;
      }
      return;
    }

    const buffersMap = session.reasoningBuffers;
    if (!buffersMap || buffersMap.size === 0) return;

    session.reasoningFlushing = true;
    try {
      const sorted = Array.from(buffersMap.values()).sort(
        (a, b) => a.groupIndex - b.groupIndex
      );

      for (const buffer of sorted) {
        if (session?.finalized) break;
        const cleanedBody = cleanText(buffer.body);
        const lastEmittedLength = buffer.lastEmittedLength ?? 0;
        console.log("[TRACE][STREAM_ENGINE][REASONING_FLUSH]", {
          threadId,
          state: session.state,
          groupIndex: buffer.groupIndex,
          flushed: buffer.flushed,
        });
        const force = opts?.force === true;
        if (!force) {
          if (buffer.flushed) continue;
          // 🔒 길이 감소 or 동일 → 재방출 금지
          if (cleanedBody.length <= lastEmittedLength) continue;
        }

        const IDLE_MS = 450;
        const idle = Date.now() - buffer.lastTokenAt > IDLE_MS;
        const shouldFlush = force ? true : idle;

        if (shouldFlush) {
          let title =
            buffer.title && buffer.title.trim().length > 0
              ? buffer.title.trim()
              : undefined;

          if (!title) {
            title = undefined;
          }

          const activityId = `reasoning-${buffer.groupIndex}`;

          this.appendReasoningBlock(threadId, {
            stage: null,
            title,
            body: cleanedBody,
            ts: Date.now(),
            groupIndex: buffer.groupIndex,
          });

          const op = buffer.activityAdded ? "PATCH" : "ADD";

          await StreamEngine.publish(threadId, {
            event: "activity",
            stage: StreamStage.THINKING,
            traceId,
            activity: {
              op,
              item: {
                id: activityId,
                kind: ActivityKind.REASONING_SUMMARY,
                title,
                body: cleanedBody,
                meta: { groupIndex: buffer.groupIndex },
              },
            },
          });
          buffer.flushed = true;
          buffer.activityAdded = true;
          buffer.lastEmittedLength = cleanedBody.length;
        }
        const phaseDelay = 120 + buffer.groupIndex * 60;
        await delay(phaseDelay);
      }

      const allFlushed = Array.from(buffersMap.values()).every(
        (b) => b.flushed === true
      );
      if (allFlushed) {
      }
    } finally {
      session.reasoningFlushing = false;
    }
  }

  /* ----------------------------------------------
     CONSUMER (SSE)
     🔥 cleanup 책임은 여기
  ---------------------------------------------- */

  static async *subscribe(
    threadId: number
  ): AsyncGenerator<YuaStreamEvent> {
    let queue: YuaStreamEvent[] = [];
    let notify: (() => void) | null = null;


    const push = (e: YuaStreamEvent) => {
      queue.push(e);
      notify?.();
      notify = null;
    };

    getSubscribers(threadId).add(push);
    attachRedisOnce();
    await ensureRedis(threadId);

    for (const e of getBuffer(threadId)) queue.push(e);
    const HEARTBEAT_MS = 15000; // GCP VM 기준 15~20초 권장
    let lastSentAt = Date.now();

    try {
      while (true) {
        if (queue.length === 0) {
          await Promise.race([
            new Promise<void>((r) => (notify = r)),
            new Promise<void>((r) =>
              setTimeout(() => {
                const now = Date.now();
                if (now - lastSentAt >= HEARTBEAT_MS) {
                  queue.push({
                    event: "ping",
                    traceId: "heartbeat",
                  } as any);
                }
                r();
              }, HEARTBEAT_MS)
            ),
          ]);
        }

        const ev = queue.shift();
        if (!ev) continue;
        lastSentAt = Date.now();

 if (ev.event === "token" && typeof ev.token === "string") {
   // 🔒 SSOT: 서버는 token을 절대 병합하지 않는다
   yield ev;
   continue;
 }

        yield ev;
        if ((ev as any).done === true || ev.event === "done") break;
      }
    } finally {
      // 🔥 SSE 종료 이후 cleanup
      const set = subscribers.get(threadId);
      set?.delete(push);

      // 모든 subscriber가 빠졌으면 정리
      if (!set || set.size === 0) {
        const session = sessions.get(threadId);
        if (session?.reasoningFlushInterval) {
          clearInterval(session.reasoningFlushInterval);
        }
        sessions.delete(threadId);
        subscribers.delete(threadId);
        buffers.delete(threadId);

        // Unsubscribe from Redis channels to prevent subscription leak
        const ch = streamChannel(threadId);
        const patchCh = titlePatchChannel(threadId);
        const threadCh = threadTitlePatchChannel(threadId);
        channelToThread.delete(ch);
        channelToThread.delete(patchCh);
        channelToThread.delete(threadCh);
        redisSub.unsubscribe(ch).catch(() => {});
        redisSub.unsubscribe(patchCh).catch(() => {});
        redisSub.unsubscribe(threadCh).catch(() => {});

        // Clean up registry to prevent memory leak
        StreamEngine.registry.delete(threadId);
      }
    }
  }
}
