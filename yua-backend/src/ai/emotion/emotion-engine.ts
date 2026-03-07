// 📂 src/ai/emotion/emotion-engine.ts
// 🔥 Emotion Engine — Rule + LLM Hybrid 감정 분석기 (2025.11 ENTERPRISE FINAL)

import { runProviderAuto } from "../../service/provider-engine";
import { EmotionDetector, EmotionType } from "./emotion-detector";

export interface EmotionResult {
  emotion: EmotionType;
  confidence: number; // 0~1
  reason: string;
}

export const EmotionEngine = {
  // -------------------------------------------------------------
  // 1) Fast Detect (Rule 기반)
  // -------------------------------------------------------------
  fastDetect(message: string): EmotionType {
    return EmotionDetector.detect(message);
  },

  // -------------------------------------------------------------
  // 2) Deep Detect (LLM 기반 보정)
  // -------------------------------------------------------------
  async deepDetect(message: string): Promise<EmotionResult> {
    const ruleEmotion = this.fastDetect(message);

    const prompt = `
다음 문장에서 사용자의 감정을 판별하라.
가능한 감정: calm, stressed, angry, sad, urgent, confused, neutral

문장:
${message}

출력 예시(JSON):
{
  "emotion": "urgent",
  "confidence": 0.92,
  "reason": "문장이 급박함을 반복하여 표현함"
}

JSON만 출력.
    `.trim();

    const res = await runProviderAuto(prompt);

    try {
      const json = JSON.parse(res.output);

      return {
        emotion: json.emotion || ruleEmotion,
        confidence: json.confidence || 0.7,
        reason: json.reason || "",
      };
    } catch {
      return {
        emotion: ruleEmotion,
        confidence: 0.6,
        reason: "rule 기반 fallback",
      };
    }
  },

  // -------------------------------------------------------------
  // 3) 톤 가이드 외부 제공
  // -------------------------------------------------------------
  toneGuide(emotion: EmotionType): string {
    return EmotionDetector.toneForEmotion(emotion);
  }
};
