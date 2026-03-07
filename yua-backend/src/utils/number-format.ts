// 📂 src/utils/number-format.ts
// 🔢 Number Format Utilities — FINAL VERSION (2025.11)
// ✔ 금액, kWh, kW, 퍼센트 포맷
// ✔ 콤마 포맷
// ✔ strict mode 100%

export function formatNumber(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return "0";
  return num.toLocaleString("ko-KR");
}

export function formatKW(n: number): string {
  return `${formatNumber(n)} kW`;
}

export function formatKWh(n: number): string {
  return `${formatNumber(n)} kWh`;
}

export function formatPercent(n: number, decimals = 1): string {
  if (typeof n !== "number") return "0%";
  return `${n.toFixed(decimals)}%`;
}

export function formatCurrency(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return "₩0";
  return `₩${formatNumber(num)}`;
}
