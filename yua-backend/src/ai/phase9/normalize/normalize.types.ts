// 📂 src/ai/phase9/normalize/normalize.types.ts
// 🔥 PHASE 9 Normalize Types — SSOT
// - RAW → NORMALIZED 변환 전용
// - 판단/학습/embedding ❌
// - DB schema: phase9_raw_event_log / phase9_normalized_events 호환

export type RawEventActor = "user" | "yua" | "tool" | "model" | "system";
export type RawEventKind =
  | "message"
  | "decision"
  | "execution"
  | "tool_call"
  | "error"
  | "file_rag_metrics";

export type RawEventPhase = "chat" | "decision" | "execution" | "memory"| "prompt";

/**
 * DB: normalized_intent ENUM과 1:1 매핑
 */
export type NormalizedIntent =
  | "question"
  | "design"
  | "decision"
  | "continuation"
  | "shift"
  | "error";

/**
 * phase9_raw_event_log row shape (최소)
 * - payload는 jsonb라 unknown으로 받는다.
 */
export type RawEventRow = {
  event_id: string; // uuid
  occurred_at?: string | Date;
  workspace_id: string; // uuid
  thread_id: number | null;
  trace_id: string | null;
  actor: RawEventActor | string;
  event_kind: RawEventKind | string;
  phase: RawEventPhase | string;
  payload: unknown;
  confidence?: number | null;
  risk?: number | null;
  path?: string | null;
  verdict?: string | null;
};

/**
 * phase9_normalized_events insert payload
 * - event_id는 FK
 */
export type NormalizedEventInsert = {
  eventId: string;
  workspaceId: string;
  threadId: number | null;

  intent: NormalizedIntent;
  turnIntent: string | null; // QUESTION / CONTINUATION / SHIFT 등 (있는 경우만)

  hasText: boolean;
  hasImage: boolean;
  isMultimodal: boolean;

  confidence: number | null;
};

/* --------------------------------------------------
 * Helpers (safe parsing)
 * -------------------------------------------------- */

export function asObject(v: unknown): Record<string, any> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, any>;
}

export function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  return null;
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
