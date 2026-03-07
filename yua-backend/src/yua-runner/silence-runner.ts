import { ExplicitStopEngine } from '../yua-expression/style/silence/explicit-stop.engine';
import { SilenceContext } from '../yua-expression/style/silence/silence.types';
import { OutputBlocker } from '../yua-assembly/assembler/output-blocker';

/**
 * PHASE 1 유일한 진입점
 * - 다른 엔진보다 항상 먼저 호출
 */
export class SilenceRunner {
  static run<T>(
    ctx: SilenceContext,
    next: () => T
  ): T | { silent: true; decision: ReturnType<typeof ExplicitStopEngine.evaluate> } {
    const decision = ExplicitStopEngine.evaluate(ctx);
    const blocked = OutputBlocker.blockIfSilent(decision, null as unknown as T);

    if (blocked.blocked) {
      return { silent: true, decision };
    }

    // 통과 시에만 다음 단계 실행
    return next();
  }
}
