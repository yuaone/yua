// 📂 src/ai/templates/solar.template.ts
// 🔥 Solar AI Report Template (B-Style Sales Edition) — 2025.11
// ✔ 고객 제안용 / 짧고 명확 / 중복 ZERO
// ✔ ReportEngine.generateReport 와 완전 호환
// ✔ PDF 목적 고화질 문장 설계

export function buildSolarReportTemplate(input: {
  region: string;
  installType: "residential" | "commercial";
  dailyGeneration: number;
  monthlyGeneration: number;
  yearlyGeneration: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  roiYears: number;
  degradation: number;
}) {
  const {
    region,
    installType,
    dailyGeneration,
    monthlyGeneration,
    yearlyGeneration,
    monthlyRevenue,
    yearlyRevenue,
    roiYears,
    degradation,
  } = input;

  const typeLabel =
    installType === "commercial" ? "상업용 설치" : "주택용 설치";

  return `
📌 ${typeLabel} 태양광 발전 제안서

고객님께서 검토 중이신 조건을 기반으로 발전량·수익성을 종합 분석하여 안내드립니다.

━━━━━━━━━━━━━━━━━━━
■ 예상 발전량
━━━━━━━━━━━━━━━━━━━
• 일 평균 발전량: ${dailyGeneration.toLocaleString()} kWh
• 월 예상 발전량: ${monthlyGeneration.toLocaleString()} kWh
• 연간 예상 발전량: ${yearlyGeneration.toLocaleString()} kWh

해당 수치는 ${region} 지역의 일사량 자료를 반영한 안정적인 산출 값입니다.

━━━━━━━━━━━━━━━━━━━
■ 예상 수익
━━━━━━━━━━━━━━━━━━━
• 월 예상 수익: ${monthlyRevenue.toLocaleString()} 원
• 연간 예상 수익: ${yearlyRevenue.toLocaleString()} 원

SMP·REC 단가를 포함하여 계산된 실질 수익으로, 시장 변동에도 일정 수준의 안정성을 갖도록 설계되었습니다.

━━━━━━━━━━━━━━━━━━━
■ 투자 회수 기간
━━━━━━━━━━━━━━━━━━━
예상 회수 기간은 약 **${roiYears}년**으로 분석됩니다.
회수 이후에는 순수익이 꾸준히 발생하며, 장기적인 현금흐름 개선에 도움이 됩니다.

━━━━━━━━━━━━━━━━━━━
■ 장기 전망 (20년 예측)
━━━━━━━━━━━━━━━━━━━
패널 성능 저하율(연 ${degradation}%)을 포함하더라도
장기적으로 투자 가치가 유지되는 안정적인 구조입니다.

━━━━━━━━━━━━━━━━━━━
■ 최종 안내
━━━━━━━━━━━━━━━━━━━
현재 조건은 고객님의 설치 환경을 기준으로 효율을 극대화하도록 구성된 모델입니다.
추가 문의가 있으시면 언제든지 말씀해 주세요.
가장 유리한 방향으로 상세한 설명을 도와드리겠습니다.
`;
}
