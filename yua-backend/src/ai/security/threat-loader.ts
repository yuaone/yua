// 📂 src/security/threat-loader.ts
// 🔥 YUA-AI Threat Loader — FINAL ENTERPRISE VERSION (2025.11)
// ------------------------------------------------------------
// ✔ Static Patterns (Fail-safe)
// ✔ Auto Patterns (AI 기반 자동 감지 유형)
// ✔ DB Patterns (MySQL threat_patterns)
// ✔ Duplicate 제거
// ✔ Regex 안전 컴파일
// ✔ 캐싱 + Fail-safe fallback
// ------------------------------------------------------------

import { pool } from "../../db/mysql";

let cachedPatterns: any[] | null = null;
let lastLoadedAt = 0;
const CACHE_TTL = 1000 * 30; // 30초 캐시 유지

// ------------------------------------------------------------
// 1) 정적 패턴(Fail-safe)
// ------------------------------------------------------------
const staticPatterns = [
  { id: null, type: "sql_injection", pattern: "(drop table|insert into|update .* set)", severity: 5 },
  { id: null, type: "xss", pattern: "(<script>|javascript:)", severity: 4 },
  { id: null, type: "jailbreak", pattern: "(ignore previous instructions)", severity: 3 },
  { id: null, type: "harm", pattern: "(kill|suicide|bomb)", severity: 5 },
];

// ------------------------------------------------------------
// 2) 자동 패턴(AI 기반/일반적 보안 취약점)
// ------------------------------------------------------------
const autoPatterns = [
  { id: null, type: "credential_leak", pattern: "(password=|api_key=|secret=)", severity: 4 },
  { id: null, type: "path_traversal", pattern: "(\.\./\.\./)", severity: 4 },
  { id: null, type: "rce", pattern: "(exec\\(|system\\(|shell)", severity: 5 },
];

// ------------------------------------------------------------
// 3) 정규식 안전 변환 (실패 시 무시)
// ------------------------------------------------------------
function safeRegex(pattern: string) {
  try {
    return new RegExp(pattern, "i");
  } catch (e) {
    console.error("❌ Invalid Regex Pattern:", pattern, e);
    return null;
  }
}

// ------------------------------------------------------------
// 4) 메인 로더(loadThreatPatterns)
// ------------------------------------------------------------
export async function loadThreatPatterns() {
  const now = Date.now();

  // 캐싱 적용 → DB 과부하 방지 & 초당 수천 요청 가능
  if (cachedPatterns && now - lastLoadedAt < CACHE_TTL) {
    return cachedPatterns;
  }

  try {
    // DB에서 패턴 가져오기
    const [rows] = await pool.query(
      "SELECT id, type, pattern, severity, lang FROM threat_patterns"
    );

    const dbPatterns = (rows as any[]).map((r) => ({
      id: r.id,
      type: r.type,
      pattern: r.pattern,
      severity: r.severity,
      lang: r.lang,
    }));

    // 병합
    let merged = [...staticPatterns, ...autoPatterns, ...dbPatterns];

    // 동일 패턴/타입 중복 제거
    merged = merged.filter(
      (p, index, self) =>
        index === self.findIndex((t) => t.pattern === p.pattern && t.type === p.type)
    );

    // 정규식 변환
    const final = merged
      .map((p) => {
        const regex = safeRegex(p.pattern);
        if (!regex) return null;
        return { ...p, regex };
      })
      .filter(Boolean);

    cachedPatterns = final;
    lastLoadedAt = now;

    return final;
  } catch (err) {
    console.error("🔥 ThreatLoader Error — Fallback to static patterns:", err);

    // DB 실패 시 정적 패턴만 적용 (서비스 안정 유지)
    return staticPatterns
      .map((p) => {
        const regex = safeRegex(p.pattern);
        return regex ? { ...p, regex } : null;
      })
      .filter(Boolean);
  }
}
