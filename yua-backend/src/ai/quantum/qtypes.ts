// 📂 src/ai/quantum/qtypes.ts
// 🔥 Quantum Unified Types — FINAL ENTERPRISE 2025.12

export interface QuantumState {
    /** v2 wave state - 복소수 실수부 */
    real?: number[];
    /** v2 wave state - 복소수 허수부 */
    imag?: number[];

    /** v1 legacy */
    vector?: number[];
    noise?: number;
    confidence?: number;

    /** 차원 */
    dimensionality: number;
}

export interface QuantumResult {
    raw: string;
    collapsed: string;

    /** Quantum Engine v1/v2 공통 state */
    state: QuantumState;

    /** optional metadata */
    drift?: number;
    related?: any[];
    collapseIndex?: number;

    /** router에서 사용될 optional preview */
    rawTextPreview?: string;
    collapseProbabilities?: number[];
}
