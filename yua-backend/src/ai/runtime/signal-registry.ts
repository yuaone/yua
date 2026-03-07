// 🔒 PHASE 9-7 Signal Registry (SSOT)
// - runtime 영향 ❌
// - 자동 실행 ❌
// - mutation 적용 ❌

export type RuntimeSignalType =
  | "DRIFT"
  | "FAILURE_CLUSTER"
  | "OOD";

export type RuntimeSignal = {
  type: RuntimeSignalType;
  path: string;
  score: number; // 0~1
  meta: Record<string, unknown>;
  detectedAt: number;
};

const signals: RuntimeSignal[] = [];

export class SignalRegistry {
  static emit(signal: RuntimeSignal) {
    signals.push(signal);
  }

  static getAll(): RuntimeSignal[] {
    return [...signals];
  }

  static getByPath(path: string): RuntimeSignal[] {
    return signals.filter(s => s.path === path);
  }

  static clear() {
    signals.length = 0;
  }
}
