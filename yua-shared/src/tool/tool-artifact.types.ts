// tool-artifact.types.ts
// SSOT: Tool execution artifact (image panel, CSV preview, code output)

export type ToolArtifactKind =
  | "IMAGE_PANEL"      // image analysis -> dedicated panel
  | "CSV_PREVIEW"      // CSV/table preview inline
  | "CODE_OUTPUT"      // code_interpreter vector/chart -> inline
  | "CODE_ERROR";      // code_interpreter error

export type ToolArtifact = {
  kind: ToolArtifactKind;

  /** image URL (for IMAGE_PANEL / CODE_OUTPUT charts) */
  imageUrl?: string;

  /** alt text or caption */
  caption?: string;

  /** CSV header + rows preview */
  csvPreview?: {
    headers: string[];
    rows: string[][];
    totalRows: number;
  };

  /** code block (input or output) */
  code?: {
    language: string;
    source: string;
    output?: string;
  };

  /** MIME type hint */
  mimeType?: string;
};
