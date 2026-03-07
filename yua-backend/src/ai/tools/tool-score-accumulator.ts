// 📂 src/ai/tools/tool-score-accumulator.ts
// 🔒 Tool Score Accumulator (PHASE 8-5, SSOT)

export type ToolScoreRecord = {
  total: number;
  count: number;
};

const toolScoreStore = new Map<string, ToolScoreRecord>();

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 🔒 누적 기록
 * - 판단 ❌
 * - tool 성공/실패 결과만 반영
 */
export function accumulateToolScore(args: {
  traceId: string;
  delta: number;
}): void {
  const { traceId, delta } = args;

  const prev =
    toolScoreStore.get(traceId) ?? { total: 0, count: 0 };

  toolScoreStore.set(traceId, {
    total: clamp(prev.total + delta, -1, 1),
    count: prev.count + 1,
  });
}

/**
 * 🔒 평균 tool score 조회
 * - confidence-router 전용
 */
export function getAccumulatedToolScore(
  traceId: string
): number {
  const rec = toolScoreStore.get(traceId);
  if (!rec || rec.count === 0) return 0;
  return clamp(rec.total / rec.count, -1, 1);
}

/**
 * 🔒 lifecycle 종료 시 정리
 */
export function clearToolScore(traceId: string): void {
  toolScoreStore.delete(traceId);
}
