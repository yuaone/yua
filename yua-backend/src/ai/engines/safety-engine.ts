// 📂 src/ai/engines/safety-engine.ts
// 🔥 YUA-AI SafetyEngine — DOMAIN-AWARE FINAL (2026.01)
// ✔ 행동(Action) 기반 차단
// ✔ dev / infra / etc 도메인별 safety threshold 분리
// ✔ 방화벽 / 보안 문맥 오탐 제거
// ✔ ChatEngine / Runtime SSOT 유지

import { sanitizeContent } from "../utils/sanitizer";

export interface SafetyResult {
  ok: boolean;
  blocked: boolean;
  category?: string;
  reason?: string;
}

/* -------------------------------------------------- */
/* 🔒 Domain Heuristics (LIGHTWEIGHT, LOCAL)          */
/* -------------------------------------------------- */

type SafetyDomain = "dev" | "infra" | "etc";

function inferSafetyDomain(text: string): SafetyDomain {
  const lower = text.toLowerCase();

  if (
    /(서버|네트워크|방화벽|dmz|kubernetes|k8s|infra|인프라|보안|vpc|vpn)/i.test(
      lower
    )
  ) {
    return "infra";
  }

  if (
    /(코드|typescript|javascript|api|함수|클래스|빌드|디버그|컴파일)/i.test(
      lower
    )
  ) {
    return "dev";
  }

  return "etc";
}

/* -------------------------------------------------- */
/* 🔒 Security / Infrastructure Allowlist             */
/* -------------------------------------------------- */

const SECURITY_ALLOW_TERMS = [
  "방화벽",
  "firewall",
  "waf",
  "dmz",
  "침입탐지",
  "ids",
  "ips",
  "zero trust",
  "보안 정책",
  "네트워크 보안",
  "vpc",
  "vpn",
];

function containsSecurityAllowTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return SECURITY_ALLOW_TERMS.some(t =>
    lower.includes(t.toLowerCase())
  );
}

/* -------------------------------------------------- */
/* 🔍 Korean Word Boundary Helper                     */
/* -------------------------------------------------- */

function isStandaloneKoreanWord(word: string, text: string): boolean {
  const pattern = new RegExp(`(^|\\s)${word}(\\s|$)`);
  return pattern.test(text);
}

/* -------------------------------------------------- */
/* 🔥 Safety Engine                                   */
/* -------------------------------------------------- */

export const SafetyEngine = {
  analyzeUnsafe(text: string): SafetyResult {
    const clean = sanitizeContent(text || "");
    const domain = inferSafetyDomain(clean);

    // 1) 유해 / 폭력
    const harmful = this.checkHarmful(clean, domain);
    if (harmful.blocked) return harmful;

    // 2) 불법 / 범죄
    const illegal = this.checkIllegal(clean, domain);
    if (illegal.blocked) return illegal;

    // 3) 금융 / 세무
    const finance = this.checkFinanceCrime(clean, domain);
    if (finance.blocked) return finance;

    // 4) 정부기관
    const gov = this.checkGovRestricted(clean, domain);
    if (gov.blocked) return gov;

    return { ok: true, blocked: false };
  },

  /* -------------------------------------------------- */
  /* 1️⃣ 유해 / 폭력 (DOMAIN-AWARE)                     */
  /* -------------------------------------------------- */
  checkHarmful(text: string, domain: SafetyDomain): SafetyResult {
    // 🔓 infra / dev 도메인에서는 보안 키워드 우선 통과
    if (domain !== "etc" && containsSecurityAllowTerm(text)) {
      return { ok: true, blocked: false };
    }

    const blacklist = [
      "살인",
      "자살",
      "강간",
      "성폭력",
      "마약",
      "필로폰",
      "대마",
      "폭행",
      "테러",
      "총기",
      "방화",
    ];

    for (const word of blacklist) {
      if (!isStandaloneKoreanWord(word, text)) continue;

      // ❗ 실행/방법/지시 의도가 있을 때만 차단
      if (/(하는 법|방법|어떻게|실행|저지르)/.test(text)) {
        return {
          ok: false,
          blocked: true,
          category: "harmful",
          reason: `유해 행위 실행 요청 감지: "${word}"`,
        };
      }

      // 설명 / 분석 / 역사적 언급은 허용
      return { ok: true, blocked: false };
    }

    return { ok: true, blocked: false };
  },

  /* -------------------------------------------------- */
  /* 2️⃣ 불법 / 범죄 (DOMAIN-AWARE)                     */
  /* -------------------------------------------------- */
  checkIllegal(text: string, domain: SafetyDomain): SafetyResult {
    const keywords = [
      "해킹",
      "명의 도용",
      "계좌 털기",
      "불법 송금",
      "불법 환전",
      "보이스피싱",
      "랜섬웨어",
      "사기 치는 법",
    ];

    for (const k of keywords) {
      if (!text.includes(k)) continue;

      // dev / infra 도메인에서는 "설명/분석" 허용
      if (
        domain !== "etc" &&
        /(원리|구조|대응|방지|탐지|설명)/.test(text)
      ) {
        return { ok: true, blocked: false };
      }

      // 실행 방법 요청만 차단
      if (/(하는 법|방법|어떻게)/.test(text)) {
        return {
          ok: false,
          blocked: true,
          category: "illegal",
          reason: `불법 행위 실행 요청 감지: "${k}"`,
        };
      }
    }

    return { ok: true, blocked: false };
  },

  /* -------------------------------------------------- */
  /* 3️⃣ 금융 / 세무 (STRICT, DOMAIN-INDIFFERENT)      */
  /* -------------------------------------------------- */
  checkFinanceCrime(text: string, _domain: SafetyDomain): SafetyResult {
    const risky = [
      "탈세",
      "차명계좌",
      "가공비 만드는 법",
      "허위 세금계산서",
      "가짜 영수증",
      "장부 조작",
      "회계조작",
      "현금 매출 숨기는 법",
    ];

    for (const k of risky) {
      if (text.includes(k)) {
        return {
          ok: false,
          blocked: true,
          category: "finance-crime",
          reason: `금융·세무 범죄 요청 감지: "${k}"`,
        };
      }
    }

    return { ok: true, blocked: false };
  },

  /* -------------------------------------------------- */
  /* 4️⃣ 정부기관 / 공문서 (STRICT)                     */
  /* -------------------------------------------------- */
  checkGovRestricted(text: string, _domain: SafetyDomain): SafetyResult {
    const restricted = [
      "공문서 조작",
      "허위 신고",
      "국세청 속이기",
      "정부 문서 위조",
      "허위 데이터 제출",
    ];

    for (const k of restricted) {
      if (text.includes(k)) {
        return {
          ok: false,
          blocked: true,
          category: "gov-restricted",
          reason: `정부기관 금지 행위 요청 감지: "${k}"`,
        };
      }
    }

    return { ok: true, blocked: false };
  },
};
