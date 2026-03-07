import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import FileBlockNodeView from "../nodes/FileBlockNodeView";

export type FileCategory =
  | "pdf" | "document" | "spreadsheet" | "csv"
  | "presentation" | "archive" | "text" | "image"
  | "video" | "audio" | "code" | "unknown";

export type FileBlockAttrs = {
  id: string;
  fileName: string;
  extension: string;
  category: FileCategory;
  sizeBytes: number;
  url: string;
  uploadStatus: "pending" | "uploading" | "complete" | "error";
  uploadProgress: number;
};

const EXT_CATEGORY_MAP: Record<string, FileCategory> = {
  pdf: "pdf",
  doc: "document", docx: "document",
  xls: "spreadsheet", xlsx: "spreadsheet",
  csv: "csv",
  ppt: "presentation", pptx: "presentation",
  zip: "archive", rar: "archive", "7z": "archive",
  txt: "text", md: "text",
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", svg: "image",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio",
  js: "code", ts: "code", py: "code", go: "code", rs: "code", java: "code",
  tsx: "code", jsx: "code", rb: "code", php: "code", c: "code", cpp: "code",
};

export function detectCategory(ext: string): FileCategory {
  return EXT_CATEGORY_MAP[ext.toLowerCase()] ?? "unknown";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    fileBlock: {
      insertFileBlock: (attrs: Partial<FileBlockAttrs>) => ReturnType;
    };
  }
}

export const FileBlock = Node.create({
  name: "fileBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: "" },
      fileName: { default: "" },
      extension: { default: "" },
      category: { default: "unknown" as FileCategory },
      sizeBytes: { default: 0 },
      url: { default: "" },
      uploadStatus: { default: "complete" },
      uploadProgress: { default: 100 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "file-block",
        class: "file-block-node",
      }),
      HTMLAttributes.fileName || "file",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileBlockNodeView);
  },

  addCommands() {
    return {
      insertFileBlock:
        (attrs) =>
        ({ commands }) => {
          const id = attrs.id || crypto.randomUUID();
          const ext = attrs.extension || attrs.fileName?.split(".").pop() || "";
          const category = attrs.category || detectCategory(ext);
          return commands.insertContent({
            type: this.name,
            attrs: { ...attrs, id, extension: ext, category },
          });
        },
    };
  },
});
