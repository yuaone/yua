import { FileIntelAttachment } from "../types";

export function hasFileAttachments(att: FileIntelAttachment[] | undefined | null): boolean {
  return Array.isArray(att) && att.length > 0;
}
