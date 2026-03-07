// 📂 src/ai/pkl/routing/dynamic-routing.ts
// 🔥 PKL 3.0 — Dynamic Routing Kernel (2025.11 FINAL)

export type Route =
  | "HPE"
  | "LITE"
  | "QUANTUM"
  | "BIZ"
  | "PATTERN"
  | "RISK";

export interface RoutingResult {
  route: Route;
  reason: string;
}

export function runDynamicRouting(cleaned: string): RoutingResult {
  const lower = cleaned.toLowerCase();

  // 1) 비즈니스 관련 (BizEngine)
  if (
    ["세금", "매입", "매출", "부가세", "거래내역"].some((k) =>
      lower.includes(k)
    )
  ) {
    return { route: "BIZ", reason: "Detected business/accounting intent." };
  }

  // 2) 패턴 분석
  if (["패턴", "규칙", "트렌드"].some((k) => lower.includes(k))) {
    return { route: "PATTERN", reason: "Pattern-oriented request." };
  }

  // 3) 리스크 분석
  if (["리스크", "위험", "확률"].some((k) => lower.includes(k))) {
    return { route: "RISK", reason: "Risk evaluation detected." };
  }

  // 4) 깊은 추론 필요 → HPE7
  if (
    ["왜", "근거", "인과", "논리", "추론"].some((k) => lower.includes(k))
  ) {
    return { route: "HPE", reason: "Logical/causal reasoning detected." };
  }

  // 5) 불확실성·예측 → Quantum
  if (["예측", "미래", "확률", "변수"].some((k) => lower.includes(k))) {
    return { route: "QUANTUM", reason: "Probabilistic/future query." };
  }

  // 6) 기본 → Lite Engine
  return { route: "LITE", reason: "Default stable Lite Engine route." };
}
