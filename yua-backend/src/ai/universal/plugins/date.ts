// 📂 src/ai/universal/plugins/date.ts
// 📅 날짜 플러그인

export function datePlugin(): string {
  return `현재 날짜/시간: ${new Date().toLocaleString("ko-KR")}`;
}
