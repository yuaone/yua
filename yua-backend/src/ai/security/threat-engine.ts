// 📂 src/security/threat-engine.ts
// 🔥 YUA-AI Threat Engine — FINAL ENTERPRISE VERSION (2025.11)
// --------------------------------------------------------------
// ✔ Regex Threat Detection
// ✔ Vector Similarity Threat Detection
// ✔ MySQL Logging (Fail-safe mode)
// ✔ Input validation
// ✔ 안정성 강화 & 예외 처리
// ✔ 서비스 장애 방지형 설계
// --------------------------------------------------------------

import { loadThreatPatterns } from "./threat-loader";
import { pool } from "../../db/mysql";
import { VectorThreat } from "./vector-threat-engine";

export const ThreatEngine = {
  /**
   * 🔍 텍스트 위협 분석
   */
  async analyze(input: { text: string; userId?: string }) {
    try {
      const { text, userId = "unknown" } = input;

      // -----------------------------
      // 0) 입력검증 (DoS / null 방지)
      // -----------------------------
      if (!text || typeof text !== "string") {
        return { ok: false, detected: false, error: "Invalid text input" };
      }

      if (text.length > 50000) {
        // 너무 긴 공격성 payload 방지
        return {
          ok: false,
          detected: true,
          type: "payload_attack",
          severity: 5,
        };
      }

      // -----------------------------
      // 1) 패턴 로딩
      // -----------------------------
      const patterns = await loadThreatPatterns();

      // -----------------------------
      // 2) 정규식 기반 탐지
      // -----------------------------
      for (const p of patterns) {
        try {
          if (p.regex.test(text)) {
            // 로그 저장 (Fail-safe)
            try {
              await pool.query(
                `INSERT INTO threat_logs (user_id, input_text, detected_type, pattern_id, score)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, text, p.type, p.id || null, p.severity]
              );
            } catch (logErr) {
              console.error("ThreatEngine Log Error (Regex):", logErr);
            }

            return {
              ok: false,
              detected: true,
              type: p.type,
              mode: "regex",
              severity: p.severity,
            };
          }
        } catch (regexErr) {
          console.error("ThreatEngine Regex Error:", regexErr);
        }
      }

      // -----------------------------
      // 3) Vector 기반 탐지
      // -----------------------------
      const vector = await VectorThreat.check(text);
      if (vector.detected) {
        try {
          await pool.query(
            `INSERT INTO threat_logs (user_id, input_text, detected_type, score)
             VALUES (?, ?, ?, ?)`,
            [userId, text, vector.type, vector.score]
          );
        } catch (logErr) {
          console.error("ThreatEngine Log Error (Vector):", logErr);
        }

        return {
          ok: false,
          detected: true,
          type: vector.type,
          mode: "vector",
          similarity: vector.score,
        };
      }

      // -----------------------------
      // 4) 위협 없음
      // -----------------------------
      return {
        ok: true,
        detected: false,
        type: "none",
      };
    } catch (err: any) {
      console.error("ThreatEngine Fatal Error:", err);

      // 엔진 오류 시 Fail-safe 대응
      return {
        ok: false,
        detected: false,
        error: "ThreatEngine crashed — fail-safe active",
      };
    }
  },
};
