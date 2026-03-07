// 📂 src/controllers/threat-controller.ts
// 🔥 YUA-AI — Threat Controller FINAL ENTERPRISE VERSION (2025.11)
// --------------------------------------------------------------
// ✔ SuperAdmin 관리 패턴 조회/추가
// ✔ ThreatEngine 통한 탐지
// ✔ MySQL 기반 패턴/로그 관리
// ✔ 안정적 오류 처리
// ✔ TypeScript 완전 대응
// --------------------------------------------------------------

import { Request, Response } from "express";
import { ThreatEngine } from "../ai/security/threat-engine";
import { pool } from "../db/mysql";

export const ThreatController = {
  /**
   * 🔍 위협 탐지 (일반 사용자 / API)
   * POST /threat/check
   */
  async check(req: Request, res: Response) {
    try {
      const { text, userId } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          ok: false,
          error: "text is required",
        });
      }

      const result = await ThreatEngine.analyze({ text, userId });
      return res.json(result);
    } catch (err: any) {
      console.error("ThreatController.check Error:", err);
      return res.status(500).json({
        ok: false,
        error: err.message || "Internal Server Error",
      });
    }
  },

  /**
   * 📌 Threat 패턴 전체 조회 (SuperAdmin 전용)
   * GET /threat/patterns
   */
  async listPatterns(req: Request, res: Response) {
    try {
      const [rows] = await pool.query("SELECT * FROM threat_patterns ORDER BY id DESC");

      return res.json({
        ok: true,
        count: (rows as any[]).length,
        patterns: rows,
      });
    } catch (err: any) {
      console.error("ThreatController.listPatterns Error:", err);
      return res.status(500).json({
        ok: false,
        error: err.message || "Internal Server Error",
      });
    }
  },

  /**
   * ➕ Threat 패턴 추가 (SuperAdmin 전용)
   * POST /threat/patterns/add
   */
  async addPattern(req: Request, res: Response) {
    try {
      const { type, pattern, severity = 1, lang = "en" } = req.body;

      if (!type || !pattern) {
        return res.status(400).json({
          ok: false,
          error: "type and pattern are required",
        });
      }

      if (typeof severity !== "number" || severity < 1 || severity > 5) {
        return res.status(400).json({
          ok: false,
          error: "severity must be a number between 1 and 5",
        });
      }

      await pool.query(
        `INSERT INTO threat_patterns (type, pattern, severity, lang)
         VALUES (?, ?, ?, ?)`,
        [type, pattern, severity, lang]
      );

      return res.json({
        ok: true,
        message: "Pattern successfully added",
      });
    } catch (err: any) {
      console.error("ThreatController.addPattern Error:", err);
      return res.status(500).json({
        ok: false,
        error: err.message || "Internal Server Error",
      });
    }
  },
};
