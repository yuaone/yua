// 📂 src/ai/decision/decision-engine.ts
// 🔥 DecisionEngine (ExpertEngine) — ENTERPRISE ULTRA FINAL (2025.11)
// ----------------------------------------------------------------------
// ✔ 전략적 판단 / 비교 / 의사결정 전용 엔진
// ✔ ResearchEngine + AdvisorEngine + ProviderAuto 결합형
// ✔ undefined/null 0%
// ✔ Tone 자동 설정
// ✔ 비즈니스/기술/법무/전략 등 고급 판단 지원
// ----------------------------------------------------------------------

import { runProviderAuto } from "../../service/provider-engine";
import { toStringSafe } from "../universal/utils-safe";

export interface DecisionInput {
  topic: string;        // 질문 또는 판단 요청
  tone?: "기술" | "경영" | "전략" | "법무" | "기본";
  detail?: boolean;     // 디테일/분석 깊이
}

export const DecisionEngine = {
  async judge(input: DecisionInput): Promise<string> {
    const topic = input?.topic?.trim() || "";
    const tone = input?.tone || "기본";
    const detail = input?.detail ?? true;

    if (!topic) return "판단할 내용을 입력해주세요.";

    // Tone Guide
    const toneGuide = {
      "기술": "기술 전문가처럼 정확하고 근거 기반으로 설명해.",
      "경영": "경영전문가답게 비용·효율·전략 중심으로 판단해.",
      "전략": "상위 전략가처럼 리스크·기회·대안·결론을 제시해.",
      "법무": "법률전문가 시각으로 준법·리스크 중심으로 분석해.",
      "기본": "전문가 시각으로 명확하고 자연스럽게 설명해.",
    }[tone];

    const depth = detail
      ? "다음 요청에 대해 전문가 시각으로 깊은 분석(근거 기반)과 결론을 제시해."
      : "짧고 핵심적인 판단만 제시해.";

    const prompt = `
너는 YUA-AI DecisionEngine(전문가 판단 엔진)이다.
${toneGuide}

규칙:
- 템플릿 금지
- 불필요한 형식 금지
- undefined/null 절대 생성 금지
- 실제 전문가처럼 판단·근거·비교·결론 제시
- 사용자가 의사결정 바로 내릴 수 있게 설명

${depth}

[판단 요청]
${topic}

[전문가 결론]
`.trim();

    const raw = await runProviderAuto(prompt);
    return toStringSafe(raw);
  }
};
