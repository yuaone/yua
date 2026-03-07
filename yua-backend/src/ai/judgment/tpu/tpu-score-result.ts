// 🔒 TPU Strategy Score (SSOT SAFE)

export interface TPUStrategyScore {
  /**
   * 전략 식별자
   */
  strategy: string;

  /**
   * 신뢰 점수 (0 ~ 1)
   * verdict 아님
   */
  score: number;
}
