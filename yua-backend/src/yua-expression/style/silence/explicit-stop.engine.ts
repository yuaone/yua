import {
  SilenceContext,
  SilenceDecision,
  SilenceReasonCode,
} from './silence.types';
import { SILENCE_ENGINE_META, SILENCE_THRESHOLDS } from './silence.meta';

export class ExplicitStopEngine {
  static readonly meta = SILENCE_ENGINE_META;

  /**
   * PHASE 1 규칙:
   * - 조건 충족 시 반드시 SILENCE
   * - fallback / soft allow 금지
   */
  static evaluate(ctx: SilenceContext): SilenceDecision | null {
    const now = Date.now();

    // 1) Scope 밖이면 즉시 침묵
    if (ctx.scopeAllowed === false) {
      return this.silence(
        'SCOPE_OUT',
        'R5',
        '요청 범위를 벗어났습니다.',
        'Scope disallowed by judgment scope definition.',
        now
      );
    }

    // 2) 정책 플래그에 의해 차단
    if (ctx.policyFlags && ctx.policyFlags.length > 0) {
      return this.silence(
        'POLICY_BLOCK',
        'R5',
        '정책에 따라 답변할 수 없습니다.',
        `Policy flags triggered: ${ctx.policyFlags.join(', ')}`,
        now
      );
    }

    // 3) 위험 점수 초과
    if (
      typeof ctx.riskScore === 'number' &&
      ctx.riskScore >= SILENCE_THRESHOLDS.risk
    ) {
      return this.silence(
        'UNSAFE',
        'R5',
        '안전하지 않아 답변을 중단합니다.',
        `Risk score ${ctx.riskScore} >= ${SILENCE_THRESHOLDS.risk}`,
        now
      );
    }

    // 4) 불확실성 초과
    if (
      typeof ctx.uncertaintyScore === 'number' &&
      ctx.uncertaintyScore >= SILENCE_THRESHOLDS.uncertainty
    ) {
      return this.silence(
        'UNCERTAIN',
        'R4',
        '확실하지 않아 답변을 제공하지 않습니다.',
        `Uncertainty score ${ctx.uncertaintyScore} >= ${SILENCE_THRESHOLDS.uncertainty}`,
        now
      );
    }

    // PHASE 1에서는 통과 시 아무 것도 하지 않음 (표현 계층으로 진행)
    return null;
  }

  private static silence(
    reasonCode: SilenceReasonCode,
    responsibilityLevel: 'R4' | 'R5',
    messageForUser: string,
    internalNote: string,
    timestamp: number
  ): SilenceDecision {
    return {
      silent: true,
      reasonCode,
      responsibilityLevel,
      messageForUser,
      internalNote,
      timestamp,
    };
  }
}
