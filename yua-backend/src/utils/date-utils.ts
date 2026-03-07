// 📂 src/utils/date-utils.ts
// 📅 Date Utilities — FINAL VERSION (2025.11)
// ✔ YYYY-MM-DD / YYYY.MM.DD 포맷 변환
// ✔ 날짜 차이 계산
// ✔ 월 이름/기간 계산
// ✔ strict mode 100%

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

export function formatDotDate(date: Date | string): string {
  const f = formatDate(date);
  return f ? f.replace(/-/g, ".") : "";
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const d1 = typeof a === "string" ? new Date(a) : a;
  const d2 = typeof b === "string" ? new Date(b) : b;

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function monthName(monthIndex: number): string {
  const names = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ];
  return names[monthIndex] || "";
}
