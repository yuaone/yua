// 📂 src/ai/services/solar-report-service.ts
// 🔥 SolarReportService — 태양광 전용 리포트 서비스
// ✔ SolarEngine + SolarTemplate 연동
// ✔ ReportEngine.generateReport 와 동일한 구조 유지
// ✔ strict mode 완전 통과

import { SolarEngine, SolarInput } from "../engines/solar-engine";
import { buildSolarReportTemplate } from "../templates/solar.template";

export const SolarReportService = {
  generate(input: SolarInput) {
    // 1) 발전량 + 수익 분석
    const result = SolarEngine.analyze(input);

    // 2) AI 템플릿 조합
    const template = buildSolarReportTemplate({
      region: input.region,
      installType: input.installType,
      dailyGeneration: result.dailyGeneration,
      monthlyGeneration: result.monthlyGeneration,
      yearlyGeneration: result.yearlyGeneration,
      monthlyRevenue: result.monthlyRevenue,
      yearlyRevenue: result.yearlyRevenue,
      roiYears: result.roiYears,
      degradation: input.degradationRate,
    });

    return {
      ok: true,
      engine: "solar-report",
      payload: result.payloadForReport,
      report: template,
    };
  },
};
