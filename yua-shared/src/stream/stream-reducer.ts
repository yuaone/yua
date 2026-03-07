import type { StreamEventKind, StreamPayload } from "./types";
import type { ThinkingProfile } from "../types/thinkingProfile";
import type { ActivityEventPayload, ActivityItem } from "./activity";
import type { SuggestionPayload } from "../types/suggestion";
import { ActivityKind } from "./activity";
import { getThinkingContract } from "../types/thinkingProfile";
export enum StreamUIStateKind {
  IDLE = "IDLE",
  CONNECTING = "CONNECTING",
  READY = "READY",
  STREAMING = "STREAMING",
  FINALIZED = "FINALIZED",
  DONE = "DONE",
  ERROR = "ERROR",
}

export type StreamUIState = {
  kind: StreamUIStateKind;
  threadId?: number;
  traceId?: string | null;

  text: string;
  lastToken?: string | null;
  stage?: string | null;
  thinkingProfile?: ThinkingProfile;

  activity: ActivityItem[];
  activityIndex: Record<string, number>;
  reasoningSectionBuffer?: Record<string, string>;
  suggestion?: SuggestionPayload | null;

  finalized: boolean;
  done: boolean;
  answerUnlocked?: boolean;
  thinkingStartedAt?: number | null;
  serverStartedAt?: number | null;
  thinkingCompletedAt?: number | null;
  finalAt?: number | null;
  graceWindowMs: number;
  
   // 🔥 sequence reorder buffer
  pendingSeqEvents: {
    seq: number;
    input: StreamReducerInput;
  }[];
  lastAppliedSeq: number;
  pendingActivityPatches: Record<string, ActivityItem | undefined>;
  error?: string | null;
};

export type StreamReducerInput = {
  kind: StreamEventKind;
  payload?: StreamPayload;
  nowMs?: number;
};

export const DEFAULT_GRACE_WINDOW_MS = 4200; // 🔥 activity 안정화

export function createInitialStreamState(
  overrides: Partial<StreamUIState> = {}
): StreamUIState {
  return {
    kind: StreamUIStateKind.IDLE,
    text: "",
    activity: [],
    activityIndex: {},
    reasoningSectionBuffer: {},
    suggestion: null,
    finalized: false,
    done: false,
    answerUnlocked: false,
    thinkingStartedAt: null,
    thinkingCompletedAt: null,
    finalAt: null,
    graceWindowMs: DEFAULT_GRACE_WINDOW_MS,
    error: null,
     pendingSeqEvents: [],
    lastAppliedSeq: -1,
    pendingActivityPatches: {},
    ...overrides,
  };
}

function withinGrace(state: StreamUIState, nowMs: number): boolean {
  if (!state.finalized || !state.finalAt) return true;
  return nowMs - state.finalAt <= state.graceWindowMs;
}

export function reduceStreamState(
  state: StreamUIState,
  input: StreamReducerInput
): StreamUIState {
  const payload = input.payload;
  const nowMs = input.nowMs ?? Date.now();
  const seq = payload?.meta?.openaiSeq;

  // Events like final/done/suggestion don't carry openaiSeq — process directly
  if (typeof seq !== "number") {
    return reduceStreamStateCore(state, input);
  }
  const eventId = (payload as any)?.eventId;
  console.log("[TRACE][STREAM_REDUCER][INPUT]", {
    kind: input.kind,
    seq,
    eventId,
    lastAppliedSeq: state.lastAppliedSeq,
  });

  // 🔒 TRANSPORT-LEVEL DONE LOCK (hard stop)
  if (state.done) {
    return state;
  }

  // 🔥 SEQUENCE REORDER LAYER
  if (typeof seq === "number") {
    const buffered = [...state.pendingSeqEvents, { seq, input }].sort(
      (a, b) => a.seq - b.seq
    );

    let nextState: StreamUIState = {
      ...state,
      pendingSeqEvents: buffered,
    };

    while (
      nextState.pendingSeqEvents.length > 0 &&
      nextState.pendingSeqEvents[0].seq === nextState.lastAppliedSeq + 1
    ) {
      const ev = nextState.pendingSeqEvents.shift()!;
      nextState = {
        ...nextState,
        lastAppliedSeq: ev.seq,
      };

      nextState = reduceStreamStateCore(nextState, ev.input);
    }

    return nextState;
  }

  return reduceStreamStateCore(state, input);
}
 function reduceStreamStateCore(
  state: StreamUIState,
  input: StreamReducerInput
): StreamUIState {
  const payload = input.payload;
  const nowMs = input.nowMs ?? Date.now();

  if (state.done) return state;

  switch (input.kind) {
    case "ready": {
      if (state.finalized) return state;
 const rawStarted = payload?.meta?.serverStartedAt;
 const safeStarted =
   typeof rawStarted === "number" ? rawStarted : nowMs;
      return {
        ...state,
        serverStartedAt: safeStarted,
        kind: StreamUIStateKind.READY,
        graceWindowMs:
          payload?.meta?.thinkingProfile === "DEEP"
            ? 6000
            : state.graceWindowMs,
        traceId: payload?.traceId ?? state.traceId ?? null,
        thinkingProfile:
          (payload?.meta?.thinkingProfile as ThinkingProfile) ??
          state.thinkingProfile,
      };
    }

    case "stage": {
      if (state.finalized) return state;
  if (payload?.stage === "thinking") {
    return {
      ...state,
      stage: "thinking",
      thinkingStartedAt: nowMs,
    };
  }
  // 🔥 unlock 처리
  if (payload?.stage === "answer_unlocked") {
    return {
      ...state,
      answerUnlocked: true,
    };
  }
      return {
        ...state,
        stage: payload?.stage ?? state.stage ?? null,
        thinkingProfile:
          (payload?.meta?.thinkingProfile as ThinkingProfile) ??
          state.thinkingProfile,
      };
    }

    case "token": {
      const token = payload?.token;
      if (typeof token !== "string" || token.length === 0) return state;
 if (state.thinkingProfile === "DEEP") {
   if (!state.answerUnlocked) {
     // 🔥 drop하지 말고 hold
     return {
       ...state,
       text: state.text, // noop
     };
   }
 // 🔒 FINAL DEFENSE — reasoning text 차단
 if (
   token.includes("REASONING_BLOCK") ||
   token.includes("⟦REASONING_BLOCK⟧")
 ) {
   return state;
 }
    // 🔥 최소 thinking 유지 시간
    const contract = getThinkingContract(state.thinkingProfile);
    const started = state.thinkingStartedAt ?? nowMs;
    const elapsed = nowMs - started;

    const completedAt = state.thinkingCompletedAt;

    // 🔥 최대 상한 안전장치
    if (elapsed > contract.maxThinkingHoldMs) {
      // 강제 해제
    } else {
      // 완료 신호가 아직 없으면 계속 thinking
      if (!completedAt) {
        return state;
      }

      // 완료됐지만 최소시간 안 됐으면 유지
      if (elapsed < contract.minThinkingHoldMs) {
        return state;
      }
    }
   }

   return {
     ...state,
     kind: StreamUIStateKind.STREAMING,
     text: state.text + token,
     lastToken: token,
   };
 }
    case "activity": {
      if (!payload?.activity) return state;
      return applyActivity(state, payload.activity);
    }
case "reasoning_block": {
  const block = payload?.block;
  if (!block?.id) return state;

  const exists = state.activityIndex[block.id] !== undefined;

  const op = exists ? "PATCH" : "ADD";

  return applyActivity(state, {
    op,
    item: {
      id: block.id,
      kind: ActivityKind.REASONING_SUMMARY,
      status: "RUNNING",
      title: block.title ?? "",
      body: block.body ?? "",
      at: Date.now(),
      meta: {
        groupIndex: block.groupIndex,
      },
    },
  });
}
  case "reasoning_done": {
   const id = payload?.reasoning_done?.id;
   if (!id) return state;

   return applyActivity(state, {
     op: "END",
     item: {
       id,
       kind: ActivityKind.REASONING_SUMMARY,
       status: "OK",
       at: Date.now(),
     },
   });
 }

    case "answer_unlocked": {
      return {
        ...state,
        answerUnlocked: true,
      };
    }
case "suggestion": {
  const s = payload?.suggestion as SuggestionPayload | undefined;

  if (!s || !Array.isArray(s.items)) {
    return {
      ...state,
      suggestion: null,
    };
  }

  return {
    ...state,
    suggestion: s,
  };
}

    case "final": {
      if (state.finalized) return state;
      return {
        ...state,
        kind: StreamUIStateKind.FINALIZED,
        finalized: true,
        finalAt: nowMs,
        thinkingCompletedAt: nowMs,
      };
    }

    case "done": {
      return {
        ...state,
        kind: StreamUIStateKind.DONE,
        done: true,
      };
    }

    default:
      return state;
  }
}

export function applyActivity(
  state: StreamUIState,
  payload: ActivityEventPayload
): StreamUIState {
  const item = payload.item;
  if (!item || typeof item.id !== "string") return state;

  const id = item.id;
  const exists = state.activityIndex[id] !== undefined;

  // ---------------- ADD ----------------
  if (payload.op === "ADD") {
    if (exists) return state;

    let nextItem: ActivityItem = {
      status: "RUNNING",
      ...item,
      id,
    };

    const pending = state.pendingActivityPatches[id];
    if (pending) {
      nextItem = { ...nextItem, ...pending };
    }

    const nextIndex = state.activity.length;

    const { [id]: _, ...rest } = state.pendingActivityPatches;

    return {
      ...state,
      activity: [...state.activity, nextItem],
      activityIndex: { ...state.activityIndex, [id]: nextIndex },
      pendingActivityPatches: rest,
    };
  }

  // ---------------- PATCH ----------------
  if (payload.op === "PATCH") {
    if (!exists) {
      return {
        ...state,
        pendingActivityPatches: {
          ...state.pendingActivityPatches,
          [id]: item,
        },
      };
    }

    const idx = state.activityIndex[id];
    const cur = state.activity[idx];

   // 🔒 MONOTONIC TIMESTAMP GUARD
    const incomingTs = (item as any)?.timestamp;
    const currentTs = (cur as any)?.timestamp;
    if (
      typeof incomingTs === "number" &&
      typeof currentTs === "number" &&
      incomingTs < currentTs
    ) {
      return state; // ignore stale patch
    }

    if (cur.status === "OK" || cur.status === "FAILED") return state;

    const merged: ActivityItem = {
      ...cur,
      ...item,
      id: cur.id,
    };

    const next = state.activity.slice();
    next[idx] = merged;

    return { ...state, activity: next };
  }

  // ---------------- END ----------------
  if (payload.op === "END") {
    if (!exists) return state;

    const idx = state.activityIndex[id];
    const cur = state.activity[idx];
    // 🔒 MONOTONIC TIMESTAMP GUARD
    const incomingTs = (item as any)?.timestamp;
    const currentTs = (cur as any)?.timestamp;
    if (
      typeof incomingTs === "number" &&
      typeof currentTs === "number" &&
      incomingTs < currentTs
    ) {
      return state; // ignore stale end
    }
    const merged: ActivityItem = {
      ...cur,
      ...item,
      id: cur.id,
      status: item.status === "FAILED" ? "FAILED" : "OK",
    };

    const next = state.activity.slice();
    next[idx] = merged;

    return { ...state, activity: next };
  }

  return state;
}
