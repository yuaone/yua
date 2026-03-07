export type AttachmentMeta = {
  id: string;
  fileName?: string;
  mimeType?: string;
  kind: "image" | "audio" | "video" | "file";
  fileUrl?: string; // 🔥 이거
  sizeBytes?: number;
  previewUrl?: string;
  url?: string;
};
