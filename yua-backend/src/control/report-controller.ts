// 📂 src/controllers/report-controller.ts
// 🔥 YUA-AI ReportController — FINAL + MySQL VERSION (2025.11)

import { Request, Response } from "express";
import { ReportEngine } from "../ai/engines/report-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";
import { SolarReportService } from "../ai/services/solar-report-service";

// ⭐ MySQL wrapper
import { query } from "../db/db-wrapper";

export const reportController = {
  /**
   * 📄 POST /api/report/generate
   */
  generate: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();

    try {
      const payload = req.body ?? {};
      const apiKeyMeta = payload.apiKeyMeta ?? null;

      // reportId 생성
      const reportId: string =
        payload.reportId ||
        `REP_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      // ⭐ Solar Report
      if (payload?.template === "solar") {
        const result = SolarReportService.generate(payload);

        const successResponse = {
          ok: true,
          engine: "solar-report",
          reportId,
          text: result.report,
          payload: result.payload,
          raw: null,
        };

        await LoggingEngine.record({
          route: "report/generate",
          method: "POST",
          apiKeyMeta,
          userType: payload?.userType,
          request: payload,
          response: successResponse,
          latency: Date.now() - startedAt,
          status: "success",
        });

        // ⭐ MySQL 저장
        await query(
          `INSERT INTO report_logs (report_id, type, payload, result, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            reportId,
            "solar",
            JSON.stringify(payload),
            JSON.stringify(successResponse),
            Date.now(),
          ]
        );

        return res.status(200).json(successResponse);
      }

      // 일반 ReportEngine
      const result = await ReportEngine.generateReport(payload);

      if (!result?.ok) {
        const failResponse = {
          ok: false,
          engine: "report-error",
          reportId,
          error: result?.error ?? "리포트 생성 중 오류 발생",
        };

        await LoggingEngine.record({
          route: "report/generate",
          method: "POST",
          apiKeyMeta,
          userType: payload?.userType,
          request: payload,
          response: failResponse,
          latency: Date.now() - startedAt,
          status: "error",
          error: result?.error ?? "리포트 생성 오류",
        });

        // ⭐ MySQL 저장
        await query(
          `INSERT INTO report_logs (report_id, type, payload, result, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            reportId,
            "fail",
            JSON.stringify(payload),
            JSON.stringify(failResponse),
            Date.now(),
          ]
        );

        return res.status(500).json(failResponse);
      }

      const successResponse = {
        ok: true,
        engine: "report",
        reportId,
        text: result.text,
        raw: result.raw ?? null,
      };

      await LoggingEngine.record({
        route: "report/generate",
        method: "POST",
        apiKeyMeta,
        userType: payload?.userType,
        request: payload,
        response: successResponse,
        latency: Date.now() - startedAt,
        status: "success",
      });

      // ⭐ MySQL 저장
      await query(
        `INSERT INTO report_logs (report_id, type, payload, result, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          reportId,
          "report",
          JSON.stringify(payload),
          JSON.stringify(successResponse),
          Date.now(),
        ]
      );

      return res.status(200).json(successResponse);
    } catch (e: any) {
      const errorResponse = {
        ok: false,
        engine: "report-error",
        error: String(e),
      };

      await LoggingEngine.record({
        route: "report/generate",
        method: "POST",
        apiKeyMeta: req.body?.apiKeyMeta ?? null,
        userType: req.body?.userType,
        request: req.body ?? {},
        response: errorResponse,
        latency: Date.now() - startedAt,
        status: "error",
        error: String(e),
      });

      // ⭐ MySQL 저장
      await query(
        `INSERT INTO report_logs (report_id, type, payload, result, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "unknown",
          "fatal",
          JSON.stringify(req.body ?? {}),
          JSON.stringify(errorResponse),
          Date.now(),
        ]
      );

      return res.status(500).json(errorResponse);
    }
  },
};
