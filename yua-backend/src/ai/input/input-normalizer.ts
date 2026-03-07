// src/ai/input/input-normalizer.ts

import type {
  RawInput,
  NormalizedInput,
  InputAttachment,
} from "./input-types";

/**
 * ✅ SSOT-COMPLIANT normalizeInput
 *
 * RawInput → NormalizedInput
 * - 판단 ❌
 * - 라우팅 ❌
 * - 형태 + 메타 정규화만 수행
 */
export function normalizeInput(raw: RawInput): NormalizedInput {
  const now = Date.now();

  return {
    content: raw.content.trim(),
    source: raw.source,
    pathHint: raw.pathHint,
    traceId: raw.traceId ?? `trace_${now}`,
    receivedAt: now,
    attachments: normalizeAttachments(raw.attachments),
  };
}

/* --------------------------------------------------
 * 🔹 helpers
 * -------------------------------------------------- */

function normalizeAttachments(
  attachments?: InputAttachment[]
): InputAttachment[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;

  return attachments.map((a) => ({
    type: a.type,
    uri: a.uri,
    mimeType: a.mimeType,
    name: a.name,
    sizeBytes: a.sizeBytes,
  }));
}
