export type FileIntelAttachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;

  /** server-side local temp path */
  localPath: string;
};

export type FileIntelIR = {
  fileId: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;

  structure: {
    type: "TEXT" | "TABLE" | "NOTEBOOK" | "ARCHIVE" | "PDF";
    pages?: number;
    sheets?: number;
    rows?: number;
    columns?: string[];
  };

  /**
   * STORAGE-SAFE preview only.
   * Big content goes into file_chunks.
   */
  content: {
    previewText?: string;
    tablesPreview?: Array<{
      sheet?: string;
      columns: string[];
      rowCount?: number;
      rowsPreview: Record<string, any>[];
    }>;
    cellsPreview?: string[];
    nestedFiles?: FileIntelIR[];
  };

  metadata: {
    extractedAt: number;
    warnings?: string[];
  };
};

export type DetectedSchema =
  | { kind: "TEXT" }
  | { kind: "TABLE"; columns: string[] }
  | { kind: "NOTEBOOK" }
  | { kind: "PDF" }
  | { kind: "ARCHIVE" };

export type FileChunk = {
  chunkIndex: number;
  chunkType: "TEXT" | "TABLE_WINDOW" | "PDF_TEXT" | "NB_CELL" | "ARCHIVE_ENTRY";
  content: string;
  tokenEstimate?: number;
  metadata?: Record<string, any>;
};

export type ExtractedFile =
  | ExtractedTextFile
  | ExtractedJsonFile
  | ExtractedTableFile
  | ExtractedPdfFile
  | ExtractedNotebookFile
  | ExtractedArchiveFile;

export type ExtractedBase = {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType?: string | null;
  sizeBytes: number;
  localPath: string;
  warnings: string[];
};

export type ExtractedTextFile = ExtractedBase & {
  kind: "TEXT";
  readText: () => Promise<string>;
};

export type ExtractedJsonFile = ExtractedBase & {
  kind: "JSON";
  readJsonText: () => Promise<string>;
};

export type ExtractedTableFile = ExtractedBase & {
  kind: "TABLE";
  tables: Array<{
    sheet?: string;
    columns: string[];
    rowIterator: () => AsyncGenerator<Record<string, any>, void, unknown>;
    rowCountEstimate?: number;
  }>;
};

export type ExtractedPdfFile = ExtractedBase & {
  kind: "PDF";
  readText: () => Promise<string>;
};

export type ExtractedNotebookFile = ExtractedBase & {
  kind: "NOTEBOOK";
  cells: string[];
};

export type ExtractedArchiveFile = ExtractedBase & {
  kind: "ARCHIVE";
  entries: ExtractedFile[];
  /** temp dir holding extracted entry files; will be cleaned up by runner */
  tempDir: string;
};
