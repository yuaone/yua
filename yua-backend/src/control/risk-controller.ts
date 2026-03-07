// 📂 src/controllers/risk-controller.ts
// 🔥 YUA-AI RiskController — FINAL ENTERPRISE VERSION (2025.11)
// ✔ LoggingEngine 완전 통합
// ✔ MySQL Log 추가 (기존 로직 100% 유지)

import { Request, Response } from "express";
import { RiskEngine } from "../ai/engines/risk-engine";
import { TradeEngine } from "../ai/engines/trade-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

// ⭐ MySQL Wrapper 추가
import { query } from "../db/db-wrapper";

export const riskController = {
  /**
   * 🛡 POST /api/risk/analyze
   */
  analyze: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();

    try {
      const payload = req.body ?? {};
      const apiKeyMeta = payload.apiKeyMeta ?? null;

      // ─────────────────────────────────────────────
      // 1) 위험도 분석
      // ─────────────────────────────────────────────
      const risk = await RiskEngine.analyzeRisk(payload);

      if (!risk?.ok) {
        await LoggingEngine.record({
          apiKeyMeta,
          route: "risk/analyze",
          model: "risk-engine",
          tokens: risk?.tokens ?? 0,
          status: "error",
          latency: Date.now() - startedAt,
          error: risk?.error ?? "리스크 분석 오류",
          request: payload,
          response: risk,
        });

        return res.status(500).json({
          ok: false,
          engine: "risk-error",
          error: risk?.error ?? "리스크 분석 중 오류 발생",
        });
      }

      // ─────────────────────────────────────────────
      // 2) 내부거래 탐지
      // ─────────────────────────────────────────────
      const trade = await TradeEngine.detect(payload);

      if (!trade?.ok) {
        await LoggingEngine.record({
          apiKeyMeta,
          route: "risk/analyze",
          model: "trade-engine",
          tokens: trade?.tokens ?? 0,
          status: "error",
          latency: Date.now() - startedAt,
          error: trade?.error ?? "내부거래 탐지 오류",
          request: payload,
          response: trade,
        });

        return res.status(500).json({
          ok: false,
          engine: "trade-error",
          error: trade?.error ?? "내부거래 분석 중 오류 발생",
        });
      }

      // ─────────────────────────────────────────────
      // 3) 점수 통합
      // ─────────────────────────────────────────────
      const combinedScore = Math.min(
        100,
        Math.round(
          ((risk.riskScore ?? 0) + (trade.riskScore ?? 0)) / 2
        )
      );

      const successPayload = {
        ok: true,
        engine: "risk",
        riskScore: combinedScore,
        internalTrade: trade.internalTrade ?? false,
        warnings: [
          ...(risk.warnings ?? []),
          ...(trade.warnings ?? []),
        ],
        debug: {
          riskEngine: risk,
          tradeEngine: trade,
        },
      };

      // ─────────────────────────────────────────────
      // ⭐⭐ MySQL log 저장 추가 (기존 코드 유지)
      // ─────────────────────────────────────────────
      try {
        await query(
          `
          INSERT INTO risk_logs
          (payload, risk_result, trade_result, combined_score, created_at)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            JSON.stringify(payload),
            JSON.stringify(risk),
            JSON.stringify(trade),
            combinedScore,
            Date.now(),
          ]
        );
      } catch (mysqlErr: any) {
        console.error("❌ MySQL risk_logs 저장 오류:", mysqlErr);
        // 에러 나도 전체 API 흐름은 절대 중단되지 않음
      }

      // ─────────────────────────────────────────────
      // 4) 성공 로그
      // ─────────────────────────────────────────────
      await LoggingEngine.record({
        apiKeyMeta,
        route: "risk/analyze",
        model: "risk+trade",
        tokens: (risk?.tokens ?? 0) + (trade?.tokens ?? 0),
        status: "success",
        latency: Date.now() - startedAt,
        request: payload,
        response: successPayload,
      });

      // ─────────────────────────────────────────────
      // 5) 성공 응답
      // ─────────────────────────────────────────────
      return res.status(200).json(successPayload);

    } catch (e: any) {
      const fatalOut = {
        ok: false,
        engine: "risk-fatal",
        error: String(e),
      };

      // ─────────────────────────────────────────────
      // 6) 글로벌 오류
      // ─────────────────────────────────────────────
      await LoggingEngine.record({
        apiKeyMeta: req.body?.apiKeyMeta ?? null,
        route: "risk/analyze",
        model: "risk-controller",
        tokens: 0,
        status: "error",
        latency: Date.now() - startedAt,
        error: String(e),
        request: req.body,
        response: fatalOut,
      });

      return res.status(500).json(fatalOut);
    }
  },
};
