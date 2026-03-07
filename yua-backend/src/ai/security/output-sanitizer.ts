// 🧹 Output Sanitizer — Enterprise Version
// ------------------------------------------------------
// ✔ 폭력/자해/극단적 표현 제거
// ✔ 혐오/차별/인종/성별 공격 차단
// ✔ 불법 행위 조장/지침 제거
// ✔ 개인정보 출력 보호
// ✔ HTML/XSS/스크립트 출력 차단
// ✔ 모델 헛소리(hallucination) 패턴 제거
// ✔ ThreatEngine 기반 2차 안전 필터
// ------------------------------------------------------

import { ContextRedaction } from "./context-redaction";
import { AnomalyDetector } from "./anomaly-detector";

export const OutputSanitizer = {
  sanitize(text: string) {
    if (!text || typeof text !== "string") {
      return "⚠️ 출력이 안전 기준에 의해 제한되었습니다.";
    }

    let safe = text;

    // 1) 폭력 / 자해 / 범죄 / 위험한 행동 언급 제거
    const dangerousPatterns = /(suicide|kill yourself|murder|how to kill|bomb|terror|explode|shoot)/gi;
    safe = safe.replace(dangerousPatterns, "⚠️[restricted-content]");

    // 2) 혐오/차별 표현 차단
    const hate = /(racist|sexist|hate speech|slur)/gi;
    safe = safe.replace(hate, "⚠️[disallowed-content]");

    // 3) 불법행위 가이드 차단
    const illegal = /(how to hack|bypass security|steal|fraud|scam|forging)/gi;
    safe = safe.replace(illegal, "⚠️[illegal-request-blocked]");

    // 4) 개인정보 제거 (주민번호, 계좌, 카드, 주소 등)
    safe = ContextRedaction.clean(safe);

    // 5) XSS / HTML 태그 제거
    const xss = /<script.*?>.*?<\/script>|javascript:|<\/?\w+.*?>/gi;
    safe = safe.replace(xss, " [html-removed] ");

    // 6) AI 잘못된 모델 헛소리 제거
    const hallucination = /(as an ai language model|i cannot do that|this is beyond my capabilities)/gi;
    safe = safe.replace(hallucination, "");

    // 7) ThreatEngine 패턴 최종 점검 (이미 ThreatEngine이 있으면 여기에 연결)
    const anomalyCheck = AnomalyDetector.detect(safe);
    if (!anomalyCheck.ok) {
      safe = "⚠️ 출력이 이상 패턴을 감지하여 제한되었습니다.";
    }

    // 8) 최종 가공된 문장 정리
    safe = safe.trim();

    if (!safe) {
      return "⚠️ 출력이 안전 기준에 의해 일부 제한되었습니다.";
    }

    return safe;
  }
};
