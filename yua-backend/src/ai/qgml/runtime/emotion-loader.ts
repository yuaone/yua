// 🔒 Emotion Loader (Numeric Only)

import { EmotionNode, QGMLEmotionState } from "../types";

export function loadEmotionState(
  emotion?: EmotionNode
): QGMLEmotionState {
  if (!emotion) {
    return { valence: 0.5, arousal: 0.5, dominance: 0.5 };
  }

  return {
    valence: clamp(emotion.valence),
    arousal: clamp(emotion.arousal),
    dominance: clamp(emotion.dominance),
  };
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
}
