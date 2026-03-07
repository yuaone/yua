import { verifyWithModels } from "./hpe-verifier";
import { aggregateConsensus } from "./hpe-aggregator";
import { runPredictiveCausality } from "./hpe-predictor";
import { normalizeInput } from "./hpe-utils";

interface HPEInput {
  input: string;
  context: any[];
}

export async function runHPEEngine({ input, context }: HPEInput) {
  // 1) 입력 정규화
  const cleaned = normalizeInput(input);

  // 2) GPT + Gemini + Claude → 동시 실행
  const verification = await verifyWithModels(cleaned, context);

  // 3) 3 AI 합의(majority) 계산
  const consensus = aggregateConsensus(verification);

  // 4) 합의 기반 인과/미래예측
  const prediction = await runPredictiveCausality(consensus);

  // ⭐ wrapper가 요구하는 legacy 구조 추가
  const fusion = {
    verification,
    consensus,
    prediction
  };

  return {
    verification,
    consensus,
    prediction,

    // wrapper 호환 필드
    ok: true,
    error: null,
    fusion
  };
}
