// 📂 src/ai/engines/risk-engine.ts
// 🔥 YUA-AI RISK ENGINE v4.1 — FIXED MODEL EDITION (2025.12)
// -------------------------------------------------------------
// ✔ selectModel 제거 → fixedModel 사용
// ✔ Responses API 타입완전호환
// ✔ VectorEngine Hybrid Search v2
// ✔ TS strict 100% 통과
// -------------------------------------------------------------

import { sanitizeContent } from "../utils/sanitizer";
import { GuardrailManager } from "../guardrails/guardrail-manager";
import { Profiler } from "../utils/profiler";
import { SafetyEngine } from "./safety-engine";
import { ValidationEngine } from "./validation-engine";
import { CachingEngine } from "./caching-engine";
import { LoggingEngine } from "./logging-engine";

import { query } from "../../db/db-wrapper";
import { openai } from "../utils/openai-client";
import { VectorEngine } from "../vector/vector-engine";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
interface TxItem {
  amount: number;
  type: string;
  memo: string;
  category: string;
  date?: string;
}

// -------------------------------------------------------------
// Model Fix — selectModel 제거
// -------------------------------------------------------------
const FIXED_MODEL = "gpt-4.1-mini";

// -------------------------------------------------------------
function clean(text: string): string {
  if (!text) return "";
  return text.replace(/\bundefined\b/gi, "").replace(/\bnull\b/gi, "").trim();
}

export const RiskEngine = {
  async analyze(payload: any) {
    return this.analyzeRisk(payload);
  },

  // -------------------------------------------------------------
  async analyzeRisk(rawPayload: unknown) {
    const startedAt = Date.now();
    const route = "risk";

    const payload =
      rawPayload && typeof rawPayload === "object" ? rawPayload : {};

    try {
      // Validation
      if (!ValidationEngine.isObject(payload)) {
        return this._error("payload가 올바르지 않습니다.", payload, startedAt, route);
      }

      const text = sanitizeContent(String(payload.text ?? ""));

      // Tx 타입 정리
      const tx: TxItem[] = Array.isArray(payload.transactions)
        ? payload.transactions.map((t: any) => ({
            amount: Number(t.amount ?? 0),
            type: String(t.type ?? ""),
            memo: String(t.memo ?? ""),
            category: String(t.category ?? ""),
            date: t.date ? String(t.date) : undefined,
          }))
        : [];

      const userType: string = String(payload.userType ?? "individual");
      const persona = Profiler.load(userType) ?? { role: userType };

      // Guardrail
      const guard = GuardrailManager.enforce(JSON.stringify(payload));
      if (guard.blocked) {
        return this._error(`[BLOCKED] ${guard.reason}`, payload, startedAt, route);
      }

      // Safety
      const unsafe = SafetyEngine.analyzeUnsafe(text);
      if (unsafe.blocked) {
        return this._error(`요청 차단: ${unsafe.reason}`, payload, startedAt, route);
      }

      // Cache
      const cacheKey = CachingEngine.buildKeyFromPayload({
        persona: persona.role,
        text,
        tx,
      });

      const cached = CachingEngine.get(cacheKey, { namespace: "risk" });
      if (cached) {
        await LoggingEngine.record({
          route,
          method: "POST",
          request: payload,
          response: cached,
          latency: Date.now() - startedAt,
        });
        return cached;
      }

      // -------------------------------------------------------------
      // VectorEngine Hybrid Search v2
      // -------------------------------------------------------------
      const vector = new VectorEngine();
      const vectorRaw = await vector.search(JSON.stringify({ text, tx }), 8);

      const vectorHints = vectorRaw
        ?.map((v: any) => v?.meta?.text)
        .filter(Boolean) ?? [];

      let hybridScoreBoost = 0;
      if (vectorHints.length >= 4) hybridScoreBoost += 12;
      if (vectorHints.some((h: string) => h.includes("탈세"))) hybridScoreBoost += 8;
      if (vectorHints.some((h: string) => h.includes("가공"))) hybridScoreBoost += 5;

      // -------------------------------------------------------------
      // Responses API — Fixed Model Edition
      // -------------------------------------------------------------
      let aiExplanation = "AI 분석 비활성화(Mock)";
      const client = openai();

      try {
        const completion = await client.responses.create({
          model: FIXED_MODEL,
          input: `
회계/세무 기준으로 다음 텍스트 + 거래내역의 리스크를 분석하라.

텍스트:
${text}

거래내역:
${JSON.stringify(tx)}

벡터 기반 패턴:
${JSON.stringify(vectorHints)}
          `.trim(),
          max_output_tokens: 300,
        });

        aiExplanation = clean(completion.output_text || "");
      } catch {
        aiExplanation = "AI 분석 실패(Mock 사용)";
      }

      // -------------------------------------------------------------
      // Rule-based Risk
      // -------------------------------------------------------------
      let score = 0;
      const warnings: string[] = [];

      const r1 = this.checkRiskKeywords(text);
      score += r1.score;
      warnings.push(...r1.warnings);

      const r2 = this.checkAmountRisk(tx);
      score += r2.score;
      warnings.push(...r2.warnings);

      const r3 = this.checkInternalTransfer(tx);
      score += r3.score;
      warnings.push(...r3.warnings);

      const r4 = this.checkRepeatPattern(tx);
      score += r4.score;
      warnings.push(...r4.warnings);

      const r5 = this.checkFakeExpense(tx);
      score += r5.score;
      warnings.push(...r5.warnings);

      // Vector 기반 보정
      score += hybridScoreBoost;

      // Aging Weight
      const fresh = vectorRaw.filter(
        (v: any) => (Date.now() - (v.meta?.updatedAt ?? 0)) < 1000 * 60 * 60 * 24 * 7
      );
      if (fresh.length >= 1) score += 6;

      // CrossEncoder Stub
      if (text.includes("증빙 없이") || text.includes("현금 매출")) {
        score += 5;
      }

      score = Math.max(0, Math.min(100, score));

      // -------------------------------------------------------------
      // Final Output
      // -------------------------------------------------------------
      const result = {
        ok: true,
        engine: "risk",
        riskScore: score,
        flagged: score >= 60,
        warnings,
        vectorHints,
        aiExplanation,
      };

      // Cache save
      CachingEngine.set(cacheKey, result, { namespace: "risk" });

      // DB Log
      await query(
        "INSERT INTO risk_logs (user_id, input, result, score) VALUES (?, ?, ?, ?)",
        [1, text, JSON.stringify(result), score]
      );

      await LoggingEngine.record({
        route,
        method: "POST",
        request: payload,
        response: result,
        latency: Date.now() - startedAt,
      });

      return result;
    } catch (err: any) {
      return this._error(String(err), payload, startedAt, route);
    }
  },

  // -------------------------------------------------------------
  async _error(message: string, req: any, startedAt: number, route: string) {
    const out = {
      ok: false,
      engine: "risk-error",
      error: clean(message),
    };

    await query(
      "INSERT INTO risk_logs (user_id, input, result, score) VALUES (?, ?, ?, ?)",
      [1, JSON.stringify(req), `[ERROR] ${message}`, 0]
    );

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req,
      response: out,
      error: message,
      latency: Date.now() - startedAt,
    });

    return out;
  },

  // -------------------------------------------------------------
  // RULE BASED
  // -------------------------------------------------------------
  checkRiskKeywords(text: string) {
    const risky = [
      "가공비", "차명", "세금 안 내", "탈세", "차명계좌",
      "증빙 없이", "현금으로 빼", "접대비 대충", "세금 줄이는 꼼수",
      "현금 매출", "누락",
    ];

    let score = 0;
    const warnings: string[] = [];

    risky.forEach((k) => {
      if (text.includes(k)) {
        score += 15;
        warnings.push(`⚠️ 위험 키워드 감지: "${k}"`);
      }
    });

    return { score, warnings };
  },

  checkAmountRisk(tx: TxItem[]) {
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      if (t.amount >= 30000000) {
        score += 20;
        warnings.push(`⚠️ 고액 거래: ${t.amount.toLocaleString()}원`);
      }
      if (t.amount <= 1000 && t.type === "expense") {
        score += 5;
        warnings.push(`⚠️ 잔돈 지출 반복 가능성: ${t.amount}원`);
      }
    });

    return { score, warnings };
  },

  checkInternalTransfer(tx: TxItem[]) {
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      const memo = sanitizeContent(t.memo);
      if (
        memo.includes("대표") ||
        memo.includes("가족") ||
        memo.includes("동업자") ||
        memo.includes("임원")
      ) {
        score += 15;
        warnings.push(`⚠️ 내부거래 의심: ${memo} (${t.amount.toLocaleString()}원)`);
      }
    });

    return { score, warnings };
  },

  checkRepeatPattern(tx: TxItem[]) {
    const map: Record<number, number> = {};
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      map[t.amount] = (map[t.amount] || 0) + 1;
    });

    for (const amt in map) {
      if (map[amt] >= 3) {
        score += 10;
        warnings.push(
          `⚠️ 동일 금액 반복 지출: ${Number(amt).toLocaleString()}원 (${map[amt]}회)`
        );
      }
    }

    return { score, warnings };
  },

  checkFakeExpense(tx: TxItem[]) {
    let score = 0;
    const warnings: string[] = [];

    tx.forEach((t) => {
      const cat = sanitizeContent(t.category);
      const memo = sanitizeContent(t.memo);

      if (cat.includes("접대") && t.amount >= 500000) {
        score += 15;
        warnings.push(`⚠️ 고액 접대비 → 가공비 의심 (${t.amount.toLocaleString()}원)`);
      }

      if (cat.includes("차량") && memo.includes("개인") && t.amount >= 300000) {
        score += 10;
        warnings.push("⚠️ 개인 차량비의 법인 비용 처리 의심");
      }
    });

    return { score, warnings };
  },
};
