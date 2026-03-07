// 🔒 INPUT SIGNAL DETECTOR — SSOT FINAL (PHASE 6-2)
// -----------------------------------------------
// 책임:
// - 사용자 입력에서 "행동 신호"만 추출
//
// 금지:
// - 추론 ❌
// - 판단 ❌
// - async ❌
// - LLM ❌
//
// 출력은 TaskResolver / ExecutionDispatcher만 사용

export interface InputSignals {
  hasImage: boolean;
  hasCodeBlock: boolean;
  hasErrorLog: boolean;
}

/**
 * Deterministic input signal detector
 */
export function detectInputSignals(args: {
  message: string;
  attachments?: unknown[];
}): InputSignals {
  const { message, attachments } = args;

  const text = message ?? "";

  /* ---------------------------------- */
  /* IMAGE                               */
  /* ---------------------------------- */
  const hasImage =
    Array.isArray(attachments) &&
    attachments.some(
      (a) => typeof a === "object" && (a as any).kind === "image"
    );

  /* ---------------------------------- */
  /* CODE BLOCK                          */
  /* ---------------------------------- */
  const hasCodeBlock =
    /```[\s\S]*?```/m.test(text) ||
    /(class |function |const |let |var |=>)/.test(text);

  /* ---------------------------------- */
  /* ERROR LOG                           */
  /* ---------------------------------- */
  const hasErrorLog =
    /(error|exception|stack trace|ts\d{4}|TypeError|ReferenceError)/i.test(
      text
    );

  return {
    hasImage,
    hasCodeBlock,
    hasErrorLog,
  };
}
