"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import FileBlockView from "./FileBlockView";
import type { FileCategory } from "../extensions/file-block";

export default function FileBlockNodeView({ node, selected }: NodeViewProps) {
  const attrs = node.attrs as {
    fileName: string;
    extension: string;
    category: FileCategory;
    sizeBytes: number;
    url: string;
    uploadStatus: string;
    uploadProgress: number;
  };

  return (
    <NodeViewWrapper className="my-2">
      <FileBlockView
        fileName={attrs.fileName}
        extension={attrs.extension}
        category={attrs.category}
        sizeBytes={attrs.sizeBytes}
        url={attrs.url}
        uploadStatus={attrs.uploadStatus}
        uploadProgress={attrs.uploadProgress}
        selected={selected}
      />
    </NodeViewWrapper>
  );
}
