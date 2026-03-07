import { create } from "zustand";

import { ActivityKind, type ActivityEventPayload, type ActivityItem } from "yua-shared/stream/activity";
import type { StreamUIState } from "yua-shared/stream/stream-reducer";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

export type MobileOverlayChunkSource = "ACTIVITY" | "NARRATION";

export type MobileOverlayChunk = {
  chunkId: string;
  index: number;
  at: number;
  source: MobileOverlayChunkSource;
  title: string | null;
  body: string | null;
  inline: string | null;
  kind?: ActivityKind | string;
  meta?: Record<string, unknown> | null;
  done: boolean;
};

export type MobileThinkingSummary = {
  id: string;
  title: string | null;
  summary: string | null;
  status: "ACTIVE" | "DONE";
};

type MobileThinkingPhase = "thinking" | "analyzing" | "answer" | null;

export type MobileStreamSession = {
  active: boolean;
  messageId: string | null;
  traceId: string | null;
  done: boolean;
  doneReason: string | null;
  mode: ThinkingProfile;
  thinkingProfile: ThinkingProfile | null;
  thinkingSignalCount: number;
  thinking: {
    active: boolean;
    phase: MobileThinkingPhase;
  };
  stage: string | null;
  label: string | null;
  chunks: MobileOverlayChunk[];
  summaries: MobileThinkingSummary[];
  primarySummaryId: string | null;
  activeChunkId: string | null;
  startedAt: number | null;
  firstThinkingAt: number | null;
  firstAnswerTokenAt: number | null;
  finalizedAt: number | null;
  streaming: boolean;
  hasText: boolean;
  finalized: boolean;
};

/* ==============================
   Constants
============================== */

const reasoningKinds = new Set<ActivityKind>([
  ActivityKind.ANALYZING_INPUT,
  ActivityKind.ANALYZING_IMAGE,
  ActivityKind.PLANNING,
  ActivityKind.RESEARCHING,
  ActivityKind.RANKING_RESULTS,
  ActivityKind.FINALIZING,
  ActivityKind.IMAGE_ANALYSIS,
  ActivityKind.IMAGE_GENERATION,
  ActivityKind.PREPARING_STUDIO,
  ActivityKind.REASONING_SUMMARY,
]);

const initialSession: MobileStreamSession = {
  active: false,
  messageId: null,
  traceId: null,
  done: false,
  doneReason: null,
  mode: "NORMAL",
  thinkingProfile: null,
  thinkingSignalCount: 0,
  thinking: {
    active: false,
    phase: null,
  },
  stage: null,
  label: null,
  chunks: [],
  summaries: [],
  primarySummaryId: null,
  activeChunkId: null,
  startedAt: null,
  firstThinkingAt: null,
  firstAnswerTokenAt: null,
  finalizedAt: null,
  streaming: false,
  hasText: false,
  finalized: false,
};

/* ==============================
   Helpers
============================== */

function pickInline(item: ActivityItem, body: string | null): string | null {
  const inline = typeof item.inlineSummary === "string" ? item.inlineSummary.trim() : "";
  if (inline) return inline;

  const normalized = String(body ?? "").trim();
  if (!normalized) return null;
  const parts = normalized.match(/(.+?[.!?])(\s|$)/g);
  if (!parts || parts.length === 0) return null;
  return parts[parts.length - 1]?.trim() ?? null;
}

function upsertSummary(
  summaries: MobileThinkingSummary[],
  input: MobileThinkingSummary
): MobileThinkingSummary[] {
  const idx = summaries.findIndex((entry) => entry.id === input.id);
  if (idx === -1) {
    return [...summaries, input];
  }

  const next = summaries.slice();
  next[idx] = {
    ...next[idx],
    ...input,
  };
  return next;
}

function mergeChunkFromActivity(
  prev: MobileOverlayChunk | null,
  item: ActivityItem,
  index: number,
  op: ActivityEventPayload["op"]
): MobileOverlayChunk {
  const shouldReplaceBody = (item.meta as { replace?: unknown } | undefined)?.replace === true;
  const incomingBody = typeof item.body === "string" ? item.body : "";
  const previousBody = prev?.body ?? "";

  let body = incomingBody || prev?.body || null;

  if (op === "PATCH" && !shouldReplaceBody && previousBody && incomingBody) {
    body = previousBody.endsWith(incomingBody) ? previousBody : `${previousBody}${incomingBody}`;
  }

  const inline = pickInline(item, body);

  return {
    chunkId: item.id,
    index,
    at: typeof item.at === "number" ? item.at : Date.now(),
    source: "ACTIVITY",
    title: typeof item.title === "string" ? item.title : prev?.title ?? null,
    body,
    inline: inline ?? prev?.inline ?? null,
    kind: item.kind,
    meta:
      item.meta && typeof item.meta === "object"
        ? (item.meta as Record<string, unknown>)
        : prev?.meta ?? null,
    done: (() => {
      const status = item.status as string | undefined;
      return status === "OK" || status === "FAILED" || status === "CANCELLED";
    })(),
  };
}

function isReasoningKind(kind: unknown): kind is ActivityKind {
  if (kind === "REASONING_SUMMARY") return true;
  return reasoningKinds.has(kind as ActivityKind);
}

/* ==============================
   Zustand Store
============================== */

type StreamSessionStore = MobileStreamSession;

export const useMobileStreamSessionStore = create<StreamSessionStore>(() => ({
  ...initialSession,
}));

/* ==============================
   Imperative Actions (standalone functions)
   These can be called from outside React components.
============================== */

export function getMobileStreamSessionSnapshot(): MobileStreamSession {
  return useMobileStreamSessionStore.getState();
}

/**
 * @deprecated Use useMobileStreamSessionStore.subscribe() instead.
 * Kept for backward compatibility with useSyncExternalStore consumers.
 */
export function subscribeMobileStreamSession(listener: () => void) {
  return useMobileStreamSessionStore.subscribe(listener);
}

export function startMobileStreamSession(args: {
  messageId: string;
  mode: ThinkingProfile;
  thinkingProfile?: ThinkingProfile | null;
  traceId?: string | null;
}) {
  const now = Date.now();
  useMobileStreamSessionStore.setState({
    ...initialSession,
    active: true,
    messageId: args.messageId,
    traceId: args.traceId ?? null,
    mode: args.mode,
    thinkingProfile: args.thinkingProfile ?? args.mode,
    streaming: true,
    startedAt: now,
  });
}

export function resetMobileStreamSession() {
  useMobileStreamSessionStore.setState(initialSession);
}

export function endMobileStreamSession(finalizedAt?: number) {
  const ts = finalizedAt ?? Date.now();
  useMobileStreamSessionStore.setState((prev) => ({
    ...prev,
    active: false,
    streaming: false,
    finalized: true,
    done: true,
    finalizedAt: ts,
    thinking: {
      active: false,
      phase: "answer" as const,
    },
  }));
}

export function setMobileStreamDoneReason(reason: string | null) {
  useMobileStreamSessionStore.setState((prev) => ({
    ...prev,
    doneReason: reason,
  }));
}

export function applyMobileActivity(payload: ActivityEventPayload) {
  const item = payload.item;
  if (!item?.id) return;

  useMobileStreamSessionStore.setState((prev) => {
    const existing = prev.chunks;
    const hit = existing.find((chunk) => chunk.chunkId === item.id) ?? null;
    const nextIndex = hit?.index ?? existing.reduce((max, chunk) => Math.max(max, chunk.index), -1) + 1;
    const nextChunk = mergeChunkFromActivity(hit, item, nextIndex, payload.op);
    const nextChunks = hit
      ? existing.map((chunk) => (chunk.chunkId === item.id ? nextChunk : chunk))
      : [...existing, nextChunk].sort((a, b) => a.index - b.index);

    const reasoning = isReasoningKind(item.kind);
    const isNewChunk = hit === null;
    let summaries = prev.summaries;
    let primarySummaryId = prev.primarySummaryId;

    if (reasoning) {
      const summaryValue = nextChunk.inline ?? null;
      if (payload.op === "ADD" || payload.op === "PATCH") {
        summaries = upsertSummary(summaries, {
          id: nextChunk.chunkId,
          title: nextChunk.title,
          summary: summaryValue,
          status: "ACTIVE",
        });
      }

      if (nextChunk.done) {
        summaries = upsertSummary(summaries, {
          id: nextChunk.chunkId,
          title: nextChunk.title,
          summary: summaryValue,
          status: "DONE",
        });
      }

      if (item.kind === ActivityKind.REASONING_SUMMARY && item.status === "OK") {
        primarySummaryId = nextChunk.chunkId;
      }
    }

    const now = typeof item.at === "number" ? item.at : Date.now();
    const nextThinkingActive = prev.thinking.active || (reasoning && item.status !== "OK" && item.status !== "FAILED");

    return {
      ...prev,
      active: true,
      streaming: true,
      chunks: nextChunks,
      summaries,
      primarySummaryId,
      label:
        item.kind === ActivityKind.REASONING_SUMMARY && item.status === "OK"
          ? nextChunk.title
          : prev.label,
      thinkingSignalCount: reasoning && isNewChunk ? prev.thinkingSignalCount + 1 : prev.thinkingSignalCount,
      firstThinkingAt: prev.firstThinkingAt ?? (reasoning ? now : null),
      thinking: {
        active: nextThinkingActive,
        phase: nextThinkingActive ? ("thinking" as const) : prev.thinking.phase,
      },
      activeChunkId: reasoning ? nextChunk.chunkId : prev.activeChunkId,
    };
  });
}

export function syncMobileStreamSessionFromState(state: StreamUIState) {
  const now = Date.now();
  useMobileStreamSessionStore.setState((prev) => {
    const profile = state.thinkingProfile ?? prev.thinkingProfile ?? prev.mode;
    const hasText = state.text.trim().length > 0;
    const finalized = Boolean(state.finalized || state.done);
    const stage = state.stage ?? prev.stage;

    const nextPhase: MobileThinkingPhase =
      finalized || hasText
        ? "answer"
        : stage === "thinking"
        ? "thinking"
        : stage === "analyzing_image"
        ? "analyzing"
        : prev.thinking.phase;

    return {
      ...prev,
      traceId: state.traceId ?? prev.traceId,
      thinkingProfile: profile,
      mode: profile,
      stage,
      streaming: !finalized && (state.kind !== "IDLE" && state.kind !== "DONE"),
      done: Boolean(state.done),
      hasText,
      finalized,
      finalizedAt: finalized ? prev.finalizedAt ?? now : prev.finalizedAt,
      firstAnswerTokenAt: hasText ? prev.firstAnswerTokenAt ?? now : prev.firstAnswerTokenAt,
      thinking: {
        active: finalized ? false : prev.thinking.active,
        phase: nextPhase,
      },
    };
  });
}

export function getMobileReasoningChunks() {
  const session = useMobileStreamSessionStore.getState();
  return session.chunks.filter((chunk) => isReasoningKind(chunk.kind));
}

export function getMobileStreamSessionApi() {
  return {
    start: startMobileStreamSession,
    reset: resetMobileStreamSession,
    end: endMobileStreamSession,
    applyActivity: applyMobileActivity,
    syncFromStreamState: syncMobileStreamSessionFromState,
    getSnapshot: getMobileStreamSessionSnapshot,
    subscribe: subscribeMobileStreamSession,
  };
}
