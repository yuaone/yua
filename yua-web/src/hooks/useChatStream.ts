  "use client";

  import { useCallback, useRef } from "react";
  import { useRouter } from "next/navigation";
  import { v4 as uuidv4 } from "uuid";
  import { StreamClient } from "yua-shared/stream/stream-client";
 import { useSidebarStore } from "@/store/useSidebarStore";
import {
  createInitialStreamState,
  reduceStreamState,
  StreamUIStateKind,
  type StreamUIState,
} from "yua-shared/stream/stream-reducer";
import {
  type ActivityEventPayload,
} from "yua-shared/stream/activity";
import { StreamStage } from "yua-shared/stream/stream-stage";
import {
  useStreamSessionStore,
} from "@/store/useStreamSessionStore";
  import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/store/useChatStore";
import type { AssistantThinkingMeta, ChatMessageWithMeta } from "@/store/useChatStore";
  import { useStudioContext } from "@/store/useStudioContext";
  import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
  import type { StreamPayload, StreamEventKind } from "yua-shared/stream/types";
  import { useMemoryIndicator } from "@/store/useMemoryIndicator";
import type { SuggestionPayload } from "@/types/suggestion";
import type { SuggestionAffordance } from "@/lib/suggestionTypes";
import { useThinkingProfile } from "@/hooks/src/hooks/useThinkingProfile";
import {
  getThinkingProfile,
  getThinkingContract,
  type ThinkingProfile,
} from "yua-shared/types/thinkingProfile";
import { useSidebarData } from "@/hooks/useSidebarData";
  /* =========================
    Types
  ========================= */
  type SendPromptArgs = {
    threadId: number;
    content: string;
    attachments?: AttachmentMeta[];
    thinkingProfile?: ThinkingProfile;
    meta?: any;
  };

  type StopReason = "error" | "user";


  /* =========================
    Helpers
  ========================= */
  

  /**
   * 🔥 C안: 요약형 자동 제목 (SSOT)
   * - 첫 문장 ❌
   * - 질문 / 요청 의도 중심
   * - 1회 생성, 이후 절대 덮어쓰기 ❌
   * 
   */


  function normalizeSuggestionPayload(
  input: any
): SuggestionPayload | null {
  const items = input?.items;
  const keys = input?.keys;

  const rawItems: any[] =
    Array.isArray(items)
      ? items
      : Array.isArray(keys)
      ? keys.map((k: string, i: number) => ({ id: `k${i}`, label: k }))
      : [];

  if (rawItems.length === 0) return null;

  // 🔒 SSOT: 서버 contract가 확정되기 전까지는 "알 수 없는 key → EXPAND" 같은 강제 승격 금지
  // - 이게 바로 'suggestion fallback 문구'가 튀는 직접 원인
  // - 지금은 안전하게: 확실한 affordance만 통과
  const toAffordance = (label: string): SuggestionAffordance | null => {
    if (label === "EXPAND" || label === "CLARIFY" || label === "BRANCH") {
      return label;
    }
    return null;
  };

  const normalizedItems = rawItems
    .map((it, i) => {
      const rawLabel = String(it.label ?? "");
      const aff = toAffordance(rawLabel);
      if (!aff) return null;
      return {
        id: String(it.id ?? `s${i}`),
        label: aff,
        intent: it.intent ?? "CONTINUE",
        meta: { ...(it.meta ?? {}), rawLabel },
      };
    })
    .filter(Boolean) as SuggestionPayload["items"];

  if (normalizedItems.length === 0) return null;

  return { items: normalizedItems };
}

  function normalizeStreamingArtifacts(text: string, streaming: boolean): string {
  if (!text) return "";

  if (streaming) return text;

  // ✅ SSOT: 절대 개행(\n)을 제거하지 않는다.
  // - trimEnd()는 \n 까지 날려서 fence/#/branch 라인 시작이 깨짐
  return text
    // ❌ 문자 삭제/치환 금지
    // 스트리밍 중에는 의미 변경을 절대 하지 않는다
    .replace(/[ \t]{2,}/g, " ")
    // 라인 끝 공백만 제거(개행은 유지)
    .replace(/[ \t]+\n/g, "\n")
    // 문자열 맨 끝도 공백/탭만 제거 (개행 유지)
    .replace(/[ \t]+$/g, "");
}

/**
 * ✅ Streaming Markdown Boundary Guard (SSOT)
 * - 스트림에서 fence/heading이 "라인 시작"을 잃으면 Markdown AST가 흔들리고 branch가 폭주한다.
 * - 토큰 단위로 최소 보정만 한다 (의미 생성/재구성 금지).
 */
function normalizeStreamingMarkdownDelta(prevTail: string, delta: string): string {
  return delta ?? "";
}



  function buildLocalTitleFromPrompt(prompt: string): string {
    if (!prompt) return "New Chat";

    const cleaned = prompt
      .replace(/\n+/g, " ")
      .replace(/[`*_#>\[\]()<>{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "New Chat";

    // 1️⃣ 질문형 우선
    const questionMatch = cleaned.match(
      /(.+?\?|.+?(하는 법|방법|차이|이유|원인|가능할까|어떻게))/i
    );

    let base =
      questionMatch?.[0] ??
      cleaned.split(/\.|!|\?/)[0];

    // 2️⃣ 군더더기 제거
    base = base
      .replace(/^(혹시|일단|지금|그냥)\s+/i, "")
      .replace(/좀\s+/i, "")
      .trim();

    // 3️⃣ 길이 제한 (의미 단위 컷)
    const MAX = 32;
    if (base.length > MAX) {
      const cut = base.slice(0, MAX);
      const lastSpace = cut.lastIndexOf(" ");
      base =
        lastSpace > 12
          ? cut.slice(0, lastSpace)
          : cut;
    }

    return base.length > 0 ? `${base}…` : "New Chat";
  }



  /* =========================
    STREAM HOOK (SSOT FINAL)
  ========================= */
  export function useChatStream() {
    const { authFetch, status } = useAuth();
    const router = useRouter();
    const { openStudio } = useStudioContext();
    const { disable } = useThinkingProfile();
    const {
      streaming,
      setStreamState,
      resetStreamState,
      addAssistantMessage,
      lockStreamingThread,
      unlockStreamingThread,
      patchAssistantTraceId,
      patchAssistant,
      patchAssistantMeta,
      finalizeAssistant,
      regenerateFromMessage,
      
    } = useChatStore();

  
    const sessionStore = useStreamSessionStore;

    const streamStateRef = useRef<StreamUIState>(
      createInitialStreamState()
    );
 const applyStreamEvent = useCallback(
   (kind: StreamEventKind, payload: StreamPayload | undefined) => {
        const prev = streamStateRef.current;
        const next = reduceStreamState(prev, {
          kind,
          payload,
          nowMs: Date.now(),
        });
        streamStateRef.current = next;
        return { prev, next, changed: next !== prev };
      },
      []
    );

    // TODO(next-reasoning-ingestion): sequence_number/openaiSeq 기반 ordering,
    // open chunk keep-alive, reasoning summary buffer는 onRaw ingestion 단계에서 추가 예정.

const canRenderAnswerUX = () => true;
const { autoTitleThread, bumpThread } = useSidebarData();
// 🔒 SSOT: thinking tick loop 제거됨 (StreamOverlay 전용)
const startTickLoop = () => {};
const stopTickLoop = () => {};

    // 🔥 DEEP 요청을 "이번 요청"에만 고정하기 위한 SSOT ref
    const requestedThinkingRef = useRef<ThinkingProfile>("NORMAL");

  // 🔒 SSOT: DEEP는 이번 요청 1회성
  const resetThinkingOnce = () => {
    if (requestedThinkingRef.current === "DEEP") {
      disable();
      requestedThinkingRef.current = "NORMAL";
    }
  };

    // 🔥 DEEP: 본문 토큰을 '생각 중'엔 숨기고 버퍼링했다가,
    // allowAnswerRender 열릴 때 스트림처럼 방출
    const deferredAnswerRef = useRef<string>("");
    const deferredFlushTimerRef = useRef<number | null>(null);
    const deferredSeqRef = useRef(0);
    const controlBufferRef = useRef<string>("");
    const MIN_THINKING_MS = 1200;
    const FIRST_TOKEN_BUFFER_COUNT = 4;
    const thinkingStartRef = useRef<number | null>(null);
    const thinkingEndRef = useRef(false);
    const allowAnswerTimerRef = useRef<number | null>(null);

    const stopDeferredFlush = () => {
      if (deferredFlushTimerRef.current) {
        window.clearTimeout(deferredFlushTimerRef.current);
        deferredFlushTimerRef.current = null;
      }
      deferredSeqRef.current++;
    };

    const flushDeferredAnswerImmediately = useCallback(
      (assistantId: string) => {
        const text = deferredAnswerRef.current;
        if (!text) return;
        deferredAnswerRef.current = "";
        stopDeferredFlush();
        const delta0 = normalizeStreamingArtifacts(text, false);
        const delta = normalizeStreamingMarkdownDelta(assistantTailRef.current, delta0);
        console.log("[Normalize]", {
          rawLen: delta0.length,
          normalizedLen: delta.length,
        });
        console.log("[TRACE] PATCH_ASSISTANT");
        patchAssistant(assistantId, delta, { streaming: true });
        console.log("[TRACE] STATE_UPDATED");
        bumpTail(delta);
      },
      [patchAssistant]
    );

    const flipAllowAnswerRender = useCallback(() => {
      const s = sessionStore.getState().session;
      console.log("[ALLOW_ANSWER_RENDER]");
 sessionStore.getState().update({
   allowAnswerRender: true,
   thinking: {
     ...s.thinking,
     active: false,
   },
   thinkingCompletedAt: s.thinkingCompletedAt ?? Date.now(),
 });
      if (deferredAnswerRef.current.length > 0) {
        console.log("[FLUSH_DEFERRED]", {
          len: deferredAnswerRef.current.length,
        });
        const id = assistantIdRef.current;
        if (id) flushDeferredAnswerImmediately(id);
      }
    }, [flushDeferredAnswerImmediately]);

    const scheduleAllowAnswerRender = useCallback(() => {
      const now = Date.now();
      const elapsed = thinkingStartRef.current
        ? now - thinkingStartRef.current
        : 0;
      console.log("[THINKING_END]", { elapsed });

      if (allowAnswerTimerRef.current) {
        window.clearTimeout(allowAnswerTimerRef.current);
        allowAnswerTimerRef.current = null;
      }
      // ✅ allowAnswerRender는 ANSWER_UNLOCKED 또는 unlockAnswer()에서만 열림
    }, []);

    const flushDeferredAnswerAsStream = useCallback(
      (assistantId: string) => {
        const text = deferredAnswerRef.current;
        if (!text) return;
        deferredAnswerRef.current = "";
        stopDeferredFlush();
        const seq = ++deferredSeqRef.current;

        let i = 0;
        const step = 28;     // "토큰처럼" 보이는 최소 단위
        const interval = 16; // 60fps 감각

        const tick = () => {
          if (seq !== deferredSeqRef.current) return;
          const next = text.slice(i, i + step);
          i += step;
          if (next) {
            console.log("[STREAM_APPEND]", next);
            patchAssistant(assistantId, next, { streaming: true });
          }
          if (i < text.length) {
            deferredFlushTimerRef.current = window.setTimeout(tick, interval);
          } else {
            deferredFlushTimerRef.current = null;
          }
        };

        deferredFlushTimerRef.current = window.setTimeout(tick, interval);
      },
      [patchAssistant]
    );

    // ✅ SSOT: panel/inline share ONE timeline = chunks[index]
    // - panel(drawer) renders chunks as-is
    // - inline streams tokens for the *current chunkIndex*
    const firstTokenBufferRef = useRef<string>("");
    const firstTokenCountRef = useRef(0);
    const firstTokenReleasedRef = useRef(false);
    const answerUnlockTimerRef = useRef<number | null>(null);


    // ✅ answer render는 서버 stage(answer_unlocked)에서만 열린다
    const unlockAnswerFromServer = (assistantId?: string | null) => {
      const s = sessionStore.getState().session;
      const now = Date.now();
      if (s.thinkingProfile === "DEEP" && s.thinking.active) {
        sessionStore.getState().update({
          unlockRequested: true,
          unlockRequestedAt: now,
        });
        return;
      }
      if (!s.allowAnswerRender) {
        sessionStore.getState().update({
          unlockRequested: true,
          unlockRequestedAt: now,
        });
        const baseDelayMs = 240;
        const minThinkingDelayMs =
          s.thinkingCompletedAt && s.thinkingCompletedAt > now
            ? s.thinkingCompletedAt - now + baseDelayMs
            : baseDelayMs;
        if (answerUnlockTimerRef.current) {
          window.clearTimeout(answerUnlockTimerRef.current);
        }
        answerUnlockTimerRef.current = window.setTimeout(() => {
          flipAllowAnswerRender();
        }, minThinkingDelayMs);
      }
      if (assistantId && deferredAnswerRef.current && canRenderAnswerUX()) {
        flushDeferredAnswerImmediately(assistantId);
      }
    };


    /* ---------- Refs ---------- */
    const clientRef = useRef<StreamClient | null>(null);
    const hasActiveStream = Boolean(clientRef.current);
    const assistantIdRef = useRef<string | null>(null);
    const lastEventIdRef = useRef<number | null>(null);
    const assistantTailRef = useRef<string>("");
    const bumpTail = (delta: string) => {
      const next = (assistantTailRef.current + (delta ?? "")).slice(-64);
      assistantTailRef.current = next;
      console.log("[Append]", {
        newTailLen: assistantTailRef.current.length,
      });
      console.log("[TRACE] TAIL_UPDATED");
    };
    const traceIdRef = useRef<string | null>(null);
    const lastAssistantIdRef = useRef<string | null>(null);
    const thinkingSnapshotRef = useRef<Record<string, boolean>>({});

    const chatCalledRef = useRef(false);
    const endedRef = useRef(false);
    const readyTimerRef = useRef<number | null>(null);
    const thinkingStartAtRef = useRef<number | null>(null);
    const lastStageRef = useRef<StreamStage | null>(null); // ✅ stage merge/skip SSOT

  // ✅ 서버 stage 순서 정의(회귀 방지)
  const serverStageRank: Record<StreamStage, number> = {
    [StreamStage.THINKING]: 0,
    [StreamStage.ANALYZING_IMAGE]: 1,
    [StreamStage.ANSWER_UNLOCKED]: 1.5,
    [StreamStage.ANSWER]: 2,
    [StreamStage.SYSTEM]: 3,
    [StreamStage.PREPARING_STUDIO]: 3,
    [StreamStage.STUDIO_READY]: 3,
    [StreamStage.SUGGESTION]: 3,
  };

  const shouldAcceptStage = (next: StreamStage, hasText: boolean) => {
    if (next === StreamStage.SYSTEM) return true;
    if (next === StreamStage.STUDIO_READY) return true; // ✅ FINAL 이후에도 허용

    const prev = lastStageRef.current;
    if (prev === next) return false; // duplicate merge

    const prevRank = prev != null ? serverStageRank[prev] : undefined;
    const nextRank = serverStageRank[next];
    if (prev && prevRank !== undefined && nextRank !== undefined && nextRank < prevRank) {
      return false; // regression skip
    }

 if (
   hasText &&
 (sessionStore.getState().session.thinkingProfile ??
   sessionStore.getState().session.mode) !== "DEEP" &&
   next === StreamStage.THINKING
 ) {
   return false;
 }

    return true;
  };

    const lastPromptRef = useRef<{
    threadId: number;
    prompt: string;
    isFirstPrompt: boolean;
    hasAttachments: boolean;
    } | null>(null);

    const snapshotThinkingMeta = useCallback(
      (assistantId: string | null) => {
        if (!assistantId) return;
        if (thinkingSnapshotRef.current[assistantId]) return;

        const s = sessionStore.getState().session;
        if (s.messageId !== assistantId) return;

        const startedAt = s.startedAt ?? null;
        const now = Date.now();
        const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
 const active = s.chunks.find(c => c.chunkId === s.activeChunkId);
 const summary = String(active?.body ?? "").slice(0, 180).trim();
        thinkingSnapshotRef.current[assistantId] = true;
        patchAssistantMeta(assistantId, (prev) => {
          const prevThinking = prev?.thinking ?? undefined;
          const nextThinking: AssistantThinkingMeta = {
            ...prevThinking,
            thinkingProfile: s.thinkingProfile ?? s.mode ?? "NORMAL",
            summaries: Array.isArray(s.summaries) ? s.summaries : [],
            primarySummaryId: s.primarySummaryId ?? null,
            thinkingElapsedMs: elapsedMs ?? null,
            ...(summary ? { summary } : {}),
          };

          const nextMeta: Partial<ChatMessageWithMeta["meta"]> = {
            thinking: nextThinking,
          };

          return nextMeta;
        });
      },
      [patchAssistantMeta, sessionStore]
    );


    /* =========================
      CLEANUP (transport 종료)
    ========================= */
    const cleanup = useCallback(
      (reason: StopReason) => {
        if (endedRef.current) return;
        endedRef.current = true;
        stopTickLoop();

        if (readyTimerRef.current) {
          clearTimeout(readyTimerRef.current);
          readyTimerRef.current = null;
        }
        stopDeferredFlush();
        deferredAnswerRef.current = "";
        lastEventIdRef.current = null;

    assistantTailRef.current = "";
    deferredAnswerRef.current = "";
    controlBufferRef.current = "";

        try {
          clientRef.current?.stop();
        } catch {}

        const id = assistantIdRef.current;
        if (id && !lastAssistantIdRef.current) {
          lastAssistantIdRef.current = id;
        }

        lastStageRef.current = null;
        thinkingStartAtRef.current = null;
        clientRef.current = null;
        streamStateRef.current = createInitialStreamState();

        void reason;
      },
      [finalizeAssistant, resetStreamState]
    );

const requestAnswerUnlock = useCallback(
  async () => {
    if (!authFetch) return;

    const threadId = useChatStore.getState().activeThreadId;

    if (!threadId) return;

    await authFetch("/api/stream/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ threadId,traceId: traceIdRef.current, }),
      
    });
  },
  [authFetch]
);

    /* =========================
      SEND PROMPT
    ========================= */
    const sendPrompt = useCallback(
      ({ threadId, content, attachments = [], thinkingProfile }: SendPromptArgs) => {
        console.log("[SEND_PROMPT][ENTER]", {
          threadId,
          contentLength: content?.length ?? 0,
          attachmentsLength: attachments.length,
          status,
          hasAuthFetch: !!authFetch,
          streaming,
        });
     // 🔒 SSOT FIX: 새 요청 시작 시 이전 tail 완전 초기화
     assistantTailRef.current = "";
     deferredAnswerRef.current = "";
     controlBufferRef.current = "";
    // 🔒 FIX: 이전 스트림이 살아있을 때만 reset
    if (clientRef.current) {
      sessionStore.getState().reset();
    }
  else {
   sessionStore.getState().reset();
 }
        if (status !== "authed") {
          console.log("[SEND_PROMPT][EARLY_RETURN] status_not_authed", { status });
          return;
        }
        if (!authFetch) {
          console.log("[SEND_PROMPT][EARLY_RETURN] no_authFetch");
          return;
        }
        if (!Number.isFinite(threadId) || threadId <= 0) {
          console.log("[SEND_PROMPT][EARLY_RETURN] invalid_threadId", { threadId });
          return;
        }
        if (streaming) {
          console.log("[SEND_PROMPT][EARLY_RETURN] already_streaming");
          return;
        }

const store = useChatStore.getState();
if (store.activeThreadId !== threadId) {
  store.setActiveThread(threadId);
}

        const trimmed = content.trim();
         console.log("[FRONT][SEND_PROMPT]", {
   threadId,
   content,
   trimmedLength: trimmed.length,
   attachmentsLength: attachments.length,
   attachments,
  });
 const hasAttachments = attachments.length > 0;
 const isStreamRequest =
   trimmed.length > 0 || attachments.length > 0;

        if (!trimmed && attachments.length === 0) return;

        endedRef.current = false;
        chatCalledRef.current = false;
        lastStageRef.current = null; // ✅ new stream reset (SSOT)
        streamStateRef.current = createInitialStreamState({
          kind: StreamUIStateKind.CONNECTING,
          threadId,
        });

 const messages =
   store.messagesByThread[threadId] ?? [];

 // ✅ SSOT FIX:
 // 첫 user 메시지 판단은 "assistant가 아직 없음" 기준
 const hasAssistant = messages.some(
   (m) => m.role === "assistant"
 );

 const isFirstUserMessage = !hasAssistant;

  lastPromptRef.current = {
    threadId,
    prompt: trimmed || "[IMAGE_INPUT]",
    isFirstPrompt: isFirstUserMessage,
    hasAttachments: attachments.length > 0,
  };

        setStreamState("connecting");
const traceId = uuidv4();
traceIdRef.current = traceId;
sessionStore.getState().reset();

 const requestedThinking =
   thinkingProfile ?? getThinkingProfile();
     requestedThinkingRef.current = requestedThinking;
        deferredAnswerRef.current = "";
        stopDeferredFlush();
        lastEventIdRef.current = null;
const contract = getThinkingContract(requestedThinking);


 const assistantId = addAssistantMessage(
   threadId,
   traceId,
   {
     enabled: true,
     profile: requestedThinking,
   }
 );
        lockStreamingThread(threadId);

        assistantIdRef.current = assistantId;
        sessionStore.getState().start({
          messageId: assistantId,
          mode: requestedThinking,
          thinkingProfile: null,
        });
        firstTokenBufferRef.current = "";
        firstTokenCountRef.current = 0;
        firstTokenReleasedRef.current = false;


         // 🔥 SSOT: 이미지 요청이면 즉시 imageLoading 선언
 if (attachments.length > 0) {
   patchAssistantMeta(assistantId, {
     imageLoading: true,
   });
 }


        readyTimerRef.current = window.setTimeout(() => {
          cleanup("error");
        }, 10_000);
        
        if (isStreamRequest) {
        clientRef.current = new StreamClient({
          authFetch,
          threadId,
          message: trimmed,
          debug: true,
          handlers: {

            

            /* ---------- READY ---------- */
            onReady: async (payload?: StreamPayload) => {
 const s = sessionStore.getState().session;
 const effective = payload?.meta?.thinkingProfile ?? requestedThinkingRef.current;

 if (effective === "DEEP") {
   sessionStore.getState().update({
     thinkingProfile: "DEEP",
     thinking: {
       active: true,
       phase: "thinking",
     },
     firstThinkingAt: Date.now(),
   });
 }
              console.log("[STREAM][READY]", {
                threadId,
                assistantId: assistantIdRef.current,
              });
              if (endedRef.current) return;
              const eid =
                typeof payload?.eventId === "number"
                  ? payload.eventId
                  : null;
              if (eid != null) {
                if (
                  lastEventIdRef.current != null &&
                  eid <= lastEventIdRef.current
                ) {
                  return;
                }
                lastEventIdRef.current = eid;
              }
              const { changed } = applyStreamEvent("ready", payload);
              if (!changed) return;

              if (readyTimerRef.current) {
                clearTimeout(readyTimerRef.current);
                readyTimerRef.current = null;
              }

              setStreamState("streaming");
              // Ensure overlay can mount even if start() was not called (e.g. resume stream)
              if (!sessionStore.getState().session.startedAt) {
                sessionStore.getState().update({ startedAt: Date.now() });
              }
              thinkingStartAtRef.current = Date.now();

   if (payload?.meta?.thinkingProfile) {
   sessionStore.getState().update({
     thinkingProfile: payload.meta.thinkingProfile,
     thinking: {
       active: false,
       phase: null,
     },
   });
 }

               sessionStore.getState().update({
                streaming: true,
              });

               // 🔥 SSOT: READY 시점부터 assistant는 streaming 상태
              const id = assistantIdRef.current;
              if (id) {

 patchAssistantMeta(id, {
   performance: {
     streamReadyAt: Date.now(),
   },
 });
                if (payload?.meta?.imageLoading === true) {
patchAssistantMeta(id, (prev) => {
  const rawStudio = payload?.meta?.studio as any;

  const safeStudio =
    rawStudio &&
    typeof rawStudio === "object" &&
    typeof rawStudio.sectionId === "number" &&
    rawStudio.sectionId > 0 &&
    typeof rawStudio.assetType === "string"
      ? {
          sectionId: rawStudio.sectionId,
          assetType: rawStudio.assetType,
        }
      : undefined;

  return {
    imageLoading: true,
    isImageOnly: true,
    ...(safeStudio
      ? {
          studio: {
            ...(prev?.studio ?? {}),
            ...safeStudio,
          },
        }
      : {}),
  };
});
                }
                // token 없어도 streaming UI를 살린다 (TTFT 기준)
                console.log("[STREAM_APPEND]", "");
                patchAssistant(id, "", { streaming: true });
              }

              // 🔒 Step1: traceId는 chat API 응답에서 받는다
  const chatRes = await authFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId,
      message: trimmed,
      attachments,
      stream: true,
      thinkingProfile: requestedThinkingRef.current,
    }),
  });

  if (!chatRes.ok) {
    cleanup("error");
    return;
  }

  const chatJson = await chatRes.json();
  
 // 🔥 SSOT: 메시지 전송 성공 → thread bump (server + local)
 try {
   const ts = await bumpThread(threadId);
   useSidebarStore.getState().touchThread(threadId, ts ?? Date.now());
 } catch {
   useSidebarStore.getState().touchThread(threadId);
 }
  const resolvedTraceId: string =
    chatJson.traceId ?? traceId;

    // ✅ SSOT: 프론트/백 traceId 단일화 (재현 로그 핵심)
  // - Stream/SSE payload.traceId와 MessageActions(traceId)가 같은 값이어야 디버깅이 쉬움
  if (assistantIdRef.current && resolvedTraceId && resolvedTraceId !== traceIdRef.current) {
    patchAssistantTraceId(assistantIdRef.current, resolvedTraceId);
    traceIdRef.current = resolvedTraceId;
  }

  console.log("[FRONT][STREAM][READY]", {
    threadId,
    traceId: traceIdRef.current,
  });

              if (chatCalledRef.current) return;
              chatCalledRef.current = true;

              try {
                
              } catch {
                cleanup("error");
              }
            },

            /* ---------- TOKEN ---------- */
            onToken: (token: string, payload?: StreamPayload) => {
              console.log("[STREAM][TOKEN]", {
                threadId,
                assistantId: assistantIdRef.current,
                tokenLength: token.length,
              });
              if (endedRef.current) return;

              const consumeControlSignals = (raw: string) => {
                const combined = controlBufferRef.current + raw;
                let text = combined;
                let clean = "";
                const events: any[] = [];
                while (true) {
                  const start = text.indexOf("[YUA]");
                  if (start === -1) {
                    clean += text;
                    controlBufferRef.current = "";
                    break;
                  }
                  const end = text.indexOf("[/YUA]", start);
                  if (end === -1) {
                    clean += text.slice(0, start);
                    controlBufferRef.current = text.slice(start);
                    break;
                  }
                  clean += text.slice(0, start);
                  const body = text.slice(start + 5, end).trim();
                  try {
                    const parsed = JSON.parse(body);
                    events.push(parsed);
                  } catch {}
                  text = text.slice(end + 6);
                }
                return { clean, events };
              };

              const { clean, events } = consumeControlSignals(token);
              if (events.length > 0) {
                for (const ev of events) {
                  if (ev?.type === "ANSWER_UNLOCK") {
                    unlockAnswerFromServer(assistantIdRef.current);
                  }
                }
              }

              if (!clean) return;

const { changed } = applyStreamEvent("token", {
   ...(payload ?? {}),
   token: clean,
 });
              if (!changed) return;
              console.log("[SSE][EVENT]", {
                type: "token",
                stage: sessionStore.getState().session.stage,
                activityId: null,
                finalized: sessionStore.getState().session.finalized,
              });
              const id = assistantIdRef.current;
              if (!id) return; // ✅ TS + 런타임 SSOT

              const session = sessionStore.getState().session;
              const profile = session.thinkingProfile ?? session.mode;

              // 🔥 FIX: NORMAL 모드에서는 절대 answer unlock gate를 기다리지 않는다
              if (profile !== "DEEP") {
                const delta0 = normalizeStreamingArtifacts(clean, true);
                const delta = normalizeStreamingMarkdownDelta(
                  assistantTailRef.current,
                  delta0
                );

                patchAssistant(id, delta, { streaming: true });
                bumpTail(delta);
                return;
              }
  const effective = (session.thinkingProfile ?? session.mode);

 // 🔒 SSOT:
 // hasText = "의미 있는 텍스트가 시작됨"


              if (/[0-9A-Za-z가-힣]/.test(clean)) {
                if (!session.hasText) {
                  sessionStore.getState().update({ hasText: true });
                }
              }
const now = Date.now();
const s = sessionStore.getState().session;
              if (deferredAnswerRef.current) {
  const s = sessionStore.getState().session;
  if (s.thinkingProfile !== "DEEP") {
    flushDeferredAnswerImmediately(id);
  }
              } else {
                const delta0 = normalizeStreamingArtifacts(clean, true);
                const delta = normalizeStreamingMarkdownDelta(
                  assistantTailRef.current,
                  delta0
                );

                console.log("[Normalize]", {
                  rawLen: delta0.length,
                  normalizedLen: delta.length,
                });

                console.log("[STREAM_APPEND]", delta);
                console.log("[TRACE] PATCH_ASSISTANT");
                patchAssistant(id, delta, { streaming: true });
                console.log("[TRACE] STATE_UPDATED");
                bumpTail(delta);
              }
              

              if (!session.answerVisible && !session.finalized) {
                sessionStore.getState().update({ answerVisible: true });
              }
            },

            /* ---------- ACTIVITY (SSOT) ---------- */
            onActivity: (activity) => {
              if (endedRef.current) return;
              // 🔒 SSOT: FINAL 이후 activity는 절대 수용하지 않는다
              if (streamStateRef.current?.finalized === true) {
                console.warn("[STREAM][ACTIVITY_DROPPED_POST_FINAL]", activity);
                return;
              }
              const { changed } = applyStreamEvent("activity", {
                activity,
              } as StreamPayload);
              useStreamSessionStore.getState().applyActivity(activity);
              if (!changed) return;
              console.log("[SSE][EVENT]", {
                type: "activity",
                stage: sessionStore.getState().session.stage,
                activityId: activity?.item?.id ?? null,
                finalized: sessionStore.getState().session.finalized,
              });
            },

            /* ---------- REASONING BLOCK ---------- */
onReasoningBlock: (block) => {
  if (endedRef.current) return;

  // UI SSOT: reasoning_block은 디버그/스냅샷 전용. 패널 렌더에는 사용하지 않는다.
  return;
},

            onReasoningDone: () => {
              useStreamSessionStore.getState().markLastReasoningDone();
            },

            /* ---------- MEMORY (SSE) ---------- */
            onMemory: (memory) => {
              if (!memory) return;
              const store = useMemoryIndicator.getState();
              switch (memory.op) {
                case "PENDING":
                  store.setPending();
                  break;
                case "SAVED":
                case "UPDATED":
                  store.setSaved(
                    memory.op === "UPDATED" ? "기억을 업데이트했어요" : "기억했어요"
                  );
                  break;
                case "SKIPPED":
                case "CONFLICT":
                  store.reset();
                  break;
              }
            },

            /* ---------- STAGE ---------- */
            onStage: (_stage: StreamStage, payload: StreamPayload) => {
               console.log("[DEBUG][onStage]", {
               stage: payload.stage,
               hasAssistant: Boolean(assistantIdRef.current),
               });

              const stage = payload.stage;
              if (!stage) return;
              if (endedRef.current && stage !== StreamStage.STUDIO_READY) return;

  /* =====================================================
     🔥 THREAD TITLE PATCH (Redis → SSE → Sidebar Sync)
     - Worker가 publish한 meta.threadTitle 반영
     - stage와 무관하게 즉시 sidebar store 업데이트
  ====================================================== */
  const nextTitle =
    typeof (payload as any)?.meta?.threadTitle === "string"
      ? (payload as any).meta.threadTitle.trim()
      : null;

  if (nextTitle && nextTitle.length > 0) {
    useSidebarStore.getState().updateThread(threadId, {
      title: nextTitle,
    });
  }
              console.log("[SSE][EVENT]", {
                type: "stage",
                stage,
                activityId: null,
                finalized: sessionStore.getState().session.finalized,
              });
 const store = useChatStore.getState();
 const assistantId = assistantIdRef.current;

   // 🔥 FIX: STAGE → timeline chunk로 내려서 panel/inline이 공유
 if (
   stage !== StreamStage.SYSTEM &&
   stage !== StreamStage.STUDIO_READY &&
   stage !== StreamStage.ANSWER_UNLOCKED // 🔥 제거
 ) {
 // 🔒 stage는 phase만 바꾸고 UI chunk 생성하지 않는다
  }

 const currentText =
   assistantId
     ? (store.messagesByThread[threadId] ?? [])
         .find((m) => m.id === assistantId)?.content ?? ""
     : "";
 const hasText = currentText.trim().length > 0;

 // 1️⃣ FINAL 이후 허용 stage 먼저
 if (streamStateRef.current.finalized) {
   if (
     ![
       StreamStage.STUDIO_READY,
       StreamStage.SUGGESTION,
       StreamStage.SYSTEM,
     ].includes(stage)
   ) return;
 }

  // 🔑 반드시 먼저 profile 반영 (DEEP/NORMAL 동기화)
  if (payload.meta?.thinkingProfile) {
    sessionStore.getState().update({
      thinkingProfile: payload.meta.thinkingProfile,
    });
  }
  sessionStore.getState().update({ stage });

  if (
    stage === StreamStage.ANSWER ||
    stage === StreamStage.ANSWER_UNLOCKED
  ) {
    const s = sessionStore.getState().session;
    if (!s.firstAnswerTokenAt) {
      sessionStore.getState().update({ firstAnswerTokenAt: Date.now() });
    }
  }

 // 2️⃣ thinking 최소 지연 (상태 변경 전에)
 if (stage === StreamStage.THINKING) {
   const startedAt = thinkingStartAtRef.current;
   if (!startedAt || Date.now() - startedAt < 300) return;
 }

 // 3️⃣ stage regression / duplicate 방지
 if (!shouldAcceptStage(stage, hasText)) return;
 lastStageRef.current = stage;


  // ✅ server can override label (optional)
 const labelFromServer =
   typeof (payload.meta as any)?.thinkingLabel === "string"
     ? (payload.meta as any).thinkingLabel
     : typeof (payload.meta as any)?.label === "string"
     ? (payload.meta as any).label
     : null;
 if (labelFromServer) {
   sessionStore.getState().update({ label: labelFromServer });
 }

 // ✅ SSOT: stage는 “문장 생성” 금지. 오직 phase(FSM)만 변경.

              // ✅ IMPORTANT:
              // 아래 stage 분기는 같은 레벨이어야 한다.
              // (중괄호 한 겹 잘못 들어가면 TS가 stage 분기를 오해해 연쇄 파싱 오류)
              {
                const s = sessionStore.getState().session;
                const effective = (s.thinkingProfile ?? s.mode);

  if (stage === StreamStage.THINKING) {
    if (
      effective === "DEEP" &&
      !s.answerVisible &&
      s.thinkingCompletedAt == null
    ) {
      sessionStore.getState().update({
        thinking: {
          active: true,
          phase: "thinking",
        },
      });
    }
  }
              }


            const session = sessionStore.getState().session;
  console.log("[FSM]", {
    stage: payload.stage,
    phase: session.thinking.phase,
    active: session.thinking.active,
    hasText: session.hasText,
    finalized: session.finalized,
  });

     // 🔥 SSOT: server-authoritative answer unlock
 if (stage === StreamStage.ANSWER_UNLOCKED) {
   unlockAnswerFromServer(assistantIdRef.current);

   const s = sessionStore.getState().session;
   sessionStore.getState().update({
     thinking: {
       ...s.thinking,
       phase: "answer",
     },
   });


   return;
 }

 if (stage === StreamStage.ANSWER) {
   const s = sessionStore.getState().session;
   sessionStore.getState().update({
     thinking: { ...s.thinking, phase: "answer" },
   });
 }

          

               /* ----------------------------------
              🔥 STUDIO READY (SSOT)
               - FINAL 이후에도 반드시 system message 생성
              ---------------------------------- */
              if (
                payload.stage === StreamStage.STUDIO_READY &&
                payload.meta?.studio
              ) {
                  // 🔥 SSOT: assistant lifecycle race 방지
                const store = useChatStore.getState();
                const messages = store.messagesByThread[threadId] ?? [];

                const lastAssistant =
                  [...messages].reverse().find(
                    (m) => m.role === "assistant"
                  ) ?? null;
                               const studio = payload.meta.studio as any;
                 const rawSectionId = studio?.sectionId;
                const sectionId =
                  typeof rawSectionId === "number"
                    ? rawSectionId
                    : typeof rawSectionId === "string"
                    ? Number(rawSectionId)
                    : NaN;
                const safeStudio =
                  studio &&
                  typeof studio === "object" &&
                  Number.isFinite(sectionId) &&
                  sectionId > 0 &&
                  typeof studio.assetType === "string"
                    ? { ...studio, sectionId }
                    : undefined;

const id =
  lastAssistantIdRef.current ??
  assistantIdRef.current ??
  lastAssistant?.id ??
  null;


                // ✅ 1) system message는 항상 남긴다
                useChatStore.getState().addSystemMessage({
                  threadId,
                  content: "이미지 생성 완료",
                  ref: safeStudio,
                });

                // ✅ 2) assistant가 살아있으면 meta를 확정해준다 (SSOT)
                // - imageLoading은 여기서 반드시 false
                // - studio.sectionId가 UI의 단일 진실
                if (id) {
                  patchAssistantMeta(id, (prev) => ({
                    imageLoading: false,
                    studio: {
                      ...(prev?.studio ?? {}),
                      ...(safeStudio ?? {}),
                    },
                  }));
                }

                return;
              }

              if (stage === StreamStage.ANALYZING_IMAGE) {
                const id = assistantIdRef.current ?? lastAssistantIdRef.current;
                if (id) {
patchAssistantMeta(id, (prev) => {
  const rawStudio = payload?.meta?.studio as any;

  const safeStudio =
    rawStudio &&
    typeof rawStudio === "object" &&
    typeof rawStudio.sectionId === "number" &&
    rawStudio.sectionId > 0 &&
    typeof rawStudio.assetType === "string"
      ? {
          sectionId: rawStudio.sectionId,
          assetType: rawStudio.assetType,
        }
      : undefined;

  return {
    imageLoading: true,
    isImageOnly: true,
    ...(safeStudio
      ? {
          studio: {
            ...(prev?.studio ?? {}),
            ...safeStudio,
          },
        }
      : {}),
  };
});
                }

 const lastMsg =
   useChatStore
     .getState()
     .messagesByThread[threadId]
     ?.slice(-1)[0];

 const isImageOnly =
   Boolean(lastMsg?.attachments?.length) &&
   !lastMsg?.content?.trim();

  if (!isImageOnly) {
    sessionStore.getState().update({
      imageAnalyzing: true,
    });
  }
              }

            },

            /* ---------- FINAL (🔥 UI 종료) ---------- */
            onFinal: (payload?: StreamPayload) => {
              console.log("[STREAM][FINAL]", {
                threadId,
                assistantId: assistantIdRef.current,
              });
              const { changed } = applyStreamEvent("final", payload);
              if (!changed) return;
              stopTickLoop();
              console.log("[STREAM][FINAL_RECEIVED]", {
                assistantIdRef: assistantIdRef.current,
                lastAssistantIdRef: lastAssistantIdRef.current,
              });


              // ✅ DEEP: FINAL이면 “버퍼를 무조건 본문으로” (안 그러면 종료 후 출력이 비는 케이스 발생)
              const id0 = assistantIdRef.current ?? lastAssistantIdRef.current;

	const sFinal = sessionStore.getState().session;
	const effectiveProfile =
  (sFinal.thinkingProfile ?? sFinal.mode);
const holdThinking =
  effectiveProfile === "DEEP" && sFinal.thinking.active;

sessionStore.getState().update({
  finalized: true,
  imageAnalyzing: false,
  finalizedAt: Date.now(),
  answerVisible: holdThinking ? sFinal.answerVisible : true,
});

if (!holdThinking) {
  const s = sessionStore.getState().session;
  sessionStore.getState().update({
    thinking: {
      ...s.thinking,
      active: false,
      phase: "answer",
    },
  });
}

 // FINAL은 thinking 종료만 의미
 // unlock은 ANSWER_UNLOCKED stage에서만 수행
              const sFinalSession = sessionStore.getState().session;
               // overlay 차단: deferred flush 불필요
              snapshotThinkingMeta(id0);
	resetThinkingOnce();
               console.log("[FRONT][onFinal][IMAGE_FINALIZED]", {
               assistantId: assistantIdRef.current,
                traceId: traceIdRef.current,
                });
              thinkingStartAtRef.current = null;
 
              

              const id = assistantIdRef.current;
              if (id) {
                lastAssistantIdRef.current = id; // 🔥 FINAL 이후 suggestion용

    // 🔒 FINAL 시 ActionPreview만 정리. thinking meta는 "이 메시지의 모드"라서 유지해야 함.
    patchAssistantMeta(id, () => ({
      actionPreview: undefined,
    }));

   }

              setStreamState("idle");

              const last = lastPromptRef.current;
  if (
    last &&
    last.threadId === threadId &&
    last.isFirstPrompt
  ) {
    queueMicrotask(() => {
  setTimeout(() => {
    void autoTitleThread(threadId, last.prompt);
  }, 50);
    });
  }
            },

            /* ---------- DONE (transport) ---------- */
            onDone: async (payload?: StreamPayload) => {
              console.log("[STREAM][DONE]", {
                threadId,
                assistantId: assistantIdRef.current,
              });
              const { changed } = applyStreamEvent("done", payload);
              if (!changed) return;
              console.log("[SSE][EVENT]", {
                type: "done",
                stage: sessionStore.getState().session.stage,
                activityId: null,
                finalized: sessionStore.getState().session.finalized,
              });
              const id1 = assistantIdRef.current ?? lastAssistantIdRef.current;
              const sDone = sessionStore.getState().session;
              if (id1 && deferredAnswerRef.current) {
                if (sessionStore.getState().session.allowAnswerRender) {
                  flushDeferredAnswerImmediately(id1);
                }
              }
              snapshotThinkingMeta(id1);

              console.log("[FRONT][onDone]", {
                threadId,
                traceId: traceIdRef.current,
                finalReceived: streamStateRef.current.finalized,
              });
              // ✅ IMPORTANT: 여기서 assistantIdRef를 null로 만들면
              // cleanup→client.stop() 경로에서 FINAL 보정이 실패한다.

     sessionStore.getState().update({
   imageAnalyzing: false,
 });
              
  // 🔥 SSOT: DONE = assistant lifecycle 종료
              const id = assistantIdRef.current ?? lastAssistantIdRef.current;
              if (assistantIdRef.current) {
                lastAssistantIdRef.current = assistantIdRef.current;
              }
              if (id) {
  const store = useChatStore.getState();
  const msg = Object.values(store.messagesByThread)
    .flat()
    .find((m) => m.id === id);

  if (!msg?.finalized) {
    // Defer finalize to allow pending token handlers to flush first.
    queueMicrotask(() => finalizeAssistant(id));
  }
              }
              unlockStreamingThread(threadId);
              // DO NOT auto-close panel on DONE

              console.log("[SSE][EVENT]", {
                type: "done:after_end",
                stage: sessionStore.getState().session.stage,
                activityId: null,
                finalized: sessionStore.getState().session.finalized,
              });
              setStreamState("idle");
              cleanup("user");
              assistantTailRef.current = ""; // ✅ transport end reset
            },

            /* ---------- ERROR ---------- */
            onError: () => {
              resetThinkingOnce();
              setStreamState("idle");
              unlockStreamingThread(threadId);
              cleanup("error");
            },
            /* ---------- SUGGESTION ---------- */
            onSuggestion: (payload: StreamPayload) => {
  
      const { changed } = applyStreamEvent("suggestion", payload);
      if (!changed) return;
  
      const normalized = normalizeSuggestionPayload(
        payload.suggestion
      );

      if (!normalized) return;

  // ✅ FINAL 이후에도 마지막 assistant에 붙인다
  const id =
    assistantIdRef.current ??
    lastAssistantIdRef.current;
  if (!id) return;

  patchAssistantMeta(id, {
    suggestion: normalized,
  });

            },

          },
        });

        void clientRef.current.start().catch(() => {
          cleanup("error");
        });
        }
      },
      [
        status,
        authFetch,
        streaming,
        router,
        openStudio,
        setStreamState,
        addAssistantMessage,
        patchAssistant,
        patchAssistantMeta,
        finalizeAssistant,
        cleanup,
        autoTitleThread,
        snapshotThinkingMeta,
      ]
    );

    /* =========================
      STOP
    ========================= */
    const stop = useCallback(async () => {
      if (!clientRef.current) return;

      const last = lastPromptRef.current;
      if (last?.threadId && authFetch) {
        try {
          await authFetch("/api/chat/stream/abort", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: last.threadId }),
          });
        } catch {}
      }

      cleanup("user");
    }, [streaming, authFetch, cleanup]);

    /* =========================
      REGENERATE
    ========================= */
    const regenerate = useCallback(
      (assistantMessageId: string) => {
        if (status !== "authed" || streaming) return;

        const store = useChatStore.getState();

        // ✅ 1) 먼저 "재생성 입력"을 스냅샷 (삭제/리듀스 전에)
        let targetThreadId: number | null = null;
        for (const [tid, list] of Object.entries(store.messagesByThread)) {
          if (list.some((m) => m.id === assistantMessageId)) {
            targetThreadId = Number(tid);
            break;
          }
        }
        if (targetThreadId == null) return;

        const list = store.messagesByThread[targetThreadId] ?? [];

        // ✅ 핵심: "이 assistant가 답한 user"를 찾는다
        // - thread 내에서 assistant의 위치를 찾고
        // - 그 이전으로 거슬러 올라가며 가장 가까운 user를 선택
        const assistantIdx = list.findIndex((m) => m.id === assistantMessageId);
        if (assistantIdx < 0) return;

        let pairedUser: (typeof list)[number] | null = null;
        for (let i = assistantIdx - 1; i >= 0; i--) {
          const m = list[i];
          if (m?.role === "user") {
            pairedUser = m;
            break;
          }
        }
        if (!pairedUser) return;

        const snapshot = {
          threadId: Number(pairedUser.threadId ?? targetThreadId),
          content: String(pairedUser.content ?? ""),
          attachments: (pairedUser.attachments ?? []) as any[],
        };

        // ✅ 2) 기존 assistant 삭제/정리(지금 동작 유지)
        cleanup("user");
        regenerateFromMessage(assistantMessageId);

        // ✅ 3) 스냅샷으로 새 assistant 생성
        sendPrompt({
          threadId: snapshot.threadId,
          content: snapshot.content,
          attachments: snapshot.attachments,
        });
      },
      [streaming, status, regenerateFromMessage, sendPrompt, cleanup]
    );

    return {
      sendPrompt,
      regenerate,
      stop,
      hasActiveStream,
      requestAnswerUnlock,
    };
  }
