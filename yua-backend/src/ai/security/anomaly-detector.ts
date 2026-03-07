// 🤖 Model Anomaly Detector — 완성형 Enterprise 버전
// ---------------------------------------------------------
// ✔ 토큰 폭주 감지
// ✔ 반복 텍스트 루프 감지
// ✔ 금칙어/위험문구 자동 차단
// ✔ JSON 구조 오류 탐지
// ✔ HTML/XSS 위험 출력 제거
// ✔ 모델 헛소리(Hallucination) 패턴 감지
// ---------------------------------------------------------

export const AnomalyDetector = {
  MAX_LENGTH: 50000,
  REPETITION_THRESHOLD: 8,

  detect(output: string) {
    if (!output || typeof output !== "string") {
      return { ok: false, reason: "invalid_output" };
    }

    // 1) 토큰 폭주 감지
    if (output.length > this.MAX_LENGTH) {
      return { ok: false, reason: "token_overflow" };
    }

    // 2) 반복 텍스트 루프 감지
    const repeated = /(.)\1{50,}/; // 같은 문자 50번 이상 반복
    if (repeated.test(output)) {
      return { ok: false, reason: "repetition_loop" };
    }

    // 3) 위험/금칙어 감지
    const dangerous = /(suicide|kill|explode|bomb|hack)/i;
    if (dangerous.test(output)) {
      return { ok: false, reason: "dangerous_content" };
    }

    // 4) JSON 구조 오류 탐지
    if (output.trim().startsWith("{") || output.trim().startsWith("[")) {
      try {
        JSON.parse(output);
      } catch {
        return { ok: false, reason: "json_parse_error" };
      }
    }

    // 5) HTML/XSS 출력 감지
    const xss = /<script|<\/script|javascript:/i;
    if (xss.test(output)) {
      return { ok: false, reason: "xss_output_detected" };
    }

    // 6) 모델 헛소리(Hallucination) 패턴 감지
    const hallucination = /(as an AI model I cannot|i am unable to)/i;
    if (hallucination.test(output)) {
      return { ok: false, reason: "hallucination_output" };
    }

    return { ok: true };
  }
};
