// 🔥 Input Firewall — Enterprise Production Version
// --------------------------------------------------------
// ✔ SQL Injection / NoSQL Injection
// ✔ OS Command Injection
// ✔ Script Injection
// ✔ Prompt Injection 시도 차단
// ✔ API Key/Token 노출 차단
// ✔ 대량 Base64 입력 제한
// ✔ 위험 확장자/스크립트 차단
// --------------------------------------------------------

export const InputFirewall = {
  MAX_LENGTH: 40000,
  BASE64_THRESHOLD: 15000,

  check(raw: string) {
    if (!raw || typeof raw !== "string") {
      return { ok: false, reason: "invalid_input" };
    }

    // 1) 입력 길이 제한
    if (raw.length > this.MAX_LENGTH) {
      return { ok: false, reason: "too_long" };
    }

    // 2) Base64 대량 입력 → 파일 업로드 공격
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    if (raw.length > this.BASE64_THRESHOLD && base64Pattern.test(raw)) {
      return { ok: false, reason: "base64_overflow" };
    }

    // 3) SQL Injection 패턴
    const sqlPatterns = /(drop table|insert into|delete from|update .* set|union select)/i;
    if (sqlPatterns.test(raw)) {
      return { ok: false, reason: "sql_injection" };
    }

    // 4) NoSQL Injection 패턴
    const nosql = /(\$where|\$regex|\$ne|\$gt|\$lt)/i;
    if (nosql.test(raw)) {
      return { ok: false, reason: "nosql_injection" };
    }

    // 5) Shell / OS 명령어 주입
    const osCmd = /(rm -rf|chmod|chown|powershell|cmd\.exe|mkdir|curl|wget)/i;
    if (osCmd.test(raw)) {
      return { ok: false, reason: "os_command_injection" };
    }

    // 6) Script / XSS
    const xss = /<script|<\/script>|javascript:/i;
    if (xss.test(raw)) {
      return { ok: false, reason: "script_injection" };
    }

    // 7) Prompt Injection 기본 탐지
    const jailbreak = /(ignore previous|bypass|disregard|override rules)/i;
    if (jailbreak.test(raw)) {
      return { ok: false, reason: "prompt_injection" };
    }

    // 8) Token 노출 방지
    const tokenLeak = /(sk-[a-zA-Z0-9]{20,}|Bearer\s+[A-Za-z0-9\-\._]+)/i;
    if (tokenLeak.test(raw)) {
      return { ok: false, reason: "token_leak_detected" };
    }

    // 9) 위험 확장자 / 파일 업로드 공격
    const fileAttack = /\.(exe|bat|sh|dll|js|php|py|pl)$/i;
    if (fileAttack.test(raw)) {
      return { ok: false, reason: "file_attack_detected" };
    }

    return { ok: true };
  },
};
