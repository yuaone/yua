// 🔒 YUA Renderer — UNCERTAIN (SSOT v1.1 FINAL)
// 책임:
// - 판단 가능 상태
// - 역질문 ❌
// - 침묵 ❌
// - 항상 "현재 기준에서의 정리된 결론" 제시

import type { ResponsePlan } from "../response-types";

export function renderUncertain(plan: ResponsePlan): string {
  const lines: string[] = [];

  // ✅ 상태 선언 (무지 / 회피 ❌)
  lines.push(
    "현재 정보 기준에서는 판단은 가능하지만, 단일한 결론으로 고정되지는 않아."
  );

  if (plan.depth >= 1) {
    lines.push(
      "그래서 지금 단계에서는 하나의 답을 고르기보다, 적용 가능한 기준을 나눠서 보는 게 합리적이야."
    );
  }

  if (plan.depth >= 2) {
    if (plan.exposeFrame) {
      lines.push(
        "이 문제는 어떤 관점에서 정의하느냐에 따라 결론이 달라질 수 있는 구조야."
      );
    }

    if (plan.exposeAxis) {
      lines.push(
        "핵심 판단 축은 안정성을 우선할지, 효율과 속도를 우선할지에 있어."
      );
    }
  }

  if (plan.depth >= 3 && plan.exposeBoundary) {
    lines.push(
      "결국 어떤 경계 조건을 허용하느냐가 최종 방향을 결정하게 된다."
    );
  }

  return lines.join("\n\n");
}
