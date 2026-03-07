// 🔒 PHASE 4-D
// Judgment Learning Policy (SSOT)

export interface JudgmentLearningPolicy {
  /** 최소 failure 누적 개수 */
  minFailures: number;

  /** 최소 실행 간격 (ms) */
  minIntervalMs: number;

  /** stream 중 실행 허용 여부 */
  allowDuringStream: boolean;
}

export const DEFAULT_JUDGMENT_LEARNING_POLICY: JudgmentLearningPolicy = {
  minFailures: 3,
  minIntervalMs: 1000 * 30, // 30초
  allowDuringStream: false,
};
