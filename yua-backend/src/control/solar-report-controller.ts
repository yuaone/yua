// 📂 src/controllers/solar-report-controller.ts
// 🔥 Solar Report Controller — FINAL STRICT VERSION (2025.11)

import { Router, Request, Response } from "express";

import { ValidationEngine } from "../ai/engines/validation-engine";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";
import { SolarEngine, SolarInput } from "../ai/engines/solar-engine";

export const SolarReportController = Router();

/**
 * ---------------------------------------------------------------------
 * 🌞 1) Solar Report 생성
 * POST /solar/report
 * ---------------------------------------------------------------------
 */
SolarReportController.post(
  "/solar/report",
  async (req: Request, res: Response) => {
    const route = "solar.report";
    const start = Date.now();

    try {
      const { data, apiKey } = req.body;

      // -------------------------------
      // 1) Validation
      // -------------------------------
      if (!ValidationEngine.isObject(data)) {
        return error("data 파라미터 누락", req.body);
      }

      // -------------------------------
      // 2) Safety 검사
      // -------------------------------
      const unsafe = SafetyEngine.analyzeUnsafe(JSON.stringify(data));
      if (unsafe.blocked) {
        return error(`차단됨: ${unsafe.reason}`, req.body);
      }

      // -------------------------------
      // 3) SolarInput 강제 정합 처리
      // -------------------------------
      const installType =
        data.installType === "commercial" ? "commercial" : "residential";

      const safeInput: SolarInput = {
        region: String(data.region ?? ""),
        installType,
        systemSizeKW: Number(data.systemSizeKW ?? 0),
        panelEfficiency: Number(data.panelEfficiency ?? 0),
        tilt: Number(data.tilt ?? 0),
        direction: String(data.direction ?? ""),
        degradationRate: Number(data.degradationRate ?? 0),
        smp: Number(data.smp ?? 0),
        rec: Number(data.rec ?? 0),
      };

      // -------------------------------
      // 4) SolarEngine 실행
      // -------------------------------
      const result = SolarEngine.analyze(safeInput);

      // -------------------------------
      // 5) LoggingEngine 기록
      // -------------------------------
      await LoggingEngine.record({
        route,
        method: "POST",
        request: req.body,
        response: result,
        apiKey,
        ip: req.ip,
        latency: Date.now() - start,
      });

      return res.json(result);
    } catch (err: any) {
      return error(err?.message || String(err), req.body);
    }

    // -----------------------------------------------------------------
    // 공통 에러 핸들러
    // -----------------------------------------------------------------
    function error(message: string, request: any) {
      const out = { ok: false, engine: "solar-error", error: message };

      LoggingEngine.record({
        route,
        method: "POST",
        request,
        response: out,
        error: message,
        apiKey: req.body?.apiKey,
        ip: req.ip,
        latency: Date.now() - start,
      });

      return res.status(400).json(out);
    }
  }
);

export default SolarReportController;
