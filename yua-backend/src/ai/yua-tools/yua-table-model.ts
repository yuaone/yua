// 📂 src/ai/yua-tools/yua-table-model.ts
// 🔒 TableModel SSOT — 모든 표 연산의 단일 진실 원본

export type TableProvenance = {
  sourceToolRunId: string;
  sourceArtifactUri?: string;
  extractedFrom?: "PDF" | "IMAGE" | "CSV" | "JSON";
  page?: number;
};

export type TableModel = {
  id: string;                     // toolRunId 기반
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  columnCount: number;
  sourceHash: string;             // bytes hash
  confidence?: number;
  provenance: TableProvenance;
};
