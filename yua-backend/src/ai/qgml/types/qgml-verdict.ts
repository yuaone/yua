// 🔒 QGML VERDICT — SSOT FINAL

export interface QGMLVerdict {
  allowed: boolean;
  blocked: boolean;
  deferred: boolean;
  reason?: string;
}
