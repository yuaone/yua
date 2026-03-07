// 📂 src/ai/quantum/qentangle.ts
// 🔥 Entanglement Engine — FINAL ENTERPRISE PATCH (2025.12)

export interface ComplexState {
  real: number[];
  imag: number[];
}

export class EntangleEngine {
  /* -------------------- 1) Tensor Product -------------------- */
  static tensorProduct(A: ComplexState, B: ComplexState) {
    const D = Math.min(A.real.length, A.imag.length, B.real.length, B.imag.length);
    const real: number[][] = [];
    const imag: number[][] = [];

    for (let i = 0; i < D; i++) {
      real[i] = [];
      imag[i] = [];

      for (let j = 0; j < D; j++) {
        const ac = A.real[i] * B.real[j];
        const bd = A.imag[i] * B.imag[j];
        const ad = A.real[i] * B.imag[j];
        const bc = A.imag[i] * B.real[j];

        real[i][j] = ac - bd;
        imag[i][j] = ad + bc;
      }
    }

    return { real, imag };
  }

  /* -------------------- 2) Conditional State -------------------- */
  static conditionalState(
    joint: { real: number[][]; imag: number[][] },
    k: number
  ): ComplexState {
    const idx = Math.max(0, Math.min(k, joint.real.length - 1));
    return {
      real: joint.real[idx] ?? [],
      imag: joint.imag[idx] ?? []
    };
  }

  /* -------------------- 3) Normalize -------------------- */
  static normalize(state: ComplexState): ComplexState {
    const L = Math.min(state.real.length, state.imag.length);
    let norm = 0;

    for (let i = 0; i < L; i++) {
      norm += state.real[i] ** 2 + state.imag[i] ** 2;
    }

    norm = Math.sqrt(norm) || 1;

    return {
      real: state.real.map((x) => x / norm),
      imag: state.imag.map((x) => x / norm)
    };
  }

  /* -------------------- 4) v2 공식 API -------------------- */
  static jointConditional(
    real: number[],
    imag: number[],
    collapseIndex: number,
    influence = 0.3
  ): ComplexState {
    const D = Math.min(real.length, imag.length);
    if (D === 0) return { real: [], imag: [] };

    const idx = Math.max(0, Math.min(collapseIndex, D - 1));

    const newReal = real.map((x, i) =>
      i === idx ? x + influence * Math.abs(x) : x
    );

    const newImag = imag.map((x, i) =>
      i === idx ? x + influence * Math.abs(x) : x
    );

    return EntangleEngine.normalize({ real: newReal, imag: newImag });
  }

  /* -------------------- 5) v1 호환 API -------------------- */
  static conditionalProb(
    real: number[],
    imag: number[],
    index: number,
    influence = 0.3
  ) {
    return EntangleEngine.jointConditional(real, imag, index, influence);
  }
}
