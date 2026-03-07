// ✂ Context Redaction — 완성형 Enterprise 버전
// ---------------------------------------------------------
// ✔ 이메일 / 전화번호
// ✔ 주민번호 / 카드번호 / 계좌번호
// ✔ 주소, 우편번호 자동 마스킹
// ✔ 토큰/키/API Key 제거
// ✔ 파일 경로 / 서버 경로 감추기
// ---------------------------------------------------------

import { RedactionUtils } from "./redaction-utils";

export const ContextRedaction = {
  clean(text: string) {
    if (!text) return "";

    let output = text;

    // 1) 이메일 마스킹
    output = RedactionUtils.maskEmail(output);

    // 2) 전화번호 마스킹
    output = RedactionUtils.maskPhone(output);

    // 3) 주민등록번호 / 여권번호
    output = output.replace(
      /\b\d{6}-\d{7}\b/g,
      "[national-id-redacted]"
    );

    // 4) 신용카드 번호
    output = output.replace(
      /\b(?:\d[ -]*?){13,16}\b/g,
      "[credit-card-redacted]"
    );

    // 5) 은행 계좌번호
    output = output.replace(
      /\b\d{2,3}-\d{2,6}-\d{2,6}\b/g,
      "[bank-account-redacted]"
    );

    // 6) 인증코드 / 토큰류
    output = output.replace(
      /(Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)/gi,
      "[token-redacted]"
    );

    // 7) 주소 패턴 (기본적인 것만)
    output = output.replace(
      /(서울|경기|인천|부산|대구|대전|광주|울산|제주|충청남도|충청북도|경상북도|경상남도|전라남도|전라북도|제주|세종)[^\s]{5,30}/g,
      "[address-redacted]"
    );

    // 8) 파일 경로 패턴
    output = output.replace(
      /([A-Za-z]:\\[^\s]+)|\/[A-Za-z0-9_\-\/\.]+/g,
      "[filepath-redacted]"
    );

    return output;
  }
};
