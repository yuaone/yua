// 📂 src/ai/response/render/render-approve.ts
// 🔒 YUA Renderer — APPROVE (SSOT v1.1 FINAL)

import type { ResponsePlan } from "../response-types";

export function renderApprove(plan: ResponsePlan): string {
  const lines: string[] = [];

  // 결론 (항상 존재)
  lines.push("결론부터 말하면, 이 방향이 가장 적절해.");

  if (plan.depth >= 1) {
    lines.push(
      "현재 조건을 기준으로 보면, 이 선택이 가장 안정적인 결과를 만들고 있어."
    );
  }

  if (plan.depth >= 2) {
    if (plan.exposeFrame) {
      lines.push(
        "이 판단은 문제를 구조적으로 단순화해서 핵심 축만 남겨 본 결과야."
      );
    }

    if (plan.exposeAxis) {
      lines.push(
        "여기서 중요한 기준은 효율성과 유지 가능성의 균형이야."
      );
    }
  }

  if (plan.depth >= 3 && plan.exposeBoundary) {
    lines.push(
      "다만 전제가 크게 바뀌면 이 결론은 다시 검토되어야 해."
    );
  }

  return lines.join("\n\n");
}
