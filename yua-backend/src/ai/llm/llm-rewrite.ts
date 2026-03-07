import type { DecisionDomain } from "../decision-assistant/decision-domain";

export async function runLLMRewrite(input: {
  traceId: string;
  text: string;
  domain: DecisionDomain;
  language: string;
}): Promise<{ text: string }> {
  /**
   * 🔒 STUB (SSOT)
   * - 현재는 원문 그대로 반환
   * - 구조/계약 고정용
   * - 추후 OpenAI / PromptRuntime 연결
   */
  return {
    text: input.text,
  };
}
