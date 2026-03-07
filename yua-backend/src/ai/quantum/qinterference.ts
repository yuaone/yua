// 📂 src/ai/quantum/qinterference.ts
// 🔥 FINAL ENTERPRISE BUILD (2025.12) — ERROR-FREE VERSION

export interface WaveState {
    real: number[];
    imag: number[];
}

export function computeWorkingWave(
    curr: WaveState,
    mem: WaveState | null,
    influence: number = 0.5
): WaveState {
    // Memory가 없거나 비어있으면 현재 wave 그대로 반환
    if (!mem || !Array.isArray(mem.real) || !Array.isArray(mem.imag)) {
        return curr;
    }
    if (mem.real.length === 0 || mem.imag.length === 0) {
        return curr;
    }

    // 길이 보정 — 모든 배열의 최소 길이 사용
    const D = Math.min(
        curr.real.length,
        curr.imag.length,
        mem.real.length,
        mem.imag.length
    );
    if (D === 0) return curr;

    const real: number[] = new Array(D);
    const imag: number[] = new Array(D);

    for (let i = 0; i < D; i++) {
        real[i] = curr.real[i] + influence * (mem.real[i] ?? 0);
        imag[i] = curr.imag[i] + influence * (mem.imag[i] ?? 0);
    }

    // 🔥 L2 Normalize (||ψ|| = 1)
    const norm =
        Math.sqrt(
            real.reduce((a, b) => a + b * b, 0) +
            imag.reduce((a, b) => a + b * b, 0)
        ) || 1;

    return {
        real: real.map((v) => v / norm),
        imag: imag.map((v) => v / norm)
    };
}
