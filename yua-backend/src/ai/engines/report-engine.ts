import { PromptBuilder } from "../utils/prompt-builder";
import { sanitizeContent } from "../utils/sanitizer";
import { openai } from "../utils/openai-client";

import { GuardrailManager } from "../guardrails/guardrail-manager";
import { Profiler } from "../utils/profiler";

import { SafetyEngine } from "./safety-engine";
import { ValidationEngine } from "./validation-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";
import { pickModel } from "../utils/pick-model";

import { SolarReportService } from "../services/solar-report-service";
import { query } from "../../db/db-wrapper";
import { VectorEngine } from "../vector/vector-engine";

// 🔥 사업자 전용 리포트 엔진
import {
  BusinessReportEngine,
  BusinessPayload
} from "./report-engine.business";

// ------------------------------------------------------------------------------------------------
// 타입 (기존 구조 유지)
// ------------------------------------------------------------------------------------------------
interface CleanReportPayload {
  userType: string;
  transactions: any[];
  pattern?: any;
  risk?: any;
  ip?: string;
  apiKey?: string;
  planId?: string;
}

// ------------------------------------------------------------------------------------------------
// 메인 엔진
// ------------------------------------------------------------------------------------------------
export const ReportEngine = {
  async generate({ input, apiKey, ip }: any) {
    return this.generateReport({ ...input, apiKey, ip });
  },

  async generateReport(data: any) {
    const startedAt = Date.now();
    const route = "report";

    try {
      // ---------------------------------------------------------------------
      // 0) Solar
      // ---------------------------------------------------------------------
      if (data?.template === "solar") {
        return SolarReportService.generate(data);
      }

      // ---------------------------------------------------------------------
      // 1) Validation
      // ---------------------------------------------------------------------
      if (!ValidationEngine.isObject(data))
        return this._error("잘못된 데이터 형식입니다.", data, startedAt, route);

      if (!ValidationEngine.isString(data.userType))
        return this._error("userType이 누락되었습니다.", data, startedAt, route);

      if (!Array.isArray(data.transactions))
        return this._error("transactions 배열이 필요합니다.", data, startedAt, route);

      const persona = Profiler.load(data.userType) ?? { role: data.userType };

      // ---------------------------------------------------------------------
      // 2) 자동 사업자 모드
      // ---------------------------------------------------------------------
      const isBusiness =
        data.userType === "business" ||
        data.userType === "biz" ||
        data.planId === "business_premium";

      if (isBusiness) {
        const safePayload: BusinessPayload = {
          userType: data.userType,
          transactions: data.transactions,
          pattern: data.pattern,
          risk: data.risk,
          ip: typeof data.ip === "string" ? data.ip : undefined,
          apiKey: typeof data.apiKey === "string" ? data.apiKey : undefined,
          businessInfo: data.businessInfo
        };

        return BusinessReportEngine.generateBusinessReport(safePayload);
      }

      // ---------------------------------------------------------------------
      // 3) Guardrail
      // ---------------------------------------------------------------------
      const guard = GuardrailManager.enforce(JSON.stringify(data));
      if (guard.blocked)
        return this._error(`[BLOCKED] ${guard.reason}`, data, startedAt, route);

      // ---------------------------------------------------------------------
      // 4) Safety
      // ---------------------------------------------------------------------
      const safe = SafetyEngine.analyzeUnsafe(JSON.stringify(data));
      if (safe.blocked)
        return this._error(`안전성 필터 차단: ${safe.reason}`, data, startedAt, route);

      // ---------------------------------------------------------------------
      // 5) Cache
      // ---------------------------------------------------------------------
      const cacheKey = CachingEngine.buildKeyFromPayload({
        persona: persona.role,
        transactions: data.transactions,
        pattern: data.pattern,
        risk: data.risk,
      });

      const cached = CachingEngine.get(cacheKey, { namespace: "report" });
      if (cached) return cached;

      // ---------------------------------------------------------------------
      // 6) Sanitize
      // ---------------------------------------------------------------------
      const cleanData: CleanReportPayload = {
        userType: data.userType,
        transactions: data.transactions.map((t: any) => ({
          ...t,
          category: sanitizeContent(t.category ?? ""),
          memo: sanitizeContent(t.memo ?? ""),
        })),
        pattern: data.pattern ?? null,
        risk: data.risk ?? null,
        ip: typeof data.ip === "string" ? data.ip : undefined,
        apiKey: typeof data.apiKey === "string" ? data.apiKey : undefined,
        planId: typeof data.planId === "string" ? data.planId : undefined,
      };

      // ---------------------------------------------------------------------
      // 7) Vector 패턴 분석
      // ---------------------------------------------------------------------
      const VE = new VectorEngine();
      const vectorRaw = await VE.search(
        JSON.stringify(cleanData.transactions),
        5
      );

      const vectorHints =
        vectorRaw?.map((v: any) => v?.meta?.text).filter(Boolean) ?? [];

      const quickTags: string[] = [];
      if (cleanData.transactions.some((t) => t.category.includes("접대")))
        quickTags.push("접대비 패턴");
      if (cleanData.transactions.some((t) => t.memo.includes("현금")))
        quickTags.push("현금성 거래 패턴");

      const hybridBoost =
        (vectorHints.length >= 3 ? 5 : 0) +
        (vectorHints.some((v: string) => v.includes("가공")) ? 5 : 0);

      const freshVectors = vectorRaw.filter(
        (v: any) =>
          Date.now() - (v.meta?.updatedAt ?? 0) < 1000 * 60 * 60 * 24 * 7
      );
      const agingBoost = freshVectors.length >= 1 ? 3 : 0;

      const rerankBoost = vectorHints.some((v: string) =>
        v.includes("부가세")
      )
        ? 5
        : 0;

      cleanData.pattern = [
        ...(cleanData.pattern ?? []),
        ...vectorHints,
        ...quickTags,
      ];

      const metaScoreBoost = hybridBoost + agingBoost + rerankBoost;

      // ---------------------------------------------------------------------
      // 8) Prompt Payload
      // ---------------------------------------------------------------------
      const promptPayload = {
        userType: cleanData.userType,
        transactions: cleanData.transactions,
        pattern: cleanData.pattern,
        risk: cleanData.risk,
      };

      const promptMeta = {
        ip: cleanData.ip,
        apiKey: cleanData.apiKey,
        metaScoreBoost,
      };

      const prompt = await PromptBuilder.buildReportPrompt(
        promptPayload,
        promptMeta
      );

      // ---------------------------------------------------------------------
      // 9) GPT 요청
      // ---------------------------------------------------------------------
      const client = openai();
      if (!client) {
        const mock = {
          ok: true,
          engine: "report-mock",
          text: "Mock 리포트입니다.",
          prompt,
        };
        CachingEngine.set(cacheKey, mock, { namespace: "report" });
        return mock;
      }

      const completion = await client.responses.create({
        model: pickModel("report"),
        input: Buffer.from(prompt, "utf8").toString(),
        max_output_tokens: 1800,
      });

      const text: string =
        completion.output_text?.trim() ?? "리포트 생성 실패";

      const pdfSafeText = text
        .replace(/\t/g, "  ")
        .replace(/\u0000/g, "")
        .trim();

      const result = {
        ok: true,
        engine: "report",
        userType: data.userType,
        text: pdfSafeText,
        patternBoost: metaScoreBoost,
      };

      CachingEngine.set(cacheKey, result, { namespace: "report" });

      await query(
        "INSERT INTO report_logs (user_id, report_type, content) VALUES (?, ?, ?)",
        [1, data.userType, pdfSafeText]
      );

      await LoggingEngine.record({
        route,
        method: "POST",
        request: data,
        response: result,
        latency: Date.now() - startedAt,
        status: "success",
      });

      return result;
    } catch (err: any) {
      return this._error(String(err), data, startedAt, route);
    }
  },

  async _error(message: string, request: any, startedAt: number, route: string) {
    const res = {
      ok: false,
      engine: "report-error",
      error: message,
    };

    await query(
      "INSERT INTO report_logs (user_id, report_type, content) VALUES (?, ?, ?)",
      [1, "error", `[ERROR] ${message}`]
    );

    await LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: res,
      latency: Date.now() - startedAt,
      status: "error",
      error: message,
    });

    return res;
  },
};
