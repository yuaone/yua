// 🔒 SSOT: Judgment Rule Definition (PHASE 3 FINAL, SAFE + EXTENDED)

import type { JudgmentInput } from "./judgment-input";

export type JudgmentRuleType =
  | "strict"
  | "soft"
  | "block"
  | "defer";

export type JudgmentRuleSource =
  | "failure-log"
  | "manual"
  | "system"
  | "learning";

export type JudgmentRuleStatus =
  | "active"
  | "weak"
  | "deprecated"
  | "disabled";

/**
 * 🔒 JudgmentRule (GLOBAL SSOT)
 *
 * SSOT:
 * - Rule은 verdict를 생성하지 않는다
 * - Rule은 confidence 변화만 유도한다
 * - Rule은 가볍고 빠르게 평가된다
 */
export interface JudgmentRule {
  id: string;

  type: JudgmentRuleType;

  /**
   * Rule 영향도 (0 ~ 1)
   * verdict 아님
   */
  confidence: number;

  /**
   * 자연 감쇠율
   */
  decay: number;

  source: JudgmentRuleSource;

  /**
   * Rule 생성 힌트 (학습/로그용)
   */
  triggerHint: string;

  createdAt: number;

  lastAppliedAt?: number;

  /**
   * lifecycle 상태
   * confidence 기반 계산 결과
   */
  status?: JudgmentRuleStatus;

  /**
   * 통계 메타
   */
  stats?: {
    hits: number;
    softFailures: number;
    hardFailures: number;
    lastFailureAt?: number;
  };

  /* --------------------------------------------------
   * 🔑 Rule 발동 조건 (SSOT + EXTENSION)
   *
   * SSOT:
   * - 기본 입력은 string
   *
   * EXTENSION:
   * - JudgmentInput 허용
   * - 기존 rule 깨지지 않음
   * - Registry에서 구조 입력 전달 가능
   * -------------------------------------------------- */

  /** SSOT (legacy & stable) */
  match(input: string): boolean | Promise<boolean>;

  /** EXTENDED (normalized / structured input) */
  match(input: JudgmentInput): boolean | Promise<boolean>;
}
