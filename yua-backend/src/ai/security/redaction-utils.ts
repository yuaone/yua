// ✂ Redaction Utils — Enterprise-Grade PII Masking
// -------------------------------------------------------------
// ✔ 이메일
// ✔ 전화번호
// ✔ 주민등록번호
// ✔ 여권번호
// ✔ 카드번호
// ✔ 은행 계좌번호
// ✔ 사업자등록번호
// ✔ 주소/우편번호
// ✔ Bearer Token / API Key 제거
// ✔ 파일/서버 경로 제거
// ✔ IPv4 / IPv6
// ✔ Base64 민감 데이터 보호
// -------------------------------------------------------------

export const RedactionUtils = {
  // 📧 이메일 마스킹
  maskEmail(text: string) {
    return text.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[email_redacted]");
  },

  // 📱 전화번호 마스킹 (###-####-####)
  maskPhone(text: string) {
    return text.replace(/\b\d{2,3}-\d{3,4}-\d{4}\b/g, "[phone_redacted]");
  },

  // 🔐 주민등록번호
  maskNationalID(text: string) {
    return text.replace(/\b\d{6}-\d{7}\b/g, "[national_id_redacted]");
  },

  // 🛂 여권번호(KR/US/EU)
  maskPassport(text: string) {
    return text.replace(/\b[A-Z]{1}\d{7,8}\b/gi, "[passport_redacted]");
  },

  // 💳 카드번호 (13–16 digits)
  maskCard(text: string) {
    return text.replace(/\b(?:\d[ -]*?){13,16}\b/g, "[card_redacted]");
  },

  // 🏦 은행 계좌 번호 (한국형: 00-000000-00~)
  maskBankAccount(text: string) {
    return text.replace(/\b\d{2,3}-\d{2,6}-\d{2,6}\b/g, "[bank_account_redacted]");
  },

  // 🏢 사업자등록번호 (123-45-67890)
  maskBizNumber(text: string) {
    return text.replace(/\b\d{3}-\d{2}-\d{5}\b/g, "[biz_number_redacted]");
  },

  // 📍 주소/도로명 (기본 패턴만 1차 대응)
  maskAddress(text: string) {
    return text.replace(
      /(서울|경기|인천|부산|대구|광주|대전|울산|제주)[^\s]{3,20}/g,
      "[address_redacted]"
    );
  },

  // 📦 우편번호
  maskPostCode(text: string) {
    return text.replace(/\b\d{5}\b/g, "[postcode_redacted]");
  },

  // 🔑 Token/Bearer/API Key
  maskTokens(text: string) {
    return text
      .replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, "[token_redacted]")
      .replace(/sk-[A-Za-z0-9]{20,}/gi, "[api_key_redacted]");
  },

  // 📁 파일/서버 경로
  maskFilePaths(text: string) {
    return text.replace(/([A-Za-z]:\\[^\s]+)|\/[A-Za-z0-9_\-\/\.]+/g, "[filepath_redacted]");
  },

  // 🌐 IP 주소 마스킹 (IPv4 / IPv6)
  maskIP(text: string) {
    return text
      // IPv4
      .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[ip_redacted]")
      // IPv6
      .replace(/\b([a-f0-9:]+:+)+[a-f0-9]+\b/gi, "[ip_redacted]");
  },

  // 🧬 Base64 민감 데이터
  maskBase64(text: string) {
    const base64Pattern = /\b(?:[A-Za-z0-9+\/]{40,}={0,2})\b/;
    if (base64Pattern.test(text)) {
      return "[base64_data_redacted]";
    }
    return text;
  },

  // 🔧 전체 실행(모든 필터 적용)
  maskAll(text: string) {
    let out = text;
    out = this.maskEmail(out);
    out = this.maskPhone(out);
    out = this.maskNationalID(out);
    out = this.maskPassport(out);
    out = this.maskCard(out);
    out = this.maskBankAccount(out);
    out = this.maskBizNumber(out);
    out = this.maskTokens(out);
    out = this.maskAddress(out);
    out = this.maskPostCode(out);
    out = this.maskFilePaths(out);
    out = this.maskIP(out);
    out = this.maskBase64(out);
    return out;
  }
};
