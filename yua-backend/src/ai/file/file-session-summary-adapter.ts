// 🔥 FILE SESSION SUMMARY ADAPTER — STABLE VERSION
// 목적:
// - Tool raw result → 안전 요약
// - LLM 주입용 compact summary 생성
// - 토큰 폭발 방지
// - 내부 metadata 노출 방지

export function buildFileSessionSummary(result: any): any {
  if (!result || typeof result !== "object") return null;

  const output = result.output ?? result;

  if (!output || typeof output !== "object") {
    return null;
  }

  const summary: any = {};

  // 안전한 필드만 추출
  if (typeof output.rowCount === "number") {
    summary.rowCount = output.rowCount;
  }

  if (Array.isArray(output.columns)) {
    summary.columns = output.columns.slice(0, 50);
  }

  if (Array.isArray(output.numericColumns)) {
    summary.numericColumns = output.numericColumns.slice(0, 50);
  }

  if (output.schema && typeof output.schema === "object") {
    summary.schemaDetected = true;
  }

  summary.generatedAt = new Date().toISOString();

  return summary;
}
