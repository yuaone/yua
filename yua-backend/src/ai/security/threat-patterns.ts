// 📂 src/security/threat-patterns.ts
// 🔥 YUA-AI — Threat Static Patterns (Fail-Safe Layer Only)
// --------------------------------------------------------------
// ✔ 이 패턴들은 DB 장애 시에도 엔진이 최소한의 보안 기능을 유지하도록 하는 목적
// ✔ ThreatLoader가 static + auto + db 패턴을 병합하여 사용
// --------------------------------------------------------------

export const ThreatPatterns = [
  {
    id: null,
    type: "sql_injection",
    pattern: "(drop table|insert into|update .* set)",
    severity: 5,
    regex: /(drop table|insert into|update .* set)/i,
  },
  {
    id: null,
    type: "xss",
    pattern: "(<script>|javascript:)",
    severity: 4,
    regex: /(<script>|javascript:)/i,
  },
  {
    id: null,
    type: "jailbreak",
    pattern: "(ignore previous instructions)",
    severity: 3,
    regex: /(ignore previous instructions)/i,
  },
  {
    id: null,
    type: "harm",
    pattern: "(kill|suicide|bomb)",
    severity: 5,
    regex: /(kill|suicide|bomb)/i,
  },
];
