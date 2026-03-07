// 🔒 YUA ReasoningSessionController (SSOT v1.2)
// --------------------------------------------
// - LLM 호출 ❌
// - Formatter ❌
// - stage / reasoning_block ❌
// - ENGINE delta만 수집
// - MODEL delta는 ChatEngine에서 append
// - reasoning event 단일 이벤트 타입 사용
// - JSON snapshot 구조 유지

import { ReasoningSessionRepo } from "./reasoning-session.repo";

type StageName =
  | "decision"
  | "tool_plan"
  | "prompt_runtime"
  | "execution_phase"
  | "post_processing";

interface StageSnapshot {
  stage: StageName;
  traces: unknown[];
  startedAt: number;
  completedAt?: number;
}

interface ControllerInit {
  threadId: number;
  traceId: string;
  mode: "NORMAL" | "DEEP";
  sessionId: string;
}

export class ReasoningSessionController {
  private threadId: number;
  private traceId: string;
  private mode: "NORMAL" | "DEEP";
  private sessionId: string;

  private currentStage: StageSnapshot | null = null;
  private seqCounter = 0; // 🔥 session-local monotonic counter
  constructor(init: ControllerInit) {
    this.threadId = init.threadId;
    this.traceId = init.traceId;
    this.mode = init.mode;
    this.sessionId = init.sessionId;
  }

  /* -------------------------------------------------- */
  /* 🧠 Stage Begin                                     */
  /* -------------------------------------------------- */

  beginStage(stage: StageName) {
    if (this.mode !== "DEEP") return;

    this.currentStage = {
      stage,
      traces: [],
      startedAt: Date.now(),
    };

    // 🔥 ENGINE STAGE DELTA
    this.appendEngineDelta({
      type: "STAGE_START",
      stage,
      at: this.currentStage.startedAt,
    });
  }

  /* -------------------------------------------------- */
  /* 🧩 ENGINE TRACE APPEND                             */
  /* -------------------------------------------------- */

  appendTrace(trace: unknown) {
    if (this.mode !== "DEEP") return;
    if (!this.currentStage) return;

    this.currentStage.traces.push(trace);

    this.appendEngineDelta({
      type: "TRACE",
      stage: this.currentStage.stage,
      payload: trace,
      at: Date.now(),
    });
  }

  /* -------------------------------------------------- */
  /* 🏁 Stage Complete                                  */
  /* -------------------------------------------------- */

  completeStage() {
    if (this.mode !== "DEEP") return;
    if (!this.currentStage) return;

    this.currentStage.completedAt = Date.now();

    const snapshot = {
      stage: this.currentStage.stage,
      traces: this.currentStage.traces,
      startedAt: this.currentStage.startedAt,
      completedAt: this.currentStage.completedAt,
    };

    this.currentStage = null;

    this.appendEngineDelta({
      type: "STAGE_COMPLETE",
      payload: snapshot,
      at: Date.now(),
    });
  }

  /* -------------------------------------------------- */
  /* 🔥 Core: ENGINE → reasoning event                  */
  /* -------------------------------------------------- */

  private async appendEngineDelta(delta: unknown) {
    // 🔒 SSOT: int4-safe monotonic sequence (DB integer safe)
    this.seqCounter += 1;
    const seq = this.seqCounter;

    // 🔒 DB 저장
    await ReasoningSessionRepo.appendDelta({
      sessionId: this.sessionId,
      source: "ENGINE",
      kind: "DELTA",
      seq,
      payload: delta,
    });
  }
}
