// 📂 src/ai/phase9/normalize/event-normalizer.ts
// 🔥 PHASE 9 Event Normalizer — RAW → NORMALIZED (SSOT)
// - Business logic 최소: "분류/정규화"만
// - Memory/Embedding/Decision 로직 호출 ❌
// - payload가 과거/혼재 형태여도 절대 throw 하지 않도록 설계

import type {
  RawEventRow,
  NormalizedEventInsert,
  NormalizedIntent,
} from "./normalize.types";
import { asObject, asNumber, asString, isNonEmptyString } from "./normalize.types";

/* --------------------------------------------------
 * Detectors (payload tolerant)
 * -------------------------------------------------- */

function detectHasText(payload: Record<string, any> | null): boolean {
  if (!payload) return false;

  // 가장 신뢰: cleanMessage / message / text
  const candidates = [
    payload.cleanMessage,
    payload.message,
    payload.text,
    payload.input,
    payload.userMessage,
    payload.prompt,
  ];
  for (const c of candidates) {
    if (isNonEmptyString(c) && c !== "[IMAGE_INPUT]") return true;
  }

  // 길이 기반 fallback
  const len =
    asNumber(payload.messageLength) ??
    asNumber(payload.inputLength) ??
    asNumber(payload.promptLength) ??
    null;

  if (typeof len === "number" && len > 0) return true;

  return false;
}

function detectHasImage(payload: Record<string, any> | null): boolean {
  if (!payload) return false;

  // attachments
  const attachments = payload.attachments;
  if (Array.isArray(attachments) && attachments.length > 0) return true;

  const attachmentsLength = asNumber(payload.attachmentsLength);
  if (typeof attachmentsLength === "number" && attachmentsLength > 0) return true;

  // files 형태
  const files = payload.files;
  if (Array.isArray(files) && files.some((f) => f?.fileKind === "image" || f?.kind === "image")) {
    return true;
  }

  // 단일 flag
  if (payload.hasImage === true) return true;
  if (payload.isMultimodal === true) return true;

  // url 형태
  const imageUrl = payload.imageUrl ?? payload.image_url ?? payload.fileUrl;
  if (isNonEmptyString(imageUrl)) return true;

  return false;
}

function detectTurnIntent(payload: Record<string, any> | null): string | null {
  if (!payload) return null;

  const candidates = [
    payload.turnIntent,
    payload.intent, // sometimes already contains QUESTION/SHIFT etc
    payload.normalizedIntent,
  ];

  for (const c of candidates) {
    const s = asString(c);
    if (s && s.trim().length > 0) return s.trim();
  }
  return null;
}

/**
 * Normalized intent 결정 규칙 (SSOT)
 * - "chat/execution/decision/memory" 같은 phase는 힌트일 뿐
 * - 가능한 경우 payload.turnIntent(QUESTION/CONTINUATION/SHIFT) 우선
 */
function resolveNormalizedIntent(args: {
  eventKind: string;
  phase: string;
  actor: string;
  payload: Record<string, any> | null;
}): NormalizedIntent {
  const { eventKind, phase, actor, payload } = args;

  // 1) error 최우선
  if (eventKind === "error" || phase === "error") return "error";
  if (actor === "system" && phase === "decision" && payload?.verdict === "BLOCK") return "decision";

  // 2) payload.turnIntent가 명시돼 있으면 그걸 우선 매핑
  const turn = (detectTurnIntent(payload) ?? "").toUpperCase();
  if (turn === "QUESTION") return "question";
  if (turn === "CONTINUATION") return "continuation";
  if (turn === "SHIFT") return "shift";
  if (turn === "DESIGN") return "design";
  if (turn === "DECISION") return "decision";

  // 3) phase 기반 fallback
  if (phase === "decision" || eventKind === "decision") return "decision";
  if (phase === "execution" || eventKind === "execution") return "design"; // 실행은 "질문/설계" 둘 다 가능 → design으로 두고 다음 단계에서 signal로 보정
  if (phase === "memory") return "decision"; // memory는 decision계열 취급 (SSOT)

  // 4) payload 내용 기반 fallback
  const msg = payload?.cleanMessage ?? payload?.message ?? payload?.text ?? "";
  if (typeof msg === "string") {
    // 아주 약한 힌트: 설계/구현 키워드
    if (/(설계|아키텍처|구현|리팩토링|diff|코드|타입|schema|DB|sql)/i.test(msg)) {
      return "design";
    }
  }

  // 5) 기본값: question
  return "question";
}

/* --------------------------------------------------
 * Public API
 * -------------------------------------------------- */

/**
 * RAW row → normalized insert payload
 * - 반환 null이면 "정규화 대상 아님" (ex: 내부 stage-only 이벤트 등)
 * - 절대 throw 금지
 */
export function normalizeRawEvent(row: RawEventRow): NormalizedEventInsert | null {
  try {
    const payload = asObject(row.payload);

    const actor = String(row.actor ?? "").toLowerCase();
    const eventKind = String(row.event_kind ?? "").toLowerCase();
    const phase = String(row.phase ?? "").toLowerCase();

    // ✅ phase9_raw_event_log는 "의미 이벤트"만 들어온다고 가정하되,
    // 혹시 과거 raw_event_log 혼입을 대비해 guard
    if (!row.event_id || !row.workspace_id) return null;

    const hasText = detectHasText(payload);
    const hasImage = detectHasImage(payload);
    const isMultimodal = hasText && hasImage;

    // intent 결정
    const intent = resolveNormalizedIntent({
      actor,
      eventKind,
      phase,
      payload,
    });

    // turn_intent는 payload에 있으면 저장, 없으면 null
    const turnIntent = detectTurnIntent(payload);

    // confidence: row 우선, 없으면 payload.confidence fallback
    const conf =
      (typeof row.confidence === "number" ? row.confidence : null) ??
      (payload ? asNumber(payload.confidence) : null);

    return {
      eventId: row.event_id,
      workspaceId: row.workspace_id,
      threadId: row.thread_id ?? null,

      intent,
      turnIntent: turnIntent ?? null,

      hasText,
      hasImage,
      isMultimodal,

      confidence: typeof conf === "number" ? conf : null,
    };
  } catch {
    // 🔒 normalize는 best-effort
    return null;
  }
}
