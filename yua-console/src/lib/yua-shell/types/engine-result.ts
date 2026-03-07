// ===================================================================
// EngineResult — SSOT 10.0 FINAL (Soft Type)
// ===================================================================

export interface EngineResult {
  ok: boolean;

  output?: any;
  error?: string;

  engine?: string;
  raw?: string;

  executionId?: string;
  duration?: number;

  meta?: Record<string, any>;
}
