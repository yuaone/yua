// 📂 src/ai/security/attack-detector.ts
// 🔥 Real-Time Attack Detector — Enterprise Edition (2025.11)

import { SecurityMemory } from "./security-memory";
import { pool } from "../../db/mysql";

export interface AttackHistory {
  type: string;
  ip: string;
  route: string;
  method: string;
  ua: string;
  timestamp: number;
}

export const AttackDetector = {
  // 🔥 최근 공격 내역 저장소 (ControlRoom에서 사용)
  _history: [] as AttackHistory[],
  _TTL: 2 * 60 * 1000, // 2분 TTL

  cleanup() {
    const now = Date.now();
    this._history = this._history.filter((x) => now - x.timestamp < this._TTL);
  },

  async detect(event: {
    ip: string;
    route: string;
    method: string;
    userAgent?: string;
    status?: number;
    extra?: any;
  }) {
    const {
      ip,
      route,
      method,
      userAgent = "unknown",
      status = 200,
      extra,
    } = event;

    // ---------------------------------------------------------
    // 1) Rate-limit 공격 (30초 내 요청 폭주)
    // ---------------------------------------------------------
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) as cnt
      FROM audit_logs
      WHERE ip = ? AND created_at > NOW() - INTERVAL 30 SECOND
      `,
      [ip]
    );

    const hitCount = (rows as any)[0]?.cnt ?? 0;

    if (hitCount > 50) {
      await this.flag("RATE_ATTACK", ip, route, method, userAgent);
      return { ok: false, type: "RATE_ATTACK" };
    }

    // ---------------------------------------------------------
    // 2) 404 연속 → 포트/경로 스캐닝 공격
    // ---------------------------------------------------------
    if (status === 404) {
      SecurityMemory.increment404(ip);

      if (SecurityMemory.get404(ip) >= 20) {
        await this.flag("PORT_SCAN", ip, route, method, userAgent);
        return { ok: false, type: "PORT_SCAN" };
      }
    }

    // ---------------------------------------------------------
    // 3) SQL Injection / XSS 간단 패턴 감지
    // ---------------------------------------------------------
    const bodySig = typeof extra?.body === "string"
      ? extra.body
      : JSON.stringify(extra?.body ?? "");

    const lower = bodySig.toLowerCase();

    if (
      lower.includes("' or 1=1") ||
      lower.includes("<script>") ||
      lower.includes("union select") ||
      lower.includes("../../") ||
      lower.includes("sleep(")
    ) {
      await this.flag("INJECTION_ATTACK", ip, route, method, userAgent);
      return { ok: false, type: "INJECTION_ATTACK" };
    }

    return { ok: true };
  },

  // ---------------------------------------------------------
  // 공격 기록 + 파일 로그
  // ---------------------------------------------------------
  async flag(
    type: string,
    ip: string,
    route: string,
    method: string,
    ua: string
  ) {
    // MySQL Log
    await pool.query(
      `
      INSERT INTO attack_logs (attack_type, ip, route, method, user_agent)
      VALUES (?, ?, ?, ?, ?)
      `,
      [type, ip, route, method, ua]
    );

    // NDJSON Log (SecurityMemory)
    await SecurityMemory.log({
      type: "attack_detected",
      attackType: type,
      ip,
      route,
      method,
      ua,
      time: new Date().toISOString(),
    });

    // 🔥 메모리에도 저장 (ControlAggregator에서 사용)
    this._history.push({
      type,
      ip,
      route,
      method,
      ua,
      timestamp: Date.now(),
    });

    // TTL 정리
    this.cleanup();
  },

  // ---------------------------------------------------------
  // 📌 ControlAggregator에서 호출되는 함수
  // ---------------------------------------------------------
  async getRecent() {
    this.cleanup();
    return this._history;
  },
};
