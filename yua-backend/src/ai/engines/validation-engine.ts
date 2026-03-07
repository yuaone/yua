// 📂 src/ai/engines/validation-engine.ts
// 🔥 YUA-AI ValidationEngine — FINAL ENTERPRISE EXTENDED VERSION (2025.11)
// ✔ JSON / 타입 / Null / Empty 검증
// ✔ Email / Password / API-Key / 코드 검증 추가
// ✔ ChatEngine · DevAuthController · RiskEngine 전체 호환
// ✔ strict mode 완전 대응

export const ValidationEngine = {
  // ------------------------------------------------
  // ✔ 기본 타입 검사
  // ------------------------------------------------
  isString(value: unknown): value is string {
    return typeof value === "string";
  },

  isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
  },

  isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  },

  isArray(value: unknown): value is any[] {
    return Array.isArray(value);
  },

  isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
  },

  // ------------------------------------------------
  // ✔ Empty / Null 검사
  // ------------------------------------------------
  isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (this.isObject(value) && Object.keys(value).length === 0) return true;
    return false;
  },

  // ------------------------------------------------
  // ✔ JSON 검사
  // ------------------------------------------------
  isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  },

  safeJsonParse<T = any>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  },

  // ------------------------------------------------
  // ✔ 필수 Key 검사
  // ------------------------------------------------
  requireKeys(
    body: Record<string, unknown>,
    keys: string[]
  ): { ok: boolean; error?: string } {
    if (!this.isObject(body)) {
      return { ok: false, error: "요청 Body 형식이 잘못되었습니다." };
    }

    const missing = keys.filter((k) => !(k in body));

    if (missing.length > 0) {
      return {
        ok: false,
        error: `필수 필드 누락: ${missing.join(", ")}`,
      };
    }

    return { ok: true };
  },

  // ------------------------------------------------
  // ✔ Developer Console 전용 Request 검사
  // ------------------------------------------------
  validateRequest(input: any): { ok: boolean; error?: string } {
    if (input === null || input === undefined) {
      return { ok: false, error: "입력이 비어있습니다." };
    }

    if (typeof input === "string" && input.trim() === "") {
      return { ok: false, error: "문자열 입력이 비어있습니다." };
    }

    if (this.isObject(input) && Object.keys(input).length === 0) {
      return { ok: false, error: "객체 입력이 비어있습니다." };
    }

    return { ok: true };
  },

  // ------------------------------------------------
  // ⭐ 추가: 이메일 검증 (DevAuthController용)
  // ------------------------------------------------
  isEmail(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(value.trim());
  },

  // ------------------------------------------------
  // ⭐ 추가: 강력 비밀번호 검증 (선택적)
  // ------------------------------------------------
  isStrongPassword(value: unknown): value is string {
    if (typeof value !== "string") return false;
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value.trim());
  },

  // ------------------------------------------------
  // ⭐ 추가: API Key 간단 유효성 검사
  // ------------------------------------------------
  isApiKey(value: unknown): value is string {
    if (typeof value !== "string") return false;
    return value.length >= 16; // 최소 길이
  },

  // ------------------------------------------------
  // ⭐ 추가: 6자리 코드 포맷 (MatchEngine)
  // ------------------------------------------------
  isSixDigitCode(value: unknown): value is string {
    if (typeof value !== "string") return false;
    return /^[0-9]{6}$/.test(value.trim());
  },
};

export default ValidationEngine;
