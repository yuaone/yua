  // 📂 src/types/stream.ts
  // 🔥 YUA-AI Stream Types — SSOT FINAL (2025.12)
  // 기존 코드 100% 호환 / strict-ts OK / 확장 가능
import type { ActivityEventPayload } from "yua-shared/stream/activity";
import type { MemoryStreamPayload } from "yua-shared/memory/types";

  export type YuaStreamStage =
    // 🔹 기존
    | "speak"
    | "analysis"
    | "memory"
    | "answer"
    | "suggestion"
    | "system"

    

    // 🔹 NEW: 인지/UX 보강 (출력 허용, 사고흐름 아님)
    | "thinking"          // 모델 응답 대기 / reasoning 중
    | "analyzing_input"   // 텍스트/이미지 입력 분석
    | "answer_unlocked"   // 🔥 ADD
    | "analyzing_image"   // 이미지 특화 (attachments)
    | "preparing_studio"  // Studio 전환 준비
    | "studio_ready"      // 🔥 이 stage 수신 시 Studio 전환 트리거

    // 🔹 확장 네임스페이스
    | `spine:${string}`;

  /* --------------------------------------------------
  * 🧠 Thinking Profile (UX-only, SSOT)
  * --------------------------------------------------
  * - 사고 "과정" ❌
  * - 사고 "연출" ⭕
  * - 시간 / 단계 / UX만 제어
  * 
  * 
  */


  export type ThinkingProfile = "FAST" | "NORMAL" | "DEEP";
  
 // 🔒 REMOVED: 사고 단계 라벨
 // LLM 사고 노출 / FSM 오해 유발


  /* --------------------------------------------------
  * Stream Event Kind (엔진 레벨)
  * -------------------------------------------------- */

  export type YuaStreamEventKind =
    | "stage"
    | "token"
    | "final"
    | "suggestion"
    | "done"
    | "activity"
    | "memory"
    | "reasoning_panel"
    | "reasoning_block"
    | "answer_unlocked";

 // 🔒 REMOVED: thinking summary payload

  export interface PersistedStreamEvent extends YuaStreamEvent {
    traceId: string; // 🔒 반드시 존재
  }

  /* --------------------------------------------------
  * Suggestion Payload (SSOT Extension)
  * -------------------------------------------------- */

  export type YuaSuggestionAction =
    | "REQUEST_INFO"
    | "REFINE_INPUT"
    | "CHOOSE_PATH";

  export interface YuaSuggestion {
    id: string;
    label: string;
    action: YuaSuggestionAction;
    priority: "HIGH" | "NORMAL" | "LOW";
  }



  /* --------------------------------------------------
  * Stream Event (SSOT)
  * -------------------------------------------------- */

  export interface YuaStreamEvent {
    /**
     * 요청 단위 추적 ID
     * - 없으면 StreamEngine에서 보정 가능
     */
    traceId?: string;

    /**
     * 엔진 레벨 이벤트 타입
     * - stream 동작 제어용
     */
    event?: YuaStreamEventKind;
  reasoningDelta?: {
    id: string;
    source: "decision" | "tool_gate" | "prompt_runtime";
    title: string;
    body: string;
    ts: number;
  };

  reasoning_panel?: {
  traceId?: string;
  panel: any;
};

  block?: {
    id: string;
    title?: string;
    body?: string;
    inlineSummary?: string;
    groupIndex?: number;
  };
    /**
     * 🔥 Activity (SSOT)
     * - event === "activity"
     */
    activity?: ActivityEventPayload;

    /**
     * 스트림 단계 (UI grouping / classification)
     */
    stage?: YuaStreamStage;

    /**
     * 도메인 이벤트 이름
     * - decision.verdict
     * - decision.suggestion
     */
    topic?: string;

    /**
     * LLM 토큰 (delta)
     * - answer / spine:* 단계에서 사용
     */
    token?: string;


    /**
     * 내부 전용 이벤트 (UI 렌더링 금지)
     */
    internal?: boolean;

    /**
     * answer 스트림의 논리적 종료
     * - UI: 커서 제거 / 입력 재개
     */
    final?: boolean;

    
    /**
     * 🔥 composed 이벤트 전용
     * - token 스트림을 대체하는 최종 answer
     * - UI는 이 값을 통째로 렌더
     */
    finalText?: string;

    /**
     * 스트림 완전 종료 (SSE close)
     * - 반드시 마지막 이벤트 1회만 true
     */
    done?: boolean;

   /**
     * (optional) upstream ordering hint (e.g., OpenAI sequence_number)
     * - StreamEngine가 보장하는 eventId와 별개
     */
    // meta.openaiSeq로 전달하는 것을 권장

    /**
     * SSE resume / Last-Event-ID 대비
     */
    eventId?: number;

    /**
     * (확장 대비)
     * assistant / system / tool 등
     */
    role?: "assistant" | "system" | "tool";

      /**
     * 🔥 UI 제안 payload (SSOT)
     * - event === "suggestion" 일 때 사용
     * - meta 안에 넣지 말 것
     */
    suggestion?: {
      items: YuaSuggestion[];
    };

    /**
     * Memory SSE payload
     */
    memory?: MemoryStreamPayload;

    /**
     * 🔍 Stream internal metadata (SSOT-safe)
     */
    meta?: {
    firstTokenLogged?: boolean;
    firstTokenAt?: number;

    /**
       * upstream ordering hint (OpenAI sequence_number 등)
       */
      openaiSeq?: number;

    /**
     * 🔔 Stream termination reason (SSOT)
     * - aborted
     * - completed
     * - superseded
     * - error
     */
    reason?: string;

    [key: string]: unknown;
    };
  }
