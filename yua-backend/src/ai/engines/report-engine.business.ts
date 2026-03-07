// 📂 src/ai/engines/report-engine.business.ts
// 🔥 BusinessReportEngine — ENTERPRISE FINAL (2025.11)

import { sanitizeContent } from "../utils/sanitizer";
import { openai } from "../utils/openai-client";
import { GuardrailManager } from "../guardrails/guardrail-manager";
import { SafetyEngine } from "./safety-engine";
import { LoggingEngine } from "./logging-engine";
import { pickModel } from "../utils/pick-model";
import { VectorEngine } from "../vector/vector-engine";
import { query } from "../../db/db-wrapper";

// -----------------------------
// 🔥 타입 정의 (★ 반드시 export 필요)
// -----------------------------
export interface BusinessPayload {   // ★ export 추가
  userType: string;
  businessInfo?: any;
  transactions: any[];
  pattern?: any;
  risk?: any;
  apiKey?: string;
  ip?: string;
}

// =======================================================
// ⭐ quickAnalyze
// =======================================================
export const BusinessReportEngine = {   // ★ export 추가
  /**
   * ChatEngine / UniversalEngine 용 빠른 분석
   */
  async quickAnalyze(input: { message: string }) {
    const startedAt = Date.now();
    const route = "business-quick";

    try {
      const msg = input?.message ?? "";
      const lower = msg.toLowerCase();

      if (!msg || typeof msg !== "string") {
        return { ok: false, text: "사업자 간단 분석 실패: message 누락" };
      }

      const guard = GuardrailManager.enforce(msg);
      if (guard.blocked) {
        return { ok: false, text: `[BLOCKED] ${guard.reason}` };
      }

      const safe = SafetyEngine.analyzeUnsafe(msg);
      if (safe.blocked) {
        return { ok: false, text: `안전성 정책 차단: ${safe.reason}` };
      }

      const bizKeys = [
        "매출","매입","지출","경비","부가세","세금",
        "세무","회계","세금계산서","전표","사업자","b2b"
      ];

      const detected = bizKeys.some((k) => lower.includes(k));

      const prompt = `
너는 "YUA-AI Business Quick Analyzer"이다.
사용자 입력으로부터 사업자 상황을 간단히 요약해줘.
- PDF-safe UTF-8 text
- 불필요한 마크다운 금지
- 5~12줄 사이
- undefined/null 절대 금지
- 위험 레벨 1개 포함

[입력]
${msg}
      `.trim();

      const client = openai();
      if (!client) {
        return { ok: true, text: "Mock 사업자 간단 분석입니다.", detected };
      }

      const completion = await client.responses.create({
        model: pickModel("report"),
        input: Buffer.from(prompt, "utf8").toString(),
        max_output_tokens: 500,
      });

      const text =
        completion.output_text?.trim() ?? "사업자 간단 분석 실패";

      const safeText = text
        .replace(/\u0000/g, "")
        .replace(/\t/g, "  ")
        .trim();

      return {
        ok: true,
        engine: "business-quick",
        text: safeText,
        detected,
      };
    } catch (e: any) {
      return { ok: false, text: String(e) };
    }
  },

  // =======================================================
  // 🔥 메인 리포트 엔진
  // =======================================================
  async generateBusinessReport(data: BusinessPayload) {
    const startedAt = Date.now();
    const route = "report-business";

    try {
      if (!Array.isArray(data.transactions) || data.transactions.length === 0) {
        return this._error("사업자 거래내역(transactions)이 비어있습니다.", data, startedAt, route);
      }

      const guard = GuardrailManager.enforce(JSON.stringify(data));
      if (guard.blocked) {
        return this._error(`[BLOCKED] ${guard.reason}`, data, startedAt, route);
      }

      const safe = SafetyEngine.analyzeUnsafe(JSON.stringify(data));
      if (safe.blocked) {
        return this._error(`안전성 정책 차단: ${safe.reason}`, data, startedAt, route);
      }

      const cleanTransactions = data.transactions.map((t) => ({
        ...t,
        category: sanitizeContent(t.category ?? ""),
        memo: sanitizeContent(t.memo ?? "")
      }));

      const VE = new VectorEngine();
      const vectorRaw = await VE.search(JSON.stringify(cleanTransactions), 5);

      const vectorHints =
        vectorRaw?.map((v: any) => v?.meta?.text).filter(Boolean) ?? [];

      const businessPatterns: string[] = [];
      if (cleanTransactions.some((t) => t.category.includes("식대")))
        businessPatterns.push("접대비 또는 경비 식대 사용 패턴 발견");
      if (cleanTransactions.some((t) => t.category.includes("소모품")))
        businessPatterns.push("소모품 지출 증가 패턴");
      if (cleanTransactions.some((t) => t.memo.includes("현금")))
        businessPatterns.push("현금성 지출 비중 증가");
      if (cleanTransactions.some((t) => t.category.includes("교통")))
        businessPatterns.push("교통/출장 관련 비용 존재");

      const riskScore = (() => {
        let score = 0;
        if (cleanTransactions.some((t) => t.memo.includes("현금"))) score += 15;
        if (cleanTransactions.some((t) => t.category === "접대")) score += 20;
        if (cleanTransactions.length >= 50) score += 10;
        if (vectorHints.some((h: string) => h.includes("가공"))) score += 20;
        return Math.min(score, 100);
      })();

      const riskLevel =
        riskScore >= 70 ? "⚠️ 매우 높음"
        : riskScore >= 40 ? "주의 필요"
        : "안정적";

      const prompt = `
너는 대한민국 사업자의 지출·장부를 분석하는 "YUA-AI Business Report Engine"이다.
PDF-safe UTF-8로 출력하라.

[지출 내역 수]
${cleanTransactions.length}건

[자동 감지 패턴]
${[...businessPatterns, ...vectorHints].join("\n")}

[위험 지표]
점수: ${riskScore}/100
레벨: ${riskLevel}
      `.trim();

      const client = openai();
      if (!client) {
        return {
          ok: true,
          engine: "business-report-mock",
          text: "Mock 사업자 리포트입니다."
        };
      }

      const completion = await client.responses.create({
        model: pickModel("report"),
        input: Buffer.from(prompt, "utf8").toString(),
        max_output_tokens: 2000
      });

      const text =
        completion.output_text?.trim() ?? "사업자 리포트 생성 실패";

      const pdfSafeText = text
        .replace(/\t/g, "  ")
        .replace(/\u0000/g, "")
        .trim();

      const result = {
        ok: true,
        engine: "business-report",
        userType: data.userType,
        text: pdfSafeText,
        riskScore,
        riskLevel
      };

      await query(
        "INSERT INTO report_logs (user_id, report_type, content) VALUES (?, ?, ?)",
        [1, "business", pdfSafeText]
      );

      await LoggingEngine.record({
        route,
        method: "POST",
        request: data,
        response: result,
        latency: Date.now() - startedAt,
        status: "success"
      });

      return result;
    } catch (err: any) {
      return this._error(String(err), data, startedAt, route);
    }
  },

  // =======================================================
  // 🔥 Error Handler
  // =======================================================
  async _error(message: string, request: any, startedAt: number, route: string) {
    const res = {
      ok: false,
      engine: "business-report-error",
      error: message
    };

    await query(
      "INSERT INTO report_logs (user_id, report_type, content) VALUES (?, ?, ?)",
      [1, "business-error", `[ERROR] ${message}`]
    );

    await LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: res,
      latency: Date.now() - startedAt,
      status: "error",
      error: message
    });

    return res;
  }
};
