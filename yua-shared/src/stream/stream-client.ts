// 📂 src/stream/stream-client.ts
import {
  StreamClientOptions,
  StreamPayload,
} from "./types";
import { isSentenceBoundary } from "./sentence";
import { getThinkingContract } from "../types/thinkingProfile";
import type { ThinkingProfile } from "../types/thinkingProfile";

export class StreamClient {
  private abortController: AbortController | null = null;
  private thinkingProfile: ThinkingProfile = "NORMAL";
  private deltaQueue: { delta: string; payload?: StreamPayload }[] = [];
  private emittedText: string = ""; // ✅ 누적/중복 방지용: 지금까지 "이미 출력한 전체 텍스트"
  private lastEventId: number | null = null;
  private inInlineMath = false;
  private inBlockMath = false;
  private ready = false; // connection lifetime
  private flushTimer: number | null = null;
  private finalGraceTimer: number | null = null;
  private stopped = false;
  private finalized = false; // 🔥 NEW: logical end
  private done = false;   
  private dbg = false;


  constructor(private options: StreamClientOptions) {}

 // ✅ overlap 계산 (끝-시작 겹침)
  private calcOverlap(a: string, b: string): number {
    const max = Math.min(a.length, b.length);
    for (let k = max; k > 0; k--) {
      if (a.endsWith(b.slice(0, k))) return k;
    }
    return 0;
  }

  /**
   * ✅ 누적 토큰(cumulative) / 중복 프레임 방어
   * - raw가 "전체 누적 문자열"이면, 아직 안 나온 suffix만 delta로 만든다
   * - raw가 "그냥 delta"면 그대로 delta
   * - raw가 중복(이미 출력한 tail)면 delta=""
   */
  private coerceDelta(raw: string): string {
    const next = String(raw ?? "");
    if (!next) return "";

    // 1) 서버가 누적(full text)로 보내는 케이스
    if (this.emittedText && next.startsWith(this.emittedText)) {
      const delta = next.slice(this.emittedText.length);
      this.emittedText = next;
      return delta;
    }

    // ❌ overlap 제거 로직 삭제
    // delta 스트림에서 우연 겹침이 매우 자주 발생해서
    // 마크다운 / 단어 잘림 현상 발생함
    // 진짜 cumulative는 위 startsWith 케이스에서만 처리

    // 3) 첫 토큰
    this.emittedText += next;
    return next;
  }


  /* =========================
     Public
  ========================= */
  async start() {
    const { authFetch, threadId } = this.options;
    this.dbg = this.options.debug === true;

    this.internalReset();
    this.stopped = false;
    this.finalized = false;
    this.done = false;
    this.abortController = new AbortController();

    let res: Response;
    try {
      res = await authFetch(
        `/api/stream/stream?threadId=${threadId}`,
        {
          signal: this.abortController.signal,
          headers: { Accept: "text/event-stream" },
        }
      );
    } catch (e) {
      this.fail(e);
      return;
    }

    if (!res.ok || !res.body) {
      this.fail("STREAM_CONNECT_FAILED");
      return;
    }
  // 🔥 SSOT FIX: SSE 연결 성공 = READY
 if (!this.ready && !this.stopped) {
   this.ready = true;
   this.options.handlers.onReady?.({
     event: "ready"
   } as any);
 }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        raw += decoder.decode(value, { stream: true });
        const frames = raw.split("\n\n");
        raw = frames.pop() ?? "";

        for (const frame of frames) {
          if (this.stopped) return;

          let eventLine: string | null = null;
          let dataLine: string | null = null;

          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) {
              eventLine = line.replace("event:", "").trim();
            }
            if (line.startsWith("data:")) {
              dataLine = line.replace("data:", "").trim();
            }
          }

          if (!eventLine || !dataLine) continue;

          let payload: StreamPayload;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }
          console.log("[TRACE] SSE_RECEIVED");

          const eventType = eventLine;
          const traceId = (payload as any)?.traceId;
          const eventId =
            typeof (payload as any)?.eventId === "number"
              ? (payload as any).eventId
              : null;
          console.log("[TRACE][STREAM_CLIENT][RECEIVE]", { eventId, eventType, traceId });
      if (this.dbg) {
            console.log("[DBG][STREAM_CLIENT][FRAME]", { eventType, traceId, hasMeta: !!payload.meta });
          }

          // ✅ SSOT: start()에서는 "파싱 + (optional) reorder + processOneFrame"만 한다.
          const eid = typeof payload.eventId === "number" ? payload.eventId : null;
          const delta = (payload as any)?.delta ?? (payload as any)?.token ?? "";
          console.log("[SSE receive]", { eventId: eid, delta });


          this.processOneFrame(eventType, payload);
          if (this.stopped || this.done) return;
        }
      }
    } catch (e) {
      // ✅ auto-abort(done 처리 후 abort)에서는 read가 던질 수 있음 → 에러로 취급하면 UI가 흔들림
      if (!this.stopped && !this.done) {
        this.fail(e);
      }
    }
  }
  private processOneFrame(eventType: string, payload: StreamPayload) {
    const traceId = (payload as any)?.traceId;
    if (this.dbg) {
      console.log("[RAW_FRAME]", JSON.stringify(payload));
    }

    /* =========================
       ACTIVITY (SSOT)
    ========================= */
    if (!this.done && eventType === "activity" && payload.activity) {
      this.options.handlers.onActivity?.(payload.activity, payload);
      return;
    }

    /* =========================
       REASONING BLOCK (DEEP)
    ========================= */
    if (!this.done && eventType === "reasoning_block") {
      const raw = (payload as any)?.block ?? null;
      const rd = (payload as any)?.reasoningDelta;
      const block =
        raw ??
        (rd
          ? {
              id: rd.id,
              title: rd.title,
              body: rd.body,
              inlineSummary:
                typeof rd.body === "string"
                  ? (() => {
                      // Strip title from body start to avoid title being typed inline
                      let b = rd.body as string;
                      if (typeof rd.title === "string" && rd.title.length > 0 && b.startsWith(rd.title)) {
                        b = b.slice(rd.title.length).replace(/^[\s\n:：\-]+/, "");
                      }
                      return b.slice(0, 180);
                    })()
                  : undefined,
            }
          : null);
      if (block) {
        this.options.handlers.onReasoningBlock?.(block, payload);
      }
      return;
    }
    /* =========================
       REASONING DONE (group end)
    ========================= */
    if (!this.done && eventType === "reasoning_done") {
      this.options.handlers.onReasoningDone?.();
      return;
    }
    /* =========================
       MEMORY (SSE)
    ========================= */
    if (!this.done && eventType === "memory" && payload.memory) {
      this.options.handlers.onMemory?.(payload.memory, payload);
      return;
    }

    /* =========================
       FINAL — 논리 종료 (🔥 NEW)
    ========================= */
    if (
      !this.finalized &&
      !this.done &&
      (eventType === "final" || payload.final === true)
    ) {
  if (this.deltaQueue.length > 0) {
    this.forceFlushAll();
  }
      this.finalized = true;
      console.log("[FRONT][STREAM_CLIENT][FINAL]", {
        threadId: this.options.threadId,
        traceId,
        eventType,
      });
      this.options.handlers.onFinal?.(payload);
      this.schedulePostFinalAutoStop();
      return;
    }

    /* =========================
       DONE — transport 종료 (SSOT)
    ========================= */
    if (!this.done && (eventType === "done" || payload.done === true)) {
      this.done = true;
      console.log("[FRONT][STREAM_CLIENT][DONE]", {
        threadId: this.options.threadId,
        traceId,
        eventType,
      });
      this.options.handlers.onDone(payload);
      return;
    }

    /* =========================
      SUGGESTION (🔥 NEW)
    ========================= */
    if (eventType === "suggestion") {
      console.log("[FRONT][STREAM_CLIENT][SUGGESTION]", payload);
      this.flush();
      this.options.handlers.onSuggestion?.(payload);
      return;
    }

    /* =========================
       TOKEN
    ========================= */
    if (eventType === "token") {
      if (this.done) return;
      // ✅ 서버가 delta/token 중 뭐로 주든 흡수
      const raw =
        typeof (payload as any)?.delta === "string"
          ? (payload as any).delta
          : typeof (payload as any)?.token === "string"
          ? (payload as any).token
          : "";

      const eid =
        typeof (payload as any)?.eventId === "number"
          ? (payload as any).eventId
          : null;

      if (eid != null) {
        if (this.lastEventId != null && eid <= this.lastEventId) {
          return; // duplicate frame drop
        }
        this.lastEventId = eid;
      }

      const prevEmitted = this.emittedText;
      const next = String(raw ?? "");
      const startsWith = prevEmitted ? next.startsWith(prevEmitted) : false;
      const delta = this.coerceDelta(raw);
      if (this.dbg) {
        console.log("[DELTA_DEBUG]", {
          eventId: eid,
          payloadText: (payload as any)?.text ?? null,
          prevEmitted,
          next,
          startsWith,
          delta,
        });
      }
      if (delta) this.pushText(delta, payload);
      return;
    }

    /* =========================
       STAGE (meta only)
    ========================= */
    if (eventType === "stage" && typeof payload.stage === "string") {
      if (this.done) return;
      if (payload.meta?.thinkingProfile) {
        this.thinkingProfile = payload.meta.thinkingProfile;
      }
      console.log("[FRONT][STREAM][STAGE]", {
        eventType,
        stage: payload.stage,
        topic: payload.topic,
        hasMeta: Boolean(payload.meta),
      });
      this.flush();
      this.options.handlers.onStage?.(payload.stage, payload);
      return;
    }
  }

  /* =========================
     STOP (USER)
  ========================= */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
     if (this.finalGraceTimer) {
     clearTimeout(this.finalGraceTimer);
      this.finalGraceTimer = null;
    }

    if (!this.finalized) {
      this.finalized = true;
      this.forceFlushAll();
      this.options.handlers.onFinal?.();
    }

    try { this.abortController?.abort(); } catch {}
    this.internalReset();
  }
  

  /* =========================
     Internal helpers
  ========================= */

    private updateLatexState(text: string) {
    const dbl = (text.match(/\$\$/g) ?? []).length;
 if (dbl % 2 === 1) this.inBlockMath = !this.inBlockMath;
    if (text.includes("\\[")) this.inBlockMath = true;
    if (text.includes("\\]")) this.inBlockMath = false;

    // inline math: $ ... $
    const dollarCount = (text.match(/\$/g) ?? []).length;
    if (dollarCount % 2 === 1) {
      this.inInlineMath = !this.inInlineMath;
    }
  }


  private pushText(text: string, payload?: StreamPayload) {
    this.deltaQueue.push({ delta: text, payload });
    this.updateLatexState(text);
    console.log("[TRACE] DELTA_ENQUEUED");

    // 🔒 SSOT: inline $ 가드는 flush starvation 위험 → 제거

 // 🔒 SSOT: sentence boundary 강제 flush 제거
 // partial markdown 파싱 안정성 위해 raf 기반 flush만 사용

    this.scheduleFlush();
  }

  private flush() {
    console.log("[TRACE] FLUSH_START");
    while (this.deltaQueue.length > 0) {
      const item = this.deltaQueue.shift();
      if (item?.delta) {
        console.log("[TRACE] FLUSH_EMIT");
        this.options.handlers.onToken(item.delta, item.payload);
      }
    }
  }

  private forceFlushAll() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    console.log("[TRACE] FLUSH_START");
    while (this.deltaQueue.length > 0) {
      const item = this.deltaQueue.shift();
      if (item?.delta) {
        console.log("[TRACE] FLUSH_EMIT");
        this.options.handlers.onToken(item.delta, item.payload);
      }
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;

    const STREAM_CADENCE_MS = 62; // 🔥 서버와 동일 cadence

    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, STREAM_CADENCE_MS);
  }
 
  private schedulePostFinalAutoStop() {
    // 🔒 FIX: FINAL 이후 transport를 강제 abort하지 않는다.
    // tail token drop 방지용
    return;
  }

  private internalReset() {
    this.abortController = null;
    this.deltaQueue = [];
    this.emittedText = "";
    this.lastEventId = null;
    this.finalized = false;
    this.done = false;
    this.ready = false;
    this.thinkingProfile = "NORMAL"; // reset to default
    this.dbg = false;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    if (this.finalGraceTimer) clearTimeout(this.finalGraceTimer);
    this.finalGraceTimer = null;
  }

  private fail(error: any) {
    console.error("[STREAM][ERROR]", error);
    this.options.handlers.onError?.(error);
    this.internalReset();
  }
}
