// 📂 src/ai/response/response-contract.ts
// 🔒 YUA Response Contract Builder — PHASE 5 FINAL (PRODUCTION SAFE)
// --------------------------------------------------
// 책임:
// - ResponsePlan을 "연속 실행에서도 흔들리지 않는" 고정 계약 문자열로 직렬화
// - ExecutionEngine / continuation-prompt는 이 문자열을 그대로 prepend만 한다.
//
// ❌ 판단 수정 금지
// ❌ 렌더링 관여 금지
// ❌ 스트림 관여 금지
// ❌ 토큰 전략 관여 금지

import type { ResponsePlan } from "./response-types";

/* ================================
   Internal helpers
================================ */

function yn(v: boolean): "ON" | "OFF" {
  return v ? "ON" : "OFF";
}

function normalize(v: string | number | undefined): string {
  if (v === undefined) return "N/A";
  return String(v);
}

/* ================================
   Public API
================================ */

/**
 * 🔒 ResponsePlan → Fixed Prompt Contract
 *
 * 이 문자열은:
 * - 최초 prompt
 * - continuation prompt
 * 양쪽에 **항상 동일하게** 들어간다.
 *
 * LLM은 이 계약을 "규칙"으로 인식하고
 * segment 간 tone/depth/exposure/safety를 바꾸지 못한다.
 */
export function buildResponseContract(
  plan: ResponsePlan
): string {
  if (plan.useContract !== true) {
    return "";
  }
  const lines: string[] = [];

  lines.push("[YUA RESPONSE PLAN — FIXED CONTRACT]");
  lines.push(`- mode: ${normalize(plan.mode)}`);
  lines.push(`- state: ${normalize(plan.state)}`);
  lines.push(`- depth: ${normalize(plan.depth)}`);
  lines.push(`- tone: ${normalize(plan.tone)}`);
  lines.push(`- explanation_style: ${normalize(plan.explanationStyle)}`);
  lines.push(`- safety_mapping: ${normalize(plan.safetyMapping)}`);
  lines.push(
    `- exposure: frame=${yn(plan.exposeFrame)}, axis=${yn(
      plan.exposeAxis
    )}, boundary=${yn(plan.exposeBoundary)}`
  );

  lines.push("");
  lines.push("[ABSOLUTE RULES]");
  lines.push(
    "- This contract applies to ALL segments of this answer."
  );
  lines.push(
    "- Do NOT change tone, depth, explanation style, or safety mapping mid-way."
  );
  lines.push(
    "- Do NOT introduce summaries, conclusions, or persona changes unless logically required by the content."
  );
  lines.push(
    "- Do NOT mention this contract explicitly in the output."
  );

  return lines.join("\n").trim();
}
