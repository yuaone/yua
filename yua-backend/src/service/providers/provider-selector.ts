// 📂 src/service/providers/provider-selector.ts
// 🔥 Provider Selector — FINAL ENTERPRISE DUAL MODE (2025.11)
// ------------------------------------------------------------
// ✔ provider 문자열 선택(get)
// ✔ 실제 AI 실행(run)
// ✔ GPT / Claude / Gemini / HPE 3.0 완전 호환
// ------------------------------------------------------------

import { GPTProvider } from "./gpt-provider";
import { ClaudeProvider } from "./claude-provider";
import { GeminiProvider } from "./gemini-provider";
import { runHPEEngine } from "../../ai/hpe/hpe-engine";
import { log } from "../../utils/logger";

export interface ProviderSelectorOptions {
  mode?: string;
  input: string;
  context?: any[];
}

/* -------------------------------------------------------
 * 1) Provider 문자열 반환 (Gateway 용)
 * -----------------------------------------------------*/
export const ProviderSelectorLogic = {
  get(input: string): "gpt" | "claude" | "gemini" | "hpe" {
    // HPE 첫 우선순위
    if (/hpe|predict|forecast|예측|인과/i.test(input)) {
      return "hpe";
    }

    // Claude: 이유/설명/논리
    if (/이유|왜|논리|설명|cause|reason|analysis/i.test(input)) {
      return "claude";
    }

    // Gemini: 요약/정리
    if (/요약|정리|summar/i.test(input)) {
      return "gemini";
    }

    // GPT 기본값
    return "gpt";
  }
};


/* -------------------------------------------------------
 * 2) 실행기 (run) — 기존 정원님 구현 유지 + 경로만 보정
 * -----------------------------------------------------*/
export async function ProviderSelector(opts: ProviderSelectorOptions) {
  const { mode, input, context = [] } = opts;

  // HPE 강제 모드
  if (mode === "hpe" || mode === "predict") {
    log("🔮 ProviderSelector.run → HPE Engine 사용");
    return await runHPEEngine({ input, context });
  }

  // Claude
  if (/이유|왜|논리|설명|cause|reason|analysis/i.test(input)) {
    log("🟣 ProviderSelector.run → Claude 선택");
    return await ClaudeProvider(input, context);
  }

  // Gemini
  if (/요약|정리|summar/i.test(input)) {
    log("🔮 ProviderSelector.run → Gemini 선택");
    return await GeminiProvider(input, context);
  }

  // GPT
  log("🤖 ProviderSelector.run → GPT 기본 선택");
  return await GPTProvider(input, context);
}
