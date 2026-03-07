// 📂 src/controllers/match-controller.ts
// 🔥 YUA-AI MatchController — FINAL ENTERPRISE + MySQL VERSION (2025.11.22)

import { Request, Response } from "express";
import { MatchRepo } from "../db/repo/match.repo";
import { LoggingEngine } from "../ai/engines/logging-engine";

// ⭐ MySQL Wrapper
import { query } from "../db/db-wrapper";

export const matchController = {
  /**
   * 🆕 6자리 매칭 코드 생성
   */
  createCode: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    const payload = req.body ?? {};
    const apiKeyMeta = payload.apiKeyMeta ?? null;

    try {
      const userId: unknown = payload.userId;

      if (typeof userId !== "string" || userId.trim().length === 0) {
        const response = {
          ok: false,
          error: "userId 필드가 누락되었거나 문자열이 아닙니다.",
        };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/createCode",
          method: "POST",
          status: "error",
          error: "userId 누락",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["createCode_error", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(400).json(response);
      }

      const recentSnap = await MatchRepo.getRecentCode(userId);

      let existingCode: string | null = null;
      let recentCreatedAt: number | null = null;

      if (recentSnap.ok && recentSnap.found && recentSnap.data) {
        existingCode = recentSnap.data.code ?? null;
        recentCreatedAt = recentSnap.data.createdAt ?? null;
      }

      if (recentCreatedAt !== null && Date.now() - recentCreatedAt < 60000) {
        const response = {
          ok: false,
          error: "최근 1분 내 생성된 코드가 있습니다.",
          existingCode,
        };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/createCode",
          method: "POST",
          status: "error",
          error: "1분 제한",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["createCode_limit", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(429).json(response);
      }

      // 코드 생성
      const raw = Math.random().toString().slice(2, 8);
      const finalCode = raw.replace(/\D/g, "").padEnd(6, "0");

      // MySQL 저장
      const created = await MatchRepo.createCode({
        code: finalCode,
        userId,
        createdAt: Date.now(),
        used: false,
        usedAt: null,
      });

      // ⭐ FIX — created.error 타입 문제 해결됨
if (!created.ok) {
  const msg = String("error" in created ? created.error : "코드 생성 실패");

  const response = {
    ok: false,
    error: msg,
  };

  await LoggingEngine.record({
    apiKeyMeta,
    route: "match/createCode",
    method: "POST",
    status: "error",
    error: msg,   // ← 이제 string 확정
    request: payload,
    response,
    latency: Date.now() - startedAt,
  });

  await query(
    `INSERT INTO match_logs (action, request, response, created_at)
     VALUES (?, ?, ?, ?)`,
    ["createCode_fail", JSON.stringify(payload), JSON.stringify(response), Date.now()]
  );

  return res.status(500).json(response);
}

      const response = {
        ok: true,
        code: finalCode,
        id: created.id,
        existingCode,
      };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/createCode",
        method: "POST",
        status: "success",
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["createCode_success", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.status(200).json(response);
    } catch (e: any) {
      const response = { ok: false, error: String(e) };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/createCode",
        method: "POST",
        status: "error",
        error: String(e),
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["createCode_fatal", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.status(500).json(response);
    }
  },

  /**
   * 🔍 코드 조회
   */
  findCode: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    const payload = req.body ?? {};
    const apiKeyMeta = payload.apiKeyMeta ?? null;

    try {
      const code = req.params?.code;

      if (!code || typeof code !== "string") {
        const response = { ok: false, error: "코드가 필요합니다." };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/findCode",
          method: "POST",
          status: "error",
          error: "코드 누락",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        // ⭐ MySQL 로그
        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["findCode_error", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(400).json(response);
      }

      const result = await MatchRepo.findCode(code);

      if (!result.ok || !result.found) {
        const response = { ok: false, error: "코드를 찾을 수 없습니다." };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/findCode",
          method: "POST",
          status: "error",
          error: "코드를 찾을 수 없음",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["findCode_notfound", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(404).json(response);
      }

      const response = {
        ok: true,
        match: result.data,
        id: result.data.id,
      };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/findCode",
        method: "POST",
        status: "success",
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["findCode_success", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.json(response);
    } catch (e: any) {
      const response = { ok: false, error: String(e) };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/findCode",
        method: "POST",
        status: "error",
        error: String(e),
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["findCode_fatal", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.status(500).json(response);
    }
  },

  /**
   * 🔒 코드 사용 처리
   */
  useCode: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    const payload = req.body ?? {};
    const apiKeyMeta = payload.apiKeyMeta ?? null;

    try {
      const codeId: unknown = payload.codeId;

      if (typeof codeId !== "string" || codeId.trim().length === 0) {
        const response = { ok: false, error: "codeId가 필요합니다." };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/useCode",
          method: "POST",
          status: "error",
          error: "codeId 누락",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["useCode_error", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(400).json(response);
      }

      const result = await MatchRepo.useCode(Number(codeId));

      if (!result.ok) {
        const response = {
          ok: false,
          error: result.error ?? "코드를 사용할 수 없습니다.",
        };

        await LoggingEngine.record({
          apiKeyMeta,
          route: "match/useCode",
          method: "POST",
          status: "error",
          error: result.error ?? "코드 사용 실패",
          request: payload,
          response,
          latency: Date.now() - startedAt,
        });

        await query(
          `INSERT INTO match_logs (action, request, response, created_at)
           VALUES (?, ?, ?, ?)`,
          ["useCode_fail", JSON.stringify(payload), JSON.stringify(response), Date.now()]
        );

        return res.status(400).json(response);
      }

      const response = { ok: true, used: true };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/useCode",
        method: "POST",
        status: "success",
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["useCode_success", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.json(response);
    } catch (e: any) {
      const response = { ok: false, error: String(e) };

      await LoggingEngine.record({
        apiKeyMeta,
        route: "match/useCode",
        method: "POST",
        status: "error",
        error: String(e),
        request: payload,
        response,
        latency: Date.now() - startedAt,
      });

      await query(
        `INSERT INTO match_logs (action, request, response, created_at)
         VALUES (?, ?, ?, ?)`,
        ["useCode_fatal", JSON.stringify(payload), JSON.stringify(response), Date.now()]
      );

      return res.status(500).json(response);
    }
  },
};
