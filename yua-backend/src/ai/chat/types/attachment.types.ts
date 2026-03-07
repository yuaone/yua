export interface AttachmentMeta {
  kind: "image" | "audio" | "video" | "file";
  fileName?: string;
  mimeType?: string;
  url?: string;
}