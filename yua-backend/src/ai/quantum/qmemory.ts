// 📂 src/ai/quantum/qmemory.ts
// 🔥 Quantum Memory Layer — ENTERPRISE FINAL (2025.12)
// - WaveState 100% 호환
// - Null 방지
// - Exponential Decay Memory
// - TS Strict 완전 통과

export interface ComplexWave {
  real: number[];
  imag: number[];
}

export interface WaveState {
  real: number[];
  imag: number[];
}

export class QuantumMemory {
  private static _history: ComplexWave[] = [];
  private static readonly MAX = 20;

  /** ----------------------------------------------------
   *  저장 (Length mismatch 자동 보정)
   * ---------------------------------------------------- */
  static save(wave: ComplexWave) {
    if (!wave || !Array.isArray(wave.real) || !Array.isArray(wave.imag)) return;

    const len = Math.min(wave.real.length, wave.imag.length);

    if (len <= 0) return;

    // 안전 저장
    const normalized: ComplexWave = {
      real: wave.real.slice(0, len),
      imag: wave.imag.slice(0, len),
    };

    this._history.push(normalized);

    if (this._history.length > this.MAX) {
      this._history.shift();
    }
  }

  /** 최근 N개 기록 */
  static getRecent(n: number): ComplexWave[] {
    if (this._history.length === 0) return [];
    return this._history.slice(-n);
  }

  /** ----------------------------------------------------
   *  지수 감쇠 기반 Memory Wave
   *  - 항상 WaveState 리턴 (null 절대 없음)
   *  - 길이 mismatch 자동 보정
   * ---------------------------------------------------- */
  static getMemoryWave(decay = 0.9): WaveState {
    const list = this.getRecent(10);
    if (list.length === 0) return { real: [], imag: [] };

    const last = list[list.length - 1];
    const length = Math.min(last.real.length, last.imag.length);

    if (length === 0) return { real: [], imag: [] };

    const real = new Array(length).fill(0);
    const imag = new Array(length).fill(0);

    // weight = decay^(T-k-1)
    const T = list.length;
    const weights = list.map((_, k) => Math.pow(decay, T - k - 1));
    const sumW = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < T; i++) {
      const w = weights[i] / sumW;
      const cw = list[i];

      for (let j = 0; j < length; j++) {
        const r = cw.real[j] ?? 0;
        const im = cw.imag[j] ?? 0;

        real[j] += r * w;
        imag[j] += im * w;
      }
    }

    return { real, imag };
  }
}
