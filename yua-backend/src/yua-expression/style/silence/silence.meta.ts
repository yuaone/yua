export const SILENCE_ENGINE_META = {
  engineId: 'yua.silence.explicit-stop',
  version: '1.0.0',
  phase: 'PHASE_1',
  responsibility: 'R5',
  description:
    'Forces explicit silence when risk/uncertainty/policy exceeds thresholds. No fallback.',
  immutable: true,
} as const;

// PHASE 1 고정 임계값 (운영 중 변경 금지)
export const SILENCE_THRESHOLDS = {
  risk: 0.7,
  uncertainty: 0.6,
} as const;
