// 📂 src/ai/metadata/metadata-ingest.service.ts

import {
  sanitizeMetadataEvent,
} from "./metadata-sanitizer";
import { MetadataRepository } from "./metadata.repo";
import type {
  MetadataEvent,
} from "./metadata.types";

export async function ingestMetadata(
  event: MetadataEvent
): Promise<void> {
  const sanitized =
    sanitizeMetadataEvent(event);

  await MetadataRepository.insertEvent(
    sanitized
  );
}
