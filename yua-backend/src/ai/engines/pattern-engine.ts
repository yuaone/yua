// 📂 src/ai/engines/pattern-engine.ts
// 🔥 YUA-AI PatternEngine — FINAL STRICT + STRING SUPPORT (2025.11.30)

import { sanitizeContent } from "../utils/sanitizer";
import { ValidationEngine } from "./validation-engine";
import { SafetyEngine } from "./safety-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";

export interface PatternItem {
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
}

export const PatternEngine = {
  /**
   * 📈 패턴 분석 — 문자열 & 배열 모두 지원
   */
  async analyze(
    data: PatternItem[] | string,
    meta?: { apiKey?: string; ip?: string }
  ) {
    const start = Date.now();
    const route = "pattern";

    try {
      // ---------------------------------------------------
      // 0) 문자열 기반 간이 패턴 처리
      // ---------------------------------------------------
      if (typeof data === "string") {
        const clean = sanitizeContent(data);

        return {
          ok: true,
          engine: "pattern",
          summary: clean,
          confidence: 0.65,
        };
      }

      // ---------------------------------------------------
      // 1) Validation — 배열 아닌 경우
      // ---------------------------------------------------
      if (!Array.isArray(data)) {
        return this._error(
          "입력 데이터 형식이 잘못되었습니다.",
          data,
          start,
          route,
          meta
        );
      }

      // ---------------------------------------------------
      // 2) Safety 검사
      // ---------------------------------------------------
      const combinedText = data.map((d) => d.category).join(" ");
      const safety = SafetyEngine.analyzeUnsafe(combinedText);

      if (safety.blocked) {
        return this._error(
          `차단된 요청: ${safety.reason}`,
          data,
          start,
          route,
          meta
        );
      }

      // ---------------------------------------------------
      // 3) 캐싱
      // ---------------------------------------------------
      const cacheKey = CachingEngine.buildKeyFromPayload({ data });
      const cached = CachingEngine.get(cacheKey, { namespace: "pattern" });

      if (cached) {
        await LoggingEngine.record({
          route,
          method: "INTERNAL",
          request: data,
          response: cached,
          apiKey: meta?.apiKey,
          ip: meta?.ip,
          latency: Date.now() - start,
        });

        return cached;
      }

      // ---------------------------------------------------
      // 4) 패턴 분석
      // ---------------------------------------------------
      const sanitized = data.map((v) => ({
        ...v,
        category: sanitizeContent(v.category),
      }));

      const categoryTotals = this.sumByCategory(sanitized);
      const trend = this.monthOverMonth(sanitized);
      const recurring = this.detectRecurringPatterns(sanitized);
      const risks = this.detectRisks(sanitized);
      const ratio = this.calculateCategoryRatio(categoryTotals);

      const result = {
        ok: true,
        engine: "pattern",
        summary: "패턴 분석 완료",
        categoryTotals,
        categoryRatio: ratio,
        trend,
        recurring,
        risks,
      };

      // 캐싱 저장
      CachingEngine.set(cacheKey, result, { namespace: "pattern" });

      // 로그 기록
      await LoggingEngine.record({
        route,
        method: "INTERNAL",
        request: data,
        response: result,
        apiKey: meta?.apiKey,
        ip: meta?.ip,
        latency: Date.now() - start,
      });

      return result;
    } catch (err: any) {
      return this._error(
        err?.message || String(err),
        data,
        start,
        route,
        meta
      );
    }
  },

  // -----------------------------------
  // Error Wrapper
  // -----------------------------------
  async _error(message: string, request: any, start: number, route: string, meta?: { apiKey?: string; ip?: string }) {
    const out = { ok: false, engine: "pattern-error", error: message };

    await LoggingEngine.record({
      route,
      method: "INTERNAL",
      request,
      response: out,
      apiKey: meta?.apiKey,
      ip: meta?.ip,
      latency: Date.now() - start,
    });

    return out;
  },

  // -----------------------------------
  // Util Funcs
  // -----------------------------------
  sumByCategory(list: PatternItem[]) {
    const map: Record<string, number> = {};
    list.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + item.amount;
    });
    return map;
  },

  monthOverMonth(list: PatternItem[]) {
    const monthly: Record<string, number> = {};

    list.forEach((item) => {
      const month = item.date.slice(0, 7);
      if (!monthly[month]) monthly[month] = 0;

      if (item.type === "expense") monthly[month] += item.amount;
      else monthly[month] -= item.amount;
    });

    const months = Object.keys(monthly).sort();
    if (months.length < 2) return null;

    const last = months[months.length - 1];
    const prev = months[months.length - 2];

    const diff = monthly[last] - monthly[prev];
    const rate = Number(((diff / Math.abs(monthly[prev])) * 100).toFixed(2));

    return {
      lastMonth: last,
      previousMonth: prev,
      difference: diff,
      rate,
    };
  },

  detectRecurringPatterns(list: PatternItem[]) {
    const freqMap: Record<string, number> = {};

    list.forEach((i) => {
      const key = `${i.category}:${i.amount}`;
      freqMap[key] = (freqMap[key] || 0) + 1;
    });

    return Object.entries(freqMap)
      .filter(([, count]) => count >= 3)
      .map(([key, count]) => ({ pattern: key, count }));
  },

  detectRisks(list: PatternItem[]) {
    const risks: string[] = [];

    list.forEach((i) => {
      const hour = Number(i.date.split("T")[1]?.slice(0, 2) || "0");

      if (hour >= 1 && hour <= 5)
        risks.push(`⚠️ 새벽시간 소비: ${i.category} ${i.amount}원`);

      if (i.amount >= 900000)
        risks.push(`⚠️ 고액 지출: ${i.category} ${i.amount}원`);

      if (i.amount <= 1000 && i.type === "expense")
        risks.push(`⚠️ 잔돈 소비 반복: ${i.amount}원`);
    });

    return risks;
  },

  calculateCategoryRatio(categoryTotals: Record<string, number>) {
    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const ratio: Record<string, number> = {};
    Object.keys(categoryTotals).forEach((cat) => {
      ratio[cat] = Number(((categoryTotals[cat] / total) * 100).toFixed(2));
    });

    return ratio;
  },
};
