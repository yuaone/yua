import type { AttachmentMeta } from "yua-shared/chat/attachment-types";
import { resolveApiUrl } from "@/adapters/stream/mobileStreamTransport";
import { getMobileToken } from "@/lib/auth/mobileTokenProvider";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB hard limit
const WARN_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB warning threshold

export { WARN_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES };

export type PendingAttachment = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "audio" | "video" | "file";
};

/**
 * Upload a single attachment to the server.
 * Returns AttachmentMeta from the server response.
 *
 * If the upload endpoint is unavailable, falls back to returning
 * a local AttachmentMeta with the local URI.
 */
export async function uploadAttachment(
  pending: PendingAttachment
): Promise<AttachmentMeta> {
  const token = await getMobileToken();
  const url = resolveApiUrl("/api/chat/upload");

  const formData = new FormData();
  formData.append("file", {
    uri: pending.uri,
    name: pending.fileName,
    type: pending.mimeType,
  } as any);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      console.warn("[UPLOAD] Server returned", res.status);
      // Fallback: return local attachment
      return pendingToLocalMeta(pending);
    }

    const data = await res.json();
    if (data?.ok && data.attachment) {
      return data.attachment as AttachmentMeta;
    }

    console.warn("[UPLOAD] Invalid response", data);
    return pendingToLocalMeta(pending);
  } catch (err) {
    console.warn("[UPLOAD] Network error, using local fallback", err);
    // TODO: Implement actual retry or queue-based upload
    return pendingToLocalMeta(pending);
  }
}

/**
 * Upload multiple attachments in parallel.
 */
export async function uploadAttachments(
  attachments: PendingAttachment[]
): Promise<AttachmentMeta[]> {
  return Promise.all(attachments.map(uploadAttachment));
}

/**
 * Convert a PendingAttachment to AttachmentMeta using local URI.
 * Used as fallback when server upload fails.
 */
function pendingToLocalMeta(pending: PendingAttachment): AttachmentMeta {
  return {
    id: pending.id,
    fileName: pending.fileName,
    mimeType: pending.mimeType,
    kind: pending.kind,
    fileUrl: pending.uri,
    sizeBytes: pending.sizeBytes,
    previewUrl: pending.kind === "image" ? pending.uri : undefined,
  };
}

/**
 * Determine the attachment kind from a MIME type.
 */
export function resolveAttachmentKind(
  mimeType: string
): PendingAttachment["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
