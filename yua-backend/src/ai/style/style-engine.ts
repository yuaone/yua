// 📂 src/ai/style/style-engine.ts
// 🔥 Style Engine — Rule + LLM Hybrid 말투 감지기 (2025.11 ENTERPRISE FINAL)

import { runProviderAuto } from "../../service/provider-engine";
import { StyleDetector, StyleType } from "./style-detector";

export interface StyleResult {
  style: StyleType;
  confidence: number;
  reason: string;
}

export const StyleEngine = {
  // -------------------------------------------------------------
  // 1) 빠른 Rule 기반 감지기
  // -------------------------------------------------------------
  fastDetect(message: string): StyleType {
    return StyleDetector.detect(message);
  },

  // -------------------------------------------------------------
  // 2) LLM 기반 심층 감지기
  // -------------------------------------------------------------
  async deepDetect(message: string): Promise<StyleResult> {
    const ruleStyle = this.fastDetect(message);

    const prompt = `
다음 문장의 '말투 스타일'을 분석하라.
가능한 스타일: 반말, 존댓말, 친근, 기술, 문어체, 요약체, 기본

문장:
${message}

JSON 형식으로 출력:
{
  "style": "존댓말",
  "confidence": 0.91,
  "reason": "丁寧 종결 어미 사용"
}
`.trim();

    const res = await runProviderAuto(prompt);

    try {
      const json = JSON.parse(res.output);

      return {
        style: json.style || ruleStyle,
        confidence: json.confidence || 0.7,
        reason: json.reason || "",
      };
    } catch {
      return {
        style: ruleStyle,
        confidence: 0.6,
        reason: "rule 기반 fallback",
      };
    }
  },

  // -------------------------------------------------------------
  // 3) 스타일별 tone guide 제공
  // -------------------------------------------------------------
  toneGuide(style: StyleType): string {
    return StyleDetector.guide(style);
  }
};
