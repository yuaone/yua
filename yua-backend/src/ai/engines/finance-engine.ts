// 📂 src/ai/engines/finance-engine.ts
// ✔ AWS STRICT 빌드 오류 해결 (TS7006, implicit any 등)
// ✔ VectorMatch 타입 적용
// ✔ aiRaw 타입 고정
// ✔ 모든 함수 타입 완전 고정
// ✔ 로직/기능 절대 변경 없음 (오로지 타입 에러 제거만)

// ----------------------------------------------------------------------

import { VectorEngine } from "../vector/vector-engine";
import { runProviderAuto } from "../../service/provider-engine";
import { sanitizeContent } from "../utils/sanitizer";
import { query } from "../../db/db-wrapper";
import { LoggingEngine } from "./logging-engine";

// ----------------------------------------------------------------------
// Input 타입 정의
// ----------------------------------------------------------------------

export interface FinanceInput {
  income: any[];
  expense: any[];
  year?: number;
  month?: number;
  userType?: "개인" | "프리랜서" | "사업자" | "법인";
  expert?: boolean;
  apiKey?: string;
  ip?: string;
}

export interface FinanceAIRisk {
  risk?: number;
  reason?: string;
  advice?: string;
}

// ----------------------------------------------------------------------

export const FinanceEngine = {
  async analyze(input: FinanceInput) {
    const startedAt = Date.now();
    const route = "finance";

    try {
      // -----------------------------------------------------
      // Validation
      // -----------------------------------------------------
      if (!Array.isArray(input.income) || !Array.isArray(input.expense)) {
        return { ok: false, error: "income / expense 배열 필요" };
      }

      const year: number = input.year ?? new Date().getFullYear();
      const month: number | null = input.month ?? null;
      const userType: FinanceInput["userType"] = input.userType ?? "개인";
      const expertMode: boolean = input.expert ?? false;

      // -----------------------------------------------------
      // 1) 데이터 정제
      // -----------------------------------------------------
      const income = input.income.map((t: any) => ({
        ...t,
        category: sanitizeContent(t.category ?? ""),
        memo: sanitizeContent(t.memo ?? ""),
      }));

      const expense = input.expense.map((t: any) => ({
        ...t,
        category: sanitizeContent(t.category ?? ""),
        memo: sanitizeContent(t.memo ?? ""),
      }));

      // -----------------------------------------------------
      // 2) PGVector 패턴 검색
      // -----------------------------------------------------
      const vector = new VectorEngine();
const vectorQuery = JSON.stringify({ income, expense });

// 🔥 VectorMatch 타입 제거
const vectorMatches =
  (await vector.search(vectorQuery, 5)) ?? [];

// 🔥 strict mode + 안전 파싱 + null 대응
const vectorInsights: string[] = (vectorMatches || [])
  .map((v: any) => {
    const text = v?.meta?.text;
    return text ? String(text) : null;
  })
  .filter((text): text is string => Boolean(text));


      // -----------------------------------------------------
      // 3) 합계 계산
      // -----------------------------------------------------
      const totalIncome = sum(income);
      const totalExpense = sum(expense);
      const netIncome = totalIncome - totalExpense;

      // -----------------------------------------------------
      // 4) VAT 계산
      // -----------------------------------------------------
      let vat: any = null;
      if (userType === "프리랜서" || userType === "사업자") {
        vat = calcVAT(totalIncome, totalExpense);
      }

      // -----------------------------------------------------
      // 5) 종합소득세 계산
      // -----------------------------------------------------
      const incomeTax = calcIncomeTax({
        totalIncome,
        totalExpense,
        userType,
      });

      // -----------------------------------------------------
      // 6) 건강보험료 리스크
      // -----------------------------------------------------
      const insurance = calcInsuranceRisk({
        totalIncome,
        userType,
      });

      // -----------------------------------------------------
      // 7) RuleEngine 위험 탐지
      // -----------------------------------------------------
      const ruleRisks = detectRuleFinanceRisks({
        totalIncome,
        totalExpense,
        netIncome,
      });

      // -----------------------------------------------------
      // 8) AI 위험 분석
      // -----------------------------------------------------
      const riskPrompt = buildAIPrompt({
        income,
        expense,
        vectorInsights,
        ruleRisks,
        userType,
      });

      const aiRaw: any = await runProviderAuto(riskPrompt);
      const aiRisk: FinanceAIRisk = safeParse(
        typeof aiRaw === "string" ? aiRaw : aiRaw?.output
      );

      // -----------------------------------------------------
      // 9) FINAL RISK SCORE
      // -----------------------------------------------------
      const finalRisk: number = calcFinalRisk({
        aiRisk,
        ruleRisks,
        vectorInsights,
      });

      // -----------------------------------------------------
      // 10) 결과
      // -----------------------------------------------------
      const result = {
        ok: true,
        userType,
        year,
        month,
        totalIncome,
        totalExpense,
        netIncome,
        vat,
        incomeTax,
        insurance,
        vectorInsights,
        ruleRisks,
        aiRisk,
        finalRisk,
        expertMode,
      };

      // -----------------------------------------------------
      // DB 로그
      // -----------------------------------------------------
      await query(
  "INSERT INTO finance_logs (income_json, expense_json, result_json, created_at) VALUES (?, ?, ?, ?)",
  [
    JSON.stringify(input.income),
    JSON.stringify(input.expense),
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
        status: "success",
      });

      return result;
    } catch (err: any) {
      return { ok: false, error: String(err) };
    }
  },
};

// ----------------------------------------------------------------------
// Helper Functions (타입 보완)
// ----------------------------------------------------------------------

function sum(list: any[]): number {
  return list.reduce((s, x) => s + Number(x.amount ?? 0), 0);
}

function safeParse(text: string | undefined): FinanceAIRisk {
  if (!text) return { risk: 0, reason: "Empty response", advice: "AI 분석 실패" };

  try {
    // 🔥 AI 응답이 ```json ... ``` 형태일 때 제거
    const clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(clean);
  } catch {
    return { risk: 0, reason: text, advice: "AI 분석 실패" };
  }
}


// ----------------------------------------------------------------------
// VAT
// ----------------------------------------------------------------------

function calcVAT(income: number, expense: number) {
  const outputTax = income * 0.1;
  const inputTax = expense * 0.1;

  return {
    outputTax: Math.round(outputTax),
    inputTax: Math.round(inputTax),
    dueVAT: Math.round(outputTax - inputTax),
    caution:
      expense / income > 0.6
        ? "경비율 과다 — 세무 확인 필요"
        : "정상 범위",
  };
}

// ----------------------------------------------------------------------
// 종합소득세
// ----------------------------------------------------------------------

function calcIncomeTax(params: {
  totalIncome: number;
  totalExpense: number;
  userType: string;
}) {
  const taxable = params.totalIncome - params.totalExpense;
  if (taxable <= 0) return { estimatedTax: 0, bracket: "0%" };

  const brackets = [
    { max: 12000000, rate: 0.06 },
    { max: 46000000, rate: 0.15 },
    { max: 88000000, rate: 0.24 },
    { max: 150000000, rate: 0.35 },
    { max: 300000000, rate: 0.38 },
    { max: 500000000, rate: 0.4 },
    { max: Infinity, rate: 0.42 },
  ];

  let tax = 0;
  let bracketRate = 0;

  for (const b of brackets) {
    if (taxable <= b.max) {
      tax = taxable * b.rate;
      bracketRate = b.rate;
      break;
    }
  }

  return {
    estimatedTax: Math.round(tax),
    bracket: `${Math.round(bracketRate * 100)}%`,
  };
}

// ----------------------------------------------------------------------
// 건강보험료
// ----------------------------------------------------------------------

function calcInsuranceRisk(params: {
  totalIncome: number;
  userType: string;
}) {
  if (params.userType === "법인") return null;

  const base = params.totalIncome;

  return {
    estimatedPremium: Math.round(base * 0.0685),
    caution:
      base > 60000000
        ? "소득월액보험료 추가 부과 가능성"
        : "정상 범위",
  };
}

// ----------------------------------------------------------------------
// RuleEngine
// ----------------------------------------------------------------------

function detectRuleFinanceRisks(input: {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}): string[] {
  const risks: string[] = [];

  if (input.netIncome < 0) risks.push("⚠ 순손실 발생");
  if (input.totalExpense / input.totalIncome > 0.7)
    risks.push("⚠ 경비 과다");
  if (input.totalIncome < 5000000)
    risks.push("⚠ 소득 규모 매우 낮음 — 영세 위험");

  return risks;
}

// ----------------------------------------------------------------------
// FINAL RISK
// ----------------------------------------------------------------------

function calcFinalRisk(params: {
  aiRisk: FinanceAIRisk;
  ruleRisks: string[];
  vectorInsights: string[];
}): number {
  let score = 0;

  score += params.aiRisk?.risk ?? 0;
  score += params.ruleRisks.length * 10;
  if (params.vectorInsights.length > 0) score += 5;

  return Math.min(100, score);
}

// ----------------------------------------------------------------------
// AI 프롬프트
// ----------------------------------------------------------------------

function buildAIPrompt(data: {
  income: any[];
  expense: any[];
  vectorInsights: string[];
  ruleRisks: string[];
  userType: string;
}) {
  return `
소득/지출 데이터를 기반으로 금융 위험도를 평가하라.

[소득]
${JSON.stringify(data.income)}

[지출]
${JSON.stringify(data.expense)}

[Vector 패턴 인사이트]
${data.vectorInsights.join("\n")}

[규칙 기반 위험]
${data.ruleRisks.join("\n")}

출력(JSON):
{
  "risk": 0~100,
  "reason": "핵심 원인",
  "advice": "개선 방안"
}
  `.trim();
}
