// 🔒 INPUT EXTRACTOR — SSOT FINAL (PHASE 6-4)
// -----------------------------------------
// 책임:
// - 사용자 입력에서 실행용 payload만 추출
//
// 금지:
// - 추론 ❌
// - 판단 ❌
// - async ❌
// - LLM ❌
//
// 출력은 ExecutionDispatcher 전용

import type { ImageObservationInput } from "../image/image-observer";

export interface ExtractedInputPayload {
  imageData?: ImageObservationInput;
  codeBlock?: string;
  errorLog?: string;
}

/**
 * Deterministic payload extractor
 */
export function extractInputPayload(args: {
  message: string;
  attachments?: unknown[];
}): ExtractedInputPayload {
  const { message, attachments } = args;

  const payload: ExtractedInputPayload = {};

  /* ---------------------------------- */
  /* IMAGE PAYLOAD                       */
  /* ---------------------------------- */
  if (Array.isArray(attachments)) {
    const imageMeta = attachments.find(
      (a) =>
        typeof a === "object" &&
        a !== null &&
        (a as any).kind === "image"
    );

    if (imageMeta) {
      payload.imageData = {
        metadata: {
          mimeType: (imageMeta as any).mimeType,
        },
      };
    }
  }

  /* ---------------------------------- */
  /* CODE BLOCK                          */
  /* ---------------------------------- */
  const codeMatch = message.match(/```([\s\S]*?)```/m);
  if (codeMatch && codeMatch[1]) {
    payload.codeBlock = codeMatch[1].trim();
  }

  /* ---------------------------------- */
  /* ERROR LOG                           */
  /* ---------------------------------- */
  if (
    /(error|exception|stack trace|ts\d{4}|TypeError|ReferenceError)/i.test(
      message
    )
  ) {
    payload.errorLog = message;
  }

  return payload;
}
