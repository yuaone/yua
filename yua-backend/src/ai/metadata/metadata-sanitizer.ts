// 🔒 Metadata Sanitizer — PHASE 12-9-5
// ----------------------------------
// TEXT / reasoning / content 차단

import type { MetadataEvent } from "./metadata.types";

const FORBIDDEN_KEYS = [
  "content",
  "message",
  "text",
  "prompt",
  "response",
  "reasoning",
  "chain",
];

export function sanitizeMetadataEvent(
  event: MetadataEvent
): MetadataEvent {
  const payload = event.payload as Record<string, any>;

  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_KEYS.some(f => key.includes(f))) {
      throw new Error(
        `forbidden_metadata_field: ${key}`
      );
    }
  }

  return {
    ...event,
    createdAt: event.createdAt ?? new Date(),
  };
}
