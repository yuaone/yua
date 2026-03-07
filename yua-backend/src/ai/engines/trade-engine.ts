// 📂 src/ai/engines/trade-engine.ts
// 🔥 YUA-AI TradeEngine — FINAL STRICT VERSION (2025.11.20)
// ✔ startTime → latency 완전 전환
// ✔ LoggingPayload 시그니처 100% 일치
// ✔ Safety / Caching / Logging 통합
// ✔ 내부거래, 계열사, 가공비, 반복금액 탐지

import { sanitizeContent } from "../utils/sanitizer";
import { SafetyEngine } from "./safety-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";

export interface TradePayload {
  transactions: any[];
  userType?: string;
}

export const TradeEngine = {
  /**
   * 🔗 내부거래/가공비 탐지 메인 함수
   */
  async detect(payload: TradePayload, meta?: { apiKey?: string; ip?: string }) {
    const startTime = Date.now();
    const route = "trade.detect";

    try {
      const tx = Array.isArray(payload.transactions) ? payload.transactions : [];

      // ---------------------------------------------------------
      // 1) Safety 검사
      // ---------------------------------------------------------
      const combinedText = tx
        .map((v) => `${v.memo || ""} ${v.category || ""}`)
        .join(" ");

      const safety = SafetyEngine.analyzeUnsafe(combinedText);
      if (safety.blocked) {
        return this._error(
          `차단된 요청: ${safety.reason}`,
          payload,
          startTime,
          route,
          meta
        );
      }

      // ---------------------------------------------------------
      // 2) 캐시 확인
      // ---------------------------------------------------------
      const cacheKey = CachingEngine.buildKeyFromPayload({
        tx,
        userType: payload.userType,
      });

      const cached = CachingEngine.get(cacheKey, { namespace: "trade" });
      if (cached) {
        await LoggingEngine.record({
          route,
          request: payload,
          response: cached,
          latency: Date.now() - startTime,
          apiKey: meta?.apiKey,
          ip: meta?.ip,
          userType: payload?.userType,
          status: "success",
        });
        return cached;
      }

      // ---------------------------------------------------------
      // 3) 내부거래/가공비 탐지
      // ---------------------------------------------------------
      let score = 0;
      const warnings: string[] = [];

      const internal = this.detectInternal(tx);
      score += internal.score;
      warnings.push(...internal.warnings);

      const affiliate = this.detectAffiliate(tx);
      score += affiliate.score;
      warnings.push(...affiliate.warnings);

      const fake = this.detectFakeExpense(tx);
      score += fake.score;
      warnings.push(...fake.warnings);

      const repeat = this.detectRepeatAmount(tx);
      score += repeat.score;
      warnings.push(...repeat.warnings);

      score = Math.min(100, Math.max(0, score));

      const result = {
        ok: true,
        engine: "trade",
        internalTrade: score >= 60,
        riskScore: score,
        warnings,
      };

      // ---------------------------------------------------------
      // 4) 캐싱
      // ---------------------------------------------------------
      CachingEngine.set(cacheKey, result, { namespace: "trade" });

      // ---------------------------------------------------------
      // 5) LoggingEngine 기록
      // ---------------------------------------------------------
      await LoggingEngine.record({
        route,
        request: payload,
        response: result,
        latency: Date.now() - startTime,
        apiKey: meta?.apiKey,
        ip: meta?.ip,
        userType: payload?.userType,
        status: "success",
      });

      return result;
    } catch (err: any) {
      return this._error(
        err?.message || String(err),
        payload,
        startTime,
        route,
        meta
      );
    }
  },

  // ---------------------------------------------------------
  // 🔥 공용 에러 핸들러
  // ---------------------------------------------------------
  async _error(
    message: string,
    request: any,
    startTime: number,
    route: string,
    meta?: { apiKey?: string; ip?: string }
  ) {
    const out = {
      ok: false,
      engine: "trade-error",
      error: message,
    };

    await LoggingEngine.record({
      route,
      request,
      response: out,
      latency: Date.now() - startTime,
      apiKey: meta?.apiKey,
      ip: meta?.ip,
      userType: request?.userType,
      status: "error",
      error: message,
    });

    return out;
  },

  // ---------------------------------------------------------
  // 1) 내부거래 탐지
  // ---------------------------------------------------------
  detectInternal(tx: any[]) {
    let score = 0;
    const warnings: string[] = [];
    const keywords = ["대표", "CEO", "임원", "이사", "가족", "친척", "지인"];

    tx.forEach((t) => {
      const memo = sanitizeContent(t.memo || "");
      keywords.forEach((k) => {
        if (memo.includes(k)) {
          score += 15;
          warnings.push(`⚠️ 내부거래 의심(${k}): ${t.amount.toLocaleString()}원`);
        }
      });
    });

    return { score, warnings };
  },

  // ---------------------------------------------------------
  // 2) 계열사 거래 탐지
  // ---------------------------------------------------------
  detectAffiliate(tx: any[]) {
    let score = 0;
    const warnings: string[] = [];

    const affiliateWords = [
      "홀딩스",
      "파트너스",
      "그룹",
      "엔터프라이즈",
      "법인",
      "Co.",
      "Inc",
      "LLC",
      "Corp",
    ];

    tx.forEach((t) => {
      const vendor = sanitizeContent(t.vendor || "");
      affiliateWords.forEach((k) => {
        if (vendor.includes(k)) {
          score += 10;
          warnings.push(
            `⚠️ 계열사 의심 거래(${k}): ${vendor} / ${t.amount.toLocaleString()}원`
          );
        }
      });
    });

    return { score, warnings };
  },

  // ---------------------------------------------------------
  // 3) 가공비 탐지
  // ---------------------------------------------------------
  detectFakeExpense(tx: any[]) {
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      const cat = sanitizeContent(t.category || "");
      const memo = sanitizeContent(t.memo || "");

      if (cat.includes("접대") && t.amount >= 500000) {
        score += 20;
        warnings.push(
          `⚠️ 고액 접대비 → 가공비 의심: ${t.amount.toLocaleString()}원`
        );
      }

      if (cat.includes("차량") && memo.includes("개인")) {
        score += 15;
        warnings.push(`⚠️ 개인 차량비 법인 처리 의심`);
      }

      if (!memo || memo === "") {
        score += 5;
        warnings.push(`⚠️ 메모 없음 → 가공비/누락 의심`);
      }
    });

    return { score, warnings };
  },

  // ---------------------------------------------------------
  // 4) 동일 금액 반복 탐지
  // ---------------------------------------------------------
  detectRepeatAmount(tx: any[]) {
    const map: Record<number, number> = {};
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      map[t.amount] = (map[t.amount] || 0) + 1;
    });

    Object.keys(map).forEach((k) => {
      const count = map[Number(k)];
      if (count >= 3) {
        score += 10;
        warnings.push(
          `⚠️ 동일 금액 반복: ${Number(k).toLocaleString()}원 (${count}회)`
        );
      }
    });

    return { score, warnings };
  },
};
