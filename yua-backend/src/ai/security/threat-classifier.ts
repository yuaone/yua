// 📂 src/security/threat-classifier.ts
// 🔥 YUA-AI Threat Classifier — ENTERPRISE FINAL (2025.11)
// --------------------------------------------------------------
// ✔ Static Patterns + Auto Patterns + DB Patterns
// ✔ Regex 기반 Threat 탐지
// ✔ 안전한 정규식 처리
// ✔ ThreatEngine과 동일한 탐지 규칙
// ✔ 최근 위협 조회 기능(getRecent) 추가
// --------------------------------------------------------------

import { loadThreatPatterns } from "./threat-loader";

export interface ThreatHistoryItem {
  text: string;
  type: string;
  severity: number;
  mode: string;
  timestamp: number;
}

export const ThreatClassifier = {
  // -------------------------------------------------------
  // 내부 Threat Cache (ControlAggregator가 호출)
  // -------------------------------------------------------
  _history: [] as ThreatHistoryItem[],
  _TTL: 2 * 60 * 1000, // 2분 TTL

  // -------------------------------------------------------
  // 🔍 단순 분류기 (engine의 light 버전)
  // -------------------------------------------------------
  async classify(text: string) {
    try {
      if (!text || typeof text !== "string") {
        return { ok: false, type: "invalid_input" };
      }

      const patterns = await loadThreatPatterns(); // static + auto + DB

      for (const p of patterns) {
        try {
          if (p.regex.test(text)) {
            const record: ThreatHistoryItem = {
              text,
              type: p.type,
              severity: p.severity,
              mode: "regex",
              timestamp: Date.now(),
            };

            this._history.push(record);
            this._cleanup();

            return {
              ok: false,
              type: p.type,
              severity: p.severity,
              mode: "regex",
            };
          }
        } catch (err) {
          console.error("ThreatClassifier Regex Error:", err);
        }
      }

      return { ok: true, type: "none" };
    } catch (err) {
      console.error("ThreatClassifier Fatal Error:", err);
      return { ok: false, type: "error" };
    }
  },

  // -------------------------------------------------------
  // 🧹 TTL 기반 히스토리 삭제
  // -------------------------------------------------------
  _cleanup() {
    const now = Date.now();
    this._history = this._history.filter((e) => now - e.timestamp < this._TTL);
  },

  // -------------------------------------------------------
  // 📡 최근 위협 조회 (ControlAggregator에서 사용)
  // -------------------------------------------------------
  async getRecent() {
    this._cleanup();
    return this._history.slice(-20); // 최대 20개만 전달
  },
};
