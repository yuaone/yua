import { Request, Response } from "express";
import { runHPEEngine } from "./hpe-engine";

import { runGuardrail } from "../../service/guardrail-engine";
import { OutputSanitizer } from "../security/output-sanitizer";
import { IntentEngine } from "../intent/intent-engine";

// checkUsageLimit은 middleware 영역에서 처리

export async function runSecureHPE(input: string) {
  // 1) Intent 검사
  const intent = await IntentEngine.detect(input);
  if (intent === "negative") {
    return {
      ok: false,
      error: "의도 분석 결과 차단되었습니다."
    };
  }

  // 2) HPE 엔진 실행 (context 필수)
  const hpe = await runHPEEngine({
    input,
    context: []
  });

  // 3) 최신 HPE 엔진 결과를 wrapper용 legacy 구조로 매핑
  const legacy = {
    ok: true,
    error: null,
    fusion: {
      verification: hpe.verification,
      consensus: hpe.consensus,
      prediction: hpe.prediction
    }
  };

  // 예측 실패 등 예외 처리 (필요 시)
  if (!legacy.fusion) {
    return {
      ok: false,
      error: "HPE fusion 데이터가 존재하지 않습니다."
    };
  }

  // 4) Guardrail 필터링
  const guard = await runGuardrail(JSON.stringify(legacy.fusion));
  if (typeof guard === "string" && guard.startsWith("⚠️")) {
    return {
      ok: false,
      error: guard
    };
  }

  // 5) Sanitizer
  const sanitized = OutputSanitizer.sanitize(JSON.stringify(legacy.fusion));

  return {
    ok: true,
    engine: "HPE-3.0",
    result: JSON.parse(sanitized)
  };
}
