// 📂 src/ai/engines/biz-engine.ts
// ✔ AWS 빌드 오류 해결 (TS7006 등)
// ✔ vectorMatches 타입 정의 + map() 타입 적용

import { VectorEngine } from "../vector/vector-engine";
import { runProviderAuto } from "../../service/provider-engine";
import { sanitizeContent } from "../utils/sanitizer";
import { query } from "../../db/db-wrapper";
import { LoggingEngine } from "./logging-engine";

export interface BizInput {
  statements: {
    revenue: any[];
    cost: any[];
    expense: any[];
    assets?: any[];
    liabilities?: any[];
    equity?: any[];
  };
  year?: number;
  quarter?: number;
  industry?: string;
  mode?: "basic" | "expert";
  apiKey?: string;
  ip?: string;
}

interface RiskScoreInput {
  ruleHits: string[];
  aiRisk: { risk?: number; reason?: string } | null;
  debtRatio: number;
  operatingMargin: number;
  roa: number;
  roe: number;
}

export const BizEngine = {
  async analyze(input: BizInput) {
    const startedAt = Date.now();
    const route = "biz";

    try {
      if (!input.statements)
        return { ok: false, error: "statements 필드가 필요합니다." };

      const {
        revenue = [],
        cost = [],
        expense = [],
        assets = [],
        liabilities = [],
        equity = []
      } = input.statements;

      const year = input.year ?? new Date().getFullYear();
      const quarter = input.quarter ?? null;
      const industry = input.industry ?? "기타";

      // 정제
      const clean = (list: any[]) =>
        list.map((t) => ({
          ...t,
          category: sanitizeContent(t?.category ?? ""),
          memo: sanitizeContent(t?.memo ?? "")
        }));

      const rev = clean(revenue);
      const cogs = clean(cost);
      const exp = clean(expense);

      // 재무 계산
      const totalRevenue = sum(rev);
      const totalCOGS = sum(cogs);
      const grossProfit = totalRevenue - totalCOGS;

      const totalExpense = sum(exp);
      const operatingProfit = grossProfit - totalExpense;

      const totalAssets = sum(assets);
      const totalLiabilities = sum(liabilities);
      const totalEquity = sum(erOrZero(equity));

      const liquidityRatio = ratio(totalAssets, totalLiabilities);
      const debtRatio = ratio(totalLiabilities, totalEquity);
      const operatingMargin = ratio(operatingProfit, totalRevenue);
      const roe = ratio(operatingProfit, totalEquity);
      const roa = ratio(operatingProfit, totalAssets);

      // Industry Benchmark
      const industryBench = getIndustryBenchmarks(industry);

      const benchCompare = {
        revenueLevel: compare(totalRevenue, industryBench.revenue),
        debtRisk: compare(debtRatio, industryBench.debtRatio),
        operatingMargin: compare(
          operatingMargin,
          industryBench.operatingMargin
        )
      };

      // VectorEngine
      // ---------------------------------------------------------
// VectorEngine 패턴 검색
// ---------------------------------------------------------
const vector = new VectorEngine();

// 🔥 VectorMatch 타입 제거 → TS2304 오류 해결
const vectorMatches =
  (await vector.search(JSON.stringify({ rev, cogs, exp }), 5)) ?? [];

// 🔥 strict 모드 대응: 안전한 텍스트 추출
const vectorInsights: string[] = vectorMatches
  .map((v: any) => (v?.meta?.text ? String(v.meta.text) : null))
  .filter((text: string | null): text is string => Boolean(text));


      // RuleEngine
      const ruleHits = detectRuleRisks({
        totalRevenue,
        operatingProfit,
        debtRatio,
        operatingMargin,
        roa,
        roe
      });

      // AI 분석
      const aiPrompt = buildAIPrompt({
        rev,
        cogs,
        exp,
        vectorInsights,
        ruleHits,
        year,
        quarter,
        industry,
        metrics: {
          liquidityRatio,
          debtRatio,
          operatingMargin,
          roa,
          roe
        }
      });

      const aiRaw = await runProviderAuto(aiPrompt);
      const aiRisk = safeParse(typeof aiRaw === "string" ? aiRaw : aiRaw.output);

      // 위험 점수 합산
      const finalRisk = calcFinalRiskScore({
        ruleHits,
        aiRisk,
        debtRatio,
        operatingMargin,
        roa,
        roe
      });

      const result = {
        ok: true,
        year,
        quarter,
        industry,
        metrics: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          totalExpense,
          operatingProfit,
          liquidityRatio,
          debtRatio,
          operatingMargin,
          roa,
          roe
        },
        benchCompare,
        vectorInsights,
        ruleHits,
        aiRisk,
        finalRisk
      };

      // statements 변수 확보 (상단에 이미 있다면 생략)
const statements = input.statements;

// INSERT
await query(
  "INSERT INTO biz_logs (statements_json, result_json, created_at) VALUES (?, ?, ?)",
  [
    JSON.stringify(statements),
    JSON.stringify(result),
    Date.now()
  ]
);


      await LoggingEngine.record({
        route,
        method: "POST",
        request: input,
        response: result,
        latency: Date.now() - startedAt,
        status: "success"
      });

      return result;
    } catch (err: any) {
      return { ok: false, error: String(err) };
    }
  }
};

// Helper
function sum(list: any[]): number {
  return list.reduce((s, x) => s + Number(x.amount ?? 0), 0);
}

function erOrZero(list: any[]) {
  return Array.isArray(list) ? list : [];
}

function ratio(a: number, b: number): number {
  if (!b) return 0;
  return Number((a / b).toFixed(4));
}

function compare(value: number, benchmark: number) {
  if (!benchmark) return "정보 부족";
  if (value > benchmark * 1.2) return "상위";
  if (value < benchmark * 0.8) return "하위";
  return "평균";
}

function safeParse(json: string) {
  try {
    const clean = json
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(clean);
  } catch {
    return { risk: 0, reason: json ?? "", advice: "AI 분석 오류" };
  }
}


function detectRuleRisks(input: {
  totalRevenue?: number;
  operatingProfit?: number;
  debtRatio: number;
  operatingMargin: number;
  roa: number;
  roe: number;
}): string[] {
  const risks: string[] = [];

  if (input.debtRatio > 300) risks.push("⚠ 부채비율 매우 높음");
  if (input.operatingMargin < 0) risks.push("⚠ 영업손실");
  if (input.roa < 0) risks.push("⚠ ROA 음수 — 자산 대비 손실");
  if (input.roe < 0) risks.push("⚠ ROE 음수 — 자본 대비 손실");

  if ((input.totalRevenue ?? 0) < 10000000)
    risks.push("⚠ 매출 매우 낮음 — 영세 위험");

  return risks;
}

function calcFinalRiskScore(input: RiskScoreInput): number {
  let score = 0;

  score += input.ruleHits.length * 10;
  score += input.aiRisk?.risk ?? 0;

  if (input.debtRatio > 200) score += 20;
  if (input.operatingMargin < 0) score += 15;
  if (input.roa < 0) score += 15;

  return Math.min(100, score);
}

function buildAIPrompt(payload: any) {
  return `
기업 재무 데이터와 패턴을 분석하여 위험도를 평가하라.
JSON으로만 답변하라.

[Vector Insights]
${payload.vectorInsights.join("\n")}

[RuleEngine Hits]
${payload.ruleHits.join("\n")}

[Metrics]
${JSON.stringify(payload.metrics)}

출력(JSON):
{
  "risk": 0~100,
  "reason": "핵심 요약",
  "advice": "개선 방안"
}
  `.trim();
}

function getIndustryBenchmarks(industry: string) {
  return {
    revenue: 500000000,
    debtRatio: 150,
    operatingMargin: 0.12
  };
}
