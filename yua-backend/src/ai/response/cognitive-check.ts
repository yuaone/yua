// 🔒 YUA Cognitive Safety Check — SSOT v1.1 FINAL (TYPE FIXED)

import type {
  ResponsePlan,
  ResponseDepth,
} from "./response-types";

/* ================================
   Internal helper
================================ */

function clampDepth(depth: number): ResponseDepth {
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth === 2) return 2;
  return 3;
}

/* ================================
   Public API
================================ */

export function cognitiveSafetyCheck(
  text: string,
  plan: ResponsePlan
): ResponsePlan {
  // 🔒 연산용 변수는 number로 유지
  let nextDepth: number = plan.depth;

  // 1️⃣ 길이 과다
  if (text.length > 1800 && nextDepth > 1) {
    nextDepth = nextDepth - 1;
  }

  // 2️⃣ BLOCK 과다 노출 방지
  if (plan.state === "BLOCK") {
    const exposureCount =
      Number(plan.exposeFrame) +
      Number(plan.exposeAxis) +
      Number(plan.exposeBoundary);

    if (exposureCount > 1 && nextDepth > 0) {
      nextDepth = nextDepth - 1;
    }
  }

  // 3️⃣ UNCERTAIN 단정 어조 완화
  if (
    plan.state === "UNCERTAIN" &&
    /반드시|무조건|확실/.test(text)
  ) {
    // ❌ Math.max 사용 금지 (타입 오염)
    nextDepth = nextDepth > 1 ? nextDepth - 1 : 1;
  }

  const finalDepth: ResponseDepth = clampDepth(nextDepth);

  if (finalDepth === plan.depth) {
    return plan;
  }

  return {
    ...plan,
    depth: finalDepth,
  };
}
