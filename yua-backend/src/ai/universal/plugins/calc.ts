// 📂 src/ai/universal/plugins/calc.ts
// 🔢 계산 플러그인 (초간단 계산기)

export function calcPlugin(expr: string): string {
  try {
    // 안전 필터 (숫자/기호만 허용)
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      return "지원하지 않는 계산식입니다.";
    }

    const result = Function(`return (${expr})`)();
    return `결과: ${result}`;
  } catch {
    return "계산할 수 없는 식입니다.";
  }
}
