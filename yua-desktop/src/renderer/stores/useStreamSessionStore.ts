import { create } from "zustand";
import { StreamStage } from "yua-shared/stream/stream-stage";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import type { SuggestionPayload } from "@/types/suggestion";

import {
  ActivityKind,
  type ActivityEventPayload,
  type ActivityItem,
  type ActivitySection,
} from "yua-shared/stream/activity";
import {
  getThinkingContract,
  resolveSyntheticPhase,
} from "yua-shared/types/thinkingProfile";
export type ThinkingMode = ThinkingProfile; // FAST | NORMAL | DEEP

export type OverlayChunkSource = "STAGE" | "NARRATION" | "ACTION" | "ACTIVITY";


export type ThinkingSummaryStatus = "ACTIVE" | "DONE";

export type ThinkingSummaryItem = {
  id: string;
  tick: number;
  title: string | null;
  summary: string | null;
  status: ThinkingSummaryStatus;
  canExpand: boolean;
  confidence?: number;
  seq?: number;
  updatedAt?: number;
};

type ThinkingPhase = "thinking" | "analyzing" | "answer" | null;

export type ToolEventKind = "SEARCH" | "BROWSE" | "VERIFY" | "UNKNOWN";
export type ToolEvent = {
  id: string;
  kind: ToolEventKind;
  url: string | null;
  host: string | null;
  at: number;
};

export type OverlayChunk = {
  chunkId: string;
  index: number;
  groupIndex?: number;
  at: number;
  source: OverlayChunkSource;
  title: string | null;
  body: string | null;
  inline: string | null;
  snippet?: string;
  sections?: ActivitySection[];
  kind?: ActivityKind | string;
  metaTool?: string | null;
  meta?: any;
  sources?: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
  tool?: {
    kind: string;
    url?: string;
    query?: string;
    at: number;
  } | null;
  artifact?: import("yua-shared/tool/tool-artifact.types").ToolArtifact | null;
  done: boolean;
  text: string;
};

export const selectPrimaryTitle = (s: { session: StreamSession }) => {
  const id = s.session.primarySummaryId;
  if (!id) return null;
  return s.session.summaries.find((x) => x.id === id)?.title ?? null;
};


let summaryTick = 0;


export function upsertSummary(
  prev: ThinkingSummaryItem[],
  next: Omit<ThinkingSummaryItem, "tick">
): ThinkingSummaryItem[] {
  const idx = prev.findIndex((s) => s.id === next.id);
  if (idx === -1) {
    return [
      ...prev,
      { ...next, tick: ++summaryTick },
    ];
  }

  const copy = prev.slice();
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function mergeById<T extends { chunkId: string }>(prev: T[], next: T[]) {
  if (!Array.isArray(next)) return prev;
  if (next.length === 0) return prev;
  const map = new Map<string, T>();
  for (const p of prev) map.set(p.chunkId, p);
  for (const n of next) map.set(n.chunkId, { ...(map.get(n.chunkId) as any), ...n });
  return Array.from(map.values()).sort((a, b) => (a as any).at - (b as any).at);
}

function mergeTools(prev: ToolEvent[], next: ToolEvent[]) {
  if (!Array.isArray(next)) return prev;
  if (next.length === 0) return prev;
  const map = new Map<string, ToolEvent>();
  for (const p of prev) map.set(p.id, p);
  for (const n of next) map.set(n.id, { ...map.get(n.id), ...n } as ToolEvent);
  return Array.from(map.values()).sort((a, b) => a.at - b.at);
}

// Activity PATCH Buffer (ChatGPT-style rhythm)
const activityBuffer = new Map<string, ActivityEventPayload>();
let activityFlushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 80;

type StreamSession = {
  active: boolean;
  messageId: string | null;
  mode: ThinkingMode;
  thinkingProfile: ThinkingProfile | null;
  deepVariant?: "STANDARD" | "EXPANDED";
  modelId?: string | null;
  unlockRequested: boolean;
  unlockRequestedAt: number | null;
  thinkingSignalCount: number;
  thinking: {
    active: boolean;
    phase: ThinkingPhase;
  };
  chunks: OverlayChunk[];
  tools: ToolEvent[];
  suggestions?: SuggestionPayload;
  label: string | null;
  summaries: ThinkingSummaryItem[];
  primarySummaryId?: string | null;
  drawerUserClosed?: boolean;
  thinkingScope: "MESSAGE" | "DRAWER";
  thinkingCompletedAt: number | null;
  minSkeletonUntil?: number | null;
  minThinkingMs?: number;
  answerVisible: boolean;
  startedAt: number | null;
  serverStartedAt?: number | null;
  firstThinkingAt: number | null;
  firstAnswerTokenAt: number | null;
  streaming: boolean;
  hasText: boolean;
  allowAnswerRender: boolean;
  finalized: boolean;
  finalizedAt: number | null;
  actionKind: string | null;
  actionUrl: string | null;
  stage: StreamStage | null;
  stageNarration: string;
  now: number | null;
  activeChunkId: string | null;
  imageAnalyzing: boolean;
  debugDeepMessageId?: string | null;
};

function pickInlineFromActivity(item: ActivityItem, body: string) {
  const inline =
    (typeof item.inlineSummary === "string" && item.inlineSummary.trim()) ||
    "";
  if (inline) return inline;
  const text = String(body ?? "").trim();
  if (!text) return "";
  const match = text.match(/(.+?[.!?])(\s|$)/g);
  if (!match || match.length === 0) return "";
  return match[match.length - 1].trim();
}

function applyActivityInternal(
  state: { session: StreamSession } & Record<string, any>,
  payload: ActivityEventPayload
) {
  if (state.session?.finalized === true) {
    console.warn("[STORE][ACTIVITY_IGNORED_FINALIZED]");
    return state;
  }
  const s = state;
  const { op, item } = payload;

  const now = item?.at ?? Date.now();
  const profile =
    (s.session.thinkingProfile ?? s.session.mode ?? "NORMAL") as ThinkingProfile;

  const contract = getThinkingContract(profile);

  const withinGrace =
    s.session.finalizedAt != null &&
    now <= s.session.finalizedAt + contract.postFinalGraceMs;

  const effective = (s.session.thinkingProfile ?? s.session.mode);
  const metaProfile =
    typeof (item as any)?.meta?.thinkingProfile === "string"
      ? (item as any).meta.thinkingProfile
      : null;
  const isDeep =
    effective === "DEEP" || metaProfile === "DEEP";

  const opStr = String(op);
  const isStartish =
    opStr === "ADD" ||
    opStr === "PATCH" ||
    opStr === "REPLACE" ||
    opStr === "UPSERT" ||
    opStr === "UPDATE";
  const statusStr = String(item?.status ?? "");

  const isRunning =
    statusStr === "RUNNING" ||
    statusStr === "IN_PROGRESS" ||
    statusStr === "STARTED" ||
    item?.status == null;
  const isReasoningKind =
    item?.kind === ActivityKind.ANALYZING_INPUT ||
    item?.kind === ActivityKind.ANALYZING_IMAGE ||
    item?.kind === ActivityKind.PLANNING ||
    item?.kind === ActivityKind.RESEARCHING ||
    item?.kind === ActivityKind.RANKING_RESULTS ||
    item?.kind === ActivityKind.FINALIZING ||
    item?.kind === ActivityKind.IMAGE_ANALYSIS ||
    item?.kind === ActivityKind.IMAGE_GENERATION ||
    item?.kind === ActivityKind.PREPARING_STUDIO ||
    item?.kind === ActivityKind.REASONING_SUMMARY ||
    item?.kind === ActivityKind.QUANT_ANALYSIS ||
    (typeof (item as any)?.meta?.tool === "string" &&
      (item as any).meta.tool === "REASONING_SUMMARY");

  const shouldActivateThinking =
    isDeep &&
    isStartish &&
    isRunning &&
    isReasoningKind;

  const shouldMarkStreaming =
    isStartish && isRunning;

  const isThinkingDone =
    isDeep &&
    item?.status === "OK" &&
    isReasoningKind;

  const minThinkingMs = s.session.minThinkingMs ?? 0;
  const minThinkingDoneAt =
    s.session.firstThinkingAt != null
      ? s.session.firstThinkingAt + minThinkingMs
      : null;
  const shouldDelayComplete =
    isThinkingDone &&
    minThinkingDoneAt != null &&
    now < minThinkingDoneAt;

  const nextThinkingSignalCount =
    isDeep && op === "ADD" && isReasoningKind
      ? s.session.thinkingSignalCount + 1
      : s.session.thinkingSignalCount;

  const existing = s.session.chunks;
  let itemForMerge = item;
  if (isReasoningKind && s.session.activeChunkId) {
    const active = existing.find(
      (c) => c.chunkId === s.session.activeChunkId
    );
    const incomingDelta =
      typeof item?.body === "string" ? item.body : "";
    const isPatch = op === "PATCH";
    const shouldReplace = item?.meta?.replace === true;
    if (active && active.done === false && incomingDelta && isPatch && !shouldReplace) {
      const currentBody = active.body ?? "";
      if (!currentBody.endsWith(incomingDelta)) {
        itemForMerge = {
          ...item,
          body: `${currentBody}${incomingDelta}`,
        };
      }
    }
  }
  const hit = existing.find((c) => c.chunkId === item.id);

  const nextIndex =
    hit?.index ??
    (existing.reduce((m, c) => Math.max(m, c.index), -1) + 1);

  const nextChunk = mergeChunkFromActivity(
    hit ?? null,
    itemForMerge,
    nextIndex,
    op
  );

  const chunks = hit
    ? existing.map((c) => (c.chunkId === item.id ? nextChunk : c))
    : [...existing, nextChunk].sort((a, b) => a.index - b.index);

  const allowInlineUpdate =
    !s.session.finalized &&
    !s.session.allowAnswerRender;

  let nextSummaries = s.session.summaries;
  let nextPrimary = s.session.primarySummaryId ?? null;
  if (isReasoningKind) {
    const canPromotePrimary =
      item?.kind === ActivityKind.REASONING_SUMMARY &&
      item?.status === "OK";
    const isActiveOp =
      op === "ADD" ||
      op === "PATCH";
    if (isActiveOp) {
      nextSummaries = upsertSummary(nextSummaries, {
        id: nextChunk.chunkId,
        title: nextChunk.title ?? "",
        summary: nextChunk.inline
          ? nextChunk.inline.split(".")[0] + "."
          : "",
        status: "ACTIVE",
        canExpand: true,
      });
      if (canPromotePrimary) {
        nextPrimary = nextChunk.chunkId;
      }
    }
    if (item?.status === "OK" || item?.status === "FAILED") {
      nextSummaries = upsertSummary(nextSummaries, {
        id: nextChunk.chunkId,
        title: nextChunk.title ?? "",
        summary: nextChunk.inline
          ? nextChunk.inline.split(".")[0] + "."
          : "",
        status: "DONE",
        canExpand: true,
        confidence:
          typeof (item as any)?.meta?.confidence === "number"
            ? (item as any).meta.confidence
            : undefined,
      });
      if (canPromotePrimary) {
        nextPrimary = nextChunk.chunkId;
      }
    }
  }

  const firstChip =
    Array.isArray((item as any)?.chips) && (item as any).chips.length > 0
      ? (item as any).chips[0]
      : null;

  const chipUrl =
    typeof firstChip?.url === "string" ? firstChip.url : null;

  if (
    chipUrl &&
    (
      item?.kind === ActivityKind.SEARCHING ||
      item?.kind === ActivityKind.TOOL ||
      (item as any)?.meta?.tool === "SEARCH"
    )
  ) {
    nextChunk.tool = {
      kind: String(item?.kind ?? "UNKNOWN"),
      url: chipUrl ?? undefined,
      query: (item as any)?.meta?.query ?? undefined,
      at: now,
    };
  }

  const metaSourcesRaw =
    item.meta && typeof item.meta === "object"
      ? (item.meta as Record<string, unknown>).sources
      : undefined;
  const rawSources =
    Array.isArray(metaSourcesRaw) && metaSourcesRaw.length > 0
      ? metaSourcesRaw
      : Array.isArray(item?.chips) && item.chips.length > 0
      ? item.chips
      : [];

  const prevSources =
    Array.isArray(hit?.sources) && hit.sources.length > 0
      ? hit.sources
      : undefined;

  if (!prevSources && rawSources.length > 0) {
    const seen = new Set<string>();

    const mapped: {
      id: string;
      label: string;
      url: string;
      host?: string | null;
    }[] = [];

    for (let i = 0; i < rawSources.length; i++) {
      const s = rawSources[i] as Record<string, unknown>;

      const url =
        typeof s.url === "string" && s.url.trim().length > 0
          ? s.url
          : null;

      if (!url) continue;

      let host: string | null =
        typeof s.host === "string" ? s.host : null;

      if (!host) {
        try {
          host = new URL(url).hostname;
        } catch {
          host = null;
        }
      }

      const label =
        typeof s.label === "string" && s.label.trim().length > 0
          ? s.label
          : host ?? url;

      const id =
        typeof s.id === "string" && s.id.length > 0
          ? s.id
          : `${item.id}:${i}`;

      const key = url ?? id;
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      mapped.push({
        id,
        label,
        url,
        host,
      });
    }

    nextChunk.sources = mapped.length > 0 ? mapped : undefined;
  } else if (prevSources) {
    nextChunk.sources = prevSources;
  }
  const nextThinking =
    shouldActivateThinking
      ? {
          ...s.session.thinking,
          active: true,
          phase: s.session.thinking.phase ?? "thinking",
        }
      : s.session.thinking;

  console.log("[THINKING][ACTIVITY]", {
    id: item?.id,
    op,
    kind: item?.kind,
    status: item?.status,
    thinkingActive: nextThinking.active,
  });
  if (s.session.thinking.active !== nextThinking.active) {
    console.log("[THINKING][ACTIVE]", {
      from: s.session.thinking.active,
      to: nextThinking.active,
      source: "applyActivity",
    });
  }
  if (s.session.thinking.phase !== nextThinking.phase) {
    console.log("[THINKING][PHASE]", {
      from: s.session.thinking.phase,
      to: nextThinking.phase,
      source: "applyActivity",
    });
  }

  return {
    session: {
      ...s.session,
      thinkingSignalCount: nextThinkingSignalCount,
      active: true,
      streaming: shouldMarkStreaming ? true : s.session.streaming,
      firstThinkingAt:
        shouldActivateThinking &&
        s.session.thinking.active === false &&
        !s.session.firstThinkingAt
          ? now
          : s.session.firstThinkingAt,
      minSkeletonUntil:
        shouldActivateThinking
          ? now + 10000
          : s.session.minSkeletonUntil,
      now,
      chunks,
      label:
        item?.kind === ActivityKind.REASONING_SUMMARY &&
        item?.status === "OK"
          ? nextChunk.title
          : s.session.label,
      summaries: nextSummaries,
      primarySummaryId: nextPrimary,
      thinking: nextThinking,
      activeChunkId:
        isReasoningKind && isRunning && !s.session.activeChunkId
          ? nextChunk.chunkId
          : s.session.activeChunkId,

      thinkingCompletedAt:
        isThinkingDone && !s.session.thinkingCompletedAt
          ? (shouldDelayComplete ? minThinkingDoneAt ?? now : now)
          : s.session.thinkingCompletedAt,
    },
  };
}

function mergeChunkFromActivity(
  prev: OverlayChunk | null,
  item: ActivityItem,
  index: number,
  op: ActivityEventPayload["op"] | "UPDATE"
): OverlayChunk {
  let title =
    (typeof item.title === "string" && item.title.trim()) ||
    prev?.title ||
    "";

  const metaGroupIndex =
    typeof item.meta?.groupIndex === "number"
      ? item.meta.groupIndex
      : undefined;
  const groupIndex =
    metaGroupIndex ??
    (typeof item.id === "string" && item.id.startsWith("search_live:")
      ? 0
      : typeof item.id === "string" && item.id.includes(":")
      ? Number(item.id.split(":").pop())
      : undefined);

  let body =
    typeof item.body === "string" && item.body.trim().length > 0
      ? item.body
      : prev?.body ?? "";

  const metaTool =
    typeof item.meta?.tool === "string"
      ? item.meta.tool
      : null;
  const query =
    typeof item.meta?.query === "string"
      ? item.meta.query
      : "";
  const isSearchKind =
    item.kind === ActivityKind.SEARCHING ||
    metaTool === "SEARCH";

  if (isSearchKind) {
    title = "";
    if (!body && query) {
      body = query;
    }
  }

  const inlineValue = pickInlineFromActivity(item, body);

  const inline =
    typeof inlineValue === "string" && inlineValue.length > 0
      ? inlineValue
      : prev?.inline ?? "";

  const sections =
    Array.isArray(item.sections)
      ? (item.sections.length === 0 ? prev?.sections : item.sections)
      : prev?.sections;

  const done =
    item.status === "OK" ||
    item.status === "FAILED";

  return {
    chunkId: item.id,
    index,
    groupIndex,
    at: item.at ?? Date.now(),
    source: "ACTIVITY",
    title,
    body,
    inline,
    sections,
    kind: item.kind,
    metaTool,
    meta: item.meta ?? prev?.meta ?? null,
    artifact: (item as any).artifact ?? prev?.artifact ?? null,
    done,
    text: body || inline || title,
  };
}

const initialSession: StreamSession = {
  active: false,
  messageId: null,
  mode: "NORMAL",
  thinkingProfile: null,
  deepVariant: "STANDARD",
  modelId: null,
  unlockRequested: false,
  unlockRequestedAt: null,
  thinkingSignalCount: 0,
  chunks: [],
  activeChunkId: null,
  imageAnalyzing: false,
  debugDeepMessageId: null,
  tools: [],
  label: null,

  drawerUserClosed: false,
  thinkingScope: "MESSAGE",
  startedAt: null,
  firstThinkingAt: null,
  firstAnswerTokenAt: null,
  thinkingCompletedAt: null,
  minSkeletonUntil: null,
  summaries: [],
  primarySummaryId: null,
  answerVisible: false,
  streaming: false,
  hasText: false,
  allowAnswerRender: false,
  finalized: false,
  finalizedAt: null,
  thinking: { active: false, phase: null },
  actionKind: null,
  actionUrl: null,
  stage: null as StreamStage | null,
  stageNarration: "",
  now: null,
};

export const useStreamSessionStore = create<{
  session: StreamSession;
  unlockAnswer: () => void;
  _rehydrateDrawer: () => void;
  hydrateFromSnapshot: (snapshot: any) => void;
  start: (args: {
    messageId: string;
    mode: ThinkingMode;
    thinkingProfile: ThinkingProfile | null;
    label?: string | null;
  }) => void;
  tick: (now?: number) => void;
  update: (patch: Partial<StreamSession>) => void;
  applyActivity: (payload: ActivityEventPayload) => void;
  appendReasoningChunk: (block: NonNullable<import("yua-shared/stream/types").StreamPayload["block"]>) => void;
  markLastReasoningDone: () => void;
  end: (args?: { finalizedAt?: number }) => void;
  reset: () => void;
}>((set) => ({
  session: initialSession,

  _rehydrateDrawer: () => {
    const { session } = useStreamSessionStore.getState();
    if (!session.messageId) return;

    const key = `yua:drawerClosed:${session.messageId}`;
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(key);

    if (raw === "1") {
      set((s) => ({
        session: {
          ...s.session,
          drawerUserClosed: true,
        },
      }));
    }
  },

  hydrateFromSnapshot: (snapshot: any) =>
    set((s) => {
      if (!snapshot) return s;
      if (s.session.active || s.session.streaming) return s;
      if (s.session.finalized && s.session.chunks.length > 0) return s;
      const raw = Array.isArray(snapshot?.chunks) ? snapshot.chunks : [];
      const chunks = raw.map((c: any, i: number) => ({
        sources: Array.isArray(c?.meta?.sources)
          ? c.meta.sources
              .filter((src: any) => typeof src?.url === "string")
              .map((src: any, idx: number) => {
                const url = src.url as string;
                let host: string | null = typeof src?.host === "string" ? src.host : null;
                if (!host) {
                  try { host = new URL(url).hostname; } catch { host = null; }
                }
                const label =
                  typeof src?.label === "string" && src.label.trim().length > 0
                    ? src.label
                    : host ?? url;
                const id =
                  typeof src?.id === "string" && src.id.length > 0
                    ? src.id
                    : `${c.id ?? "snap"}:${i}:${idx}`;
                return { id, label, url, host };
              })
          : undefined,
        chunkId: c.id,
        index: i,
        groupIndex: c.meta?.groupIndex,
        at: c.startedAt ?? Date.now(),
        source: "ACTIVITY" as const,
        title: c.title ?? null,
        body: c.body ?? null,
        inline: c.inlineSummary ?? null,
        kind: c.kind,
        done:
          c.status === "OK" ||
          c.status === "FAILED" ||
          c.status === "CANCELLED",
        text: c.body ?? c.title ?? "",
        meta: c.meta ?? null,
        artifact: (c as any).artifact ?? null,
      }));
      return {
        session: {
          ...initialSession,
          active: false,
          streaming: false,
          finalized: true,
          hasText: true,
          messageId:
            typeof snapshot.messageId === "string"
              ? snapshot.messageId
              : s.session.messageId,
          firstAnswerTokenAt:
            typeof snapshot.finalizedAt === "number"
              ? snapshot.finalizedAt
              : Date.now(),
          finalizedAt:
            typeof snapshot.finalizedAt === "number"
              ? snapshot.finalizedAt
              : Date.now(),
          startedAt:
            typeof snapshot.startedAt === "number"
              ? snapshot.startedAt
              : null,
          thinkingProfile:
            typeof snapshot.thinkingProfile === "string"
              ? snapshot.thinkingProfile
              : s.session.thinkingProfile,
          mode:
            typeof snapshot.thinkingProfile === "string"
              ? snapshot.thinkingProfile
              : s.session.mode,
          chunks,
          tools: Array.isArray(snapshot.tools) ? snapshot.tools : [],
          summaries: Array.isArray(snapshot.summaries) ? snapshot.summaries : [],
          primarySummaryId:
            typeof snapshot.primarySummaryId === "string"
              ? snapshot.primarySummaryId
              : null,
          thinking: { active: false, phase: "answer" },
        },
      };
    }),

  unlockAnswer: () =>
    set((s) => {
      if (s.session.allowAnswerRender) return s;
      return {
        session: {
          ...s.session,
          unlockRequested: true,
          unlockRequestedAt: Date.now(),
          allowAnswerRender: true,
          thinking: {
            active: false,
            phase: "answer",
          },
        },
      };
    }),

  markLastReasoningDone: () =>
    set((s) => {
      if (!s.session.chunks.length) return s;

      const lastIndex = s.session.chunks.length - 1;
      const last = s.session.chunks[lastIndex];

      if (last.kind !== "REASONING_SUMMARY") return s;

      const updated = {
        ...last,
        done: true,
      };

      const nextChunks = [...s.session.chunks];
      nextChunks[lastIndex] = updated;

      return {
        ...s,
        session: {
          ...s.session,
          chunks: nextChunks,
        },
      };
    }),

  start: ({ messageId, mode, thinkingProfile, label = null }) =>
    set((s) => {
      if (s.session.messageId === messageId && s.session.chunks.length > 0) {
        console.log("[STREAM][START][SKIP] existing session preserved");
        return s;
      }

      return {
        session: {
          ...initialSession,
          drawerUserClosed: false,
          thinkingCompletedAt: null,
          active: true,
          messageId,
          mode,
          thinkingProfile:
            thinkingProfile ??
            (mode === "DEEP" ? "DEEP" : "NORMAL"),
          debugDeepMessageId: mode === "DEEP" ? messageId : null,
          deepVariant: "STANDARD",
          modelId: null,
          label,
          startedAt: Date.now(),
          minThinkingMs:
            (thinkingProfile ?? (mode === "DEEP" ? "DEEP" : "NORMAL")) === "DEEP"
              ? 1200
              : 0,
          now: Date.now(),
          streaming: true,
          allowAnswerRender: false,
          thinking: { active: false, phase: null },
          answerVisible: false,
        },
      };
    }),

  tick: (nowArg) =>
    set((s) => {
      if (s.session.finalized) return s;
      const now = nowArg ?? Date.now();
      const startedAt = s.session.startedAt;
      if (!startedAt) return s;

      const profile = (s.session.thinkingProfile ?? s.session.mode ?? "NORMAL") as ThinkingProfile;
      const contract = getThinkingContract(profile);
      const realElapsedMs = Math.max(0, now - startedAt);

      const phase = resolveSyntheticPhase({
        finalized: s.session.finalized,
        hasText: s.session.hasText,
        realElapsedMs,
        contract,
      });

      const nextPhase: ThinkingPhase =
        phase === "thinking" ? "thinking" :
        phase === "analyzing" ? "analyzing" :
        phase === "answer" ? "answer" :
        null;

      const shouldDeactivateThinking =
        s.session.thinking.active &&
        s.session.thinkingCompletedAt != null &&
        now >= s.session.thinkingCompletedAt;

      const allowUnlock =
        s.session.unlockRequested &&
        !s.session.allowAnswerRender &&
        !s.session.thinking.active;

      const unlockDelayMs = 240;
      const unlockReady =
        allowUnlock &&
        s.session.unlockRequestedAt != null &&
        now - s.session.unlockRequestedAt >= unlockDelayMs;

      return {
        session: {
          ...s.session,
          now,
          allowAnswerRender: unlockReady ? true : s.session.allowAnswerRender,
          thinking: {
            ...s.session.thinking,
            active: shouldDeactivateThinking ? false : s.session.thinking.active,
            phase: nextPhase,
          },
        },
      };
    }),

  update: (patch) =>
    set((s) => {
      const nextSession = {
        ...s.session,
        ...patch,
        thinking: (patch as any).thinking
          ? { ...s.session.thinking, ...(patch as any).thinking }
          : s.session.thinking,
        chunks: Array.isArray((patch as any).chunks)
          ? (patch as any).chunks.length > 0
            ? mergeById(s.session.chunks, (patch as any).chunks)
            : s.session.chunks
          : s.session.chunks,
        tools: Array.isArray((patch as any).tools)
          ? mergeTools(s.session.tools, (patch as any).tools)
          : s.session.tools,
        summaries: Array.isArray((patch as any).summaries)
          ? (patch as any).summaries.length === 0
            ? s.session.summaries
            : (patch as any).summaries
          : s.session.summaries,
        firstThinkingAt:
          (patch as any).thinking?.active === true &&
          s.session.thinking.active === false &&
          !s.session.firstThinkingAt
            ? Date.now()
            : s.session.firstThinkingAt,
        firstAnswerTokenAt:
          (patch as any).hasText === true &&
          s.session.hasText === false &&
          !s.session.firstAnswerTokenAt
            ? Date.now()
            : s.session.firstAnswerTokenAt,
      };

      if (s.session.thinking.active !== nextSession.thinking.active) {
        console.log("[THINKING][ACTIVE]", {
          from: s.session.thinking.active,
          to: nextSession.thinking.active,
        });
      }
      if (s.session.thinking.phase !== nextSession.thinking.phase) {
        console.log("[THINKING][PHASE]", {
          from: s.session.thinking.phase,
          to: nextSession.thinking.phase,
        });
      }
      if (s.session.finalized !== nextSession.finalized) {
        console.log("[THINKING][FINALIZED]", {
          from: s.session.finalized,
          to: nextSession.finalized,
        });
      }
      if (s.session.allowAnswerRender !== nextSession.allowAnswerRender) {
        console.log("[THINKING][ALLOW_ANSWER_RENDER]", {
          from: s.session.allowAnswerRender,
          to: nextSession.allowAnswerRender,
        });
      }
      return { session: nextSession };
    }),

  applyActivity: (payload) => {
    const id = payload?.item?.id;
    if (!id) return;

    activityBuffer.set(id, payload);

    if (activityFlushTimer) return;

    activityFlushTimer = setTimeout(() => {
      const entries = Array.from(activityBuffer.values());
      activityBuffer.clear();
      activityFlushTimer = null;

      set((s) => {
        let nextState = s as { session: StreamSession };
        for (const p of entries) {
          nextState = applyActivityInternal(nextState, p);
        }
        return nextState;
      });
    }, FLUSH_INTERVAL_MS);
  },

  appendReasoningChunk: (block) =>
    set((s) => {
      if (!block) return s;
      const now = Date.now();

      const index =
        typeof block.groupIndex === "number"
          ? block.groupIndex
          : s.session.chunks.reduce((m, c) => Math.max(m, c.index), -1) + 1;
      const title = (block as any)?.title ?? null;
      const body = (block as any)?.body ?? null;
      const inline = (block as any)?.inlineSummary ?? null;
      const chunkId = (block as any)?.id ?? `reasoning:${now}:${index}`;
      if (
        typeof (block as any)?.groupIndex === "number" &&
        s.session.chunks.some(
          (c) =>
            c.source === "ACTIVITY" &&
            c.kind === ActivityKind.REASONING_SUMMARY &&
            c.groupIndex === (block as any).groupIndex
        )
      ) {
        return s;
      }
      if (s.session.chunks.some((c) => c.chunkId === chunkId)) {
        return s;
      }
      const nextChunk: OverlayChunk = {
        chunkId,
        index,
        groupIndex: (block as any)?.groupIndex,
        at: now,
        source: "NARRATION",
        title,
        body,
        inline,
        kind: "REASONING_SUMMARY",
        done: false,
        text: body ?? title ?? "",
      };

      const chunks = [...s.session.chunks, nextChunk];

      return {
        session: {
          ...s.session,
          active: true,
          streaming: true,
          thinking: {
            ...s.session.thinking,
            active: true,
          },
          chunks,
          activeChunkId: chunkId,
        },
      };
    }),

  end: (args) =>
    set((s) => {
      const now = Date.now();
      const finalizedAt = args?.finalizedAt ?? now;
      const profile =
        (s.session.thinkingProfile ?? s.session.mode ?? "NORMAL") as ThinkingProfile;
      const isDeep = profile === "DEEP";
      const minThinkingMs = s.session.minThinkingMs ?? 0;
      const minThinkingDoneAt =
        s.session.firstThinkingAt != null
          ? s.session.firstThinkingAt + minThinkingMs
          : null;
      const shouldHoldThinking =
        isDeep &&
        s.session.thinking.active &&
        minThinkingDoneAt != null &&
        now < minThinkingDoneAt;
      const thinkingCompletedAt =
        s.session.thinkingCompletedAt ??
        (minThinkingDoneAt != null && minThinkingDoneAt > now
          ? minThinkingDoneAt
          : now);
      if (s.session.finalized !== true) {
        console.log("[THINKING][FINALIZE]", {
          finalized: true,
          prevThinkingActive: s.session.thinking.active,
          prevPhase: s.session.thinking.phase,
          prevAllowAnswerRender: s.session.allowAnswerRender,
        });
      }
      return {
        session: {
          ...s.session,
          streaming: false,
          finalized: true,
          finalizedAt,
          answerVisible: shouldHoldThinking ? s.session.answerVisible : true,
          thinking: shouldHoldThinking
            ? s.session.thinking
            : {
                ...s.session.thinking,
                active: false,
                phase: "answer",
              },
          minSkeletonUntil:
            s.session.minSkeletonUntil &&
            now < s.session.minSkeletonUntil
              ? s.session.minSkeletonUntil
              : null,
          thinkingCompletedAt,
          now,
        },
      };
    }),

  reset: () =>
    set((s) => ({
      session: {
        ...s.session,
        streaming: false,
        thinking: {
          ...s.session.thinking,
          active: false,
        },
      },
    })),
}));

// DEBUG: expose store in dev mode
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as any).__STREAM__ = useStreamSessionStore;
}
