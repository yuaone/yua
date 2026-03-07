// 📂 src/ai/style/utils/normalize.ts

import { StyleSignal } from "../detector.interface";

function clamp(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function normalize(signal: StyleSignal): StyleSignal {
  return {
    casual: clamp(signal.casual),
    expressive: clamp(signal.expressive),
    fragmented: clamp(signal.fragmented),
    formal: clamp(signal.formal),
  };
}
