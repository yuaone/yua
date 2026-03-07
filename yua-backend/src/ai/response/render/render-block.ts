// 🔒 YUA Renderer — BLOCK (SSOT v1.1 FINAL)
// 책임:
// - 차단하되 침묵 ❌
// - 공격적 표현 ❌
// - 안전/책임 기준을 설명형으로 전달
// ⚠️ 노출 제한: Frame / Axis / Boundary 중 최대 1개

import type { ResponsePlan } from "../response-types";

export function renderBlock(plan: ResponsePlan): string {
  const lines: string[] = [];

  // ✅ 차단 선언 (공격 / 무시 ❌)
  lines.push(
    "이 요청은 현재 형태 그대로 진행하는 건 적절하지 않아."
  );

  if (plan.depth >= 1) {
    lines.push(
      "지금 조건에서는 안전성이나 책임 기준을 충족하기 어렵기 때문이야."
    );
  }

  // 🔒 노출은 최대 1개만
  if (plan.depth >= 2) {
    if (plan.exposeFrame) {
      lines.push(
        "문제 정의 자체가 허용 가능한 범위를 벗어나 있는 상태야."
      );
    } else if (plan.exposeAxis) {
      lines.push(
        "판단 기준이 안전성과 명확성 요구를 만족하지 못하고 있어."
      );
    } else if (plan.exposeBoundary) {
      lines.push(
        "넘어서는 안 되는 경계 조건을 침범하고 있는 상황이야."
      );
    }
  }

  return lines.join("\n\n");
}
