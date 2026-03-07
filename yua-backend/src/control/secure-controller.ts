// 📂 src/controllers/secure-controller.ts
// 🔥 SecureController — SECURITY ANALYZER (2025.11)
// ✔ 보안 취약점 검사
// ✔ 코드 내 위험 패턴 탐지
// ✔ MoneyAlly 기업용 보안 페이지와 호환

import { Request, Response } from "express";
import { CodeCleaner } from "../engine/language/code_cleaner";

export const secureController = {
  /**
   * 🔐 /api/secure/analyze
   * 코드 내 보안취약점 검사
   */
  analyze: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { code } = req.body ?? {};

      if (!code || typeof code !== "string") {
        return res.status(400).json({
          ok: false,
          engine: "secure-error",
          error: "code 필드가 누락되었거나 문자열이 아닙니다.",
        });
      }

      const cleaned = CodeCleaner.clean(code);

      // 단순 패턴 기반 취약점 탐지 예시
      const warnings: string[] = [];

      if (cleaned.includes("eval(")) warnings.push("eval 사용은 보안 위험이 있습니다.");
      if (cleaned.includes("innerHTML")) warnings.push("innerHTML 직접 삽입은 XSS 위험이 있습니다.");
      if (/password\s*=\s*["']/i.test(cleaned)) warnings.push("하드코딩된 비밀번호가 감지되었습니다.");

      return res.status(200).json({
        ok: true,
        engine: "secure",
        cleaned,
        warnings,
      });

    } catch (e: any) {
      console.error("❌ SecureController Error:", e);

      return res.status(500).json({
        ok: false,
        engine: "secure-error",
        error: String(e),
      });
    }
  },
};
