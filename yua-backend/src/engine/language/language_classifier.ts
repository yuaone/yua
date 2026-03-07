import { LANGUAGE_DEFINITIONS } from "./language_set";

export class LanguageClassifier {
  /**
   * 언어 감지 메인 함수
   * 1) 파일 확장자 기반 탐지
   * 2) 키워드 기반 탐지
   * 3) 특수 패턴(<?php, #include 등) 기반 탐지
   */
  static detect(content: string, filename?: string): string {
    if (!content || content.trim().length === 0) {
      return "unknown";
    }

    const lower = content.toLowerCase();

    // ───────────────────────────────────────────────
    // 1) 파일 확장자 기반 감지 (정확도 1순위)
    // ───────────────────────────────────────────────
    if (filename) {
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext) {
        for (const lang of LANGUAGE_DEFINITIONS) {
          if (lang.extensions.includes(ext)) {
            return lang.name;
          }
        }
      }
    }

    // ───────────────────────────────────────────────
    // 2) 특수 문법/패턴 기반 탐지 (정확도 2순위)
    // ───────────────────────────────────────────────
    const SPECIAL_PATTERNS: Record<string, RegExp[]> = {
      php: [/^<\?php/, /echo\s+["']/],
      xml: [/^<\?xml/, /<\/?[a-z0-9_-]+>/i],
      markdown: [/^#{1,6}\s/, /\*\*.*\*\*/],
      dockerfile: [/^from\s/i, /^cmd\s/i],
      terraform: [/resource\s+"/i, /provider\s+"/i],
      yaml: [/^[a-zA-Z0-9_-]+:\s/, /^-\s/],
    };

    for (const lang in SPECIAL_PATTERNS) {
      const patterns = SPECIAL_PATTERNS[lang];
      if (patterns.some((re) => re.test(content))) {
        return lang;
      }
    }

    // ───────────────────────────────────────────────
    // 3) 언어 키워드 기반 감지 (정확도 3순위)
    // ───────────────────────────────────────────────
    for (const lang of LANGUAGE_DEFINITIONS) {
      const matchCount = lang.keywords.reduce((count, kw) => {
        return lower.includes(kw.toLowerCase()) ? count + 1 : count;
      }, 0);

      // 키워드 2개 이상 매칭 → 높은 신뢰도
      if (matchCount >= 2) return lang.name;

      // 키워드 1개라도 포함되면 후보로 고려
      if (matchCount === 1) return lang.name;
    }

    // ───────────────────────────────────────────────
    // 4) 패턴, 키워드 모두 실패 → unknown (정상)
    // ───────────────────────────────────────────────
    return "unknown";
  }
}
