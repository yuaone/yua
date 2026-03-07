// 📂 src/ai/response/render/render-defer.ts
// 🔒 YUA Renderer — DEFER (SSOT v1.1 FINAL)

import type { ResponsePlan } from "../response-types";

export function renderDefer(plan: ResponsePlan): string {
  const lines: string[] = [];

  // 유예 선언 (침묵 ❌)
  lines.push(
    "지금 단계에서는 결론을 서두르기보다 잠시 멈추는 게 더 안전해."
  );

  if (plan.depth >= 1) {
    lines.push(
      "현재 조건에서는 판단에 필요한 핵심 정보가 아직 충분하지 않아."
    );
  }

  if (plan.depth >= 2) {
    if (plan.exposeFrame) {
      lines.push(
        "문제의 범위가 아직 명확히 닫히지 않은 상태야."
      );
    }

    if (plan.exposeAxis) {
      lines.push(
        "중요한 판단 축이 아직 고정되지 않았어."
      );
    }
  }

  if (plan.depth >= 3 && plan.exposeBoundary) {
    lines.push(
      "이 경계가 정리되기 전에는 어떤 결론도 쉽게 흔들릴 수 있어."
    );
  }

  return lines.join("\n\n");
}
