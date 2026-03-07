import { SilenceDecision } from '../../yua-expression/style/silence/silence.types';

export class OutputBlocker {
  /**
   * SilenceDecision이 있으면 출력 차단
   * - 표현 엔진 결과는 절대 노출하지 않음
   */
  static blockIfSilent<T>(
    silence: SilenceDecision | null,
    _payload: T
  ): { blocked: true; decision: SilenceDecision } | { blocked: false } {
    if (silence) {
      return { blocked: true, decision: silence };
    }
    return { blocked: false };
  }
}
