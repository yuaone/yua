// 📂 src/ai/business/report/business-report-builder.ts
// 🔥 Business PDF Report Builder — ENTERPRISE FINAL 2025.11
// -------------------------------------------------------------
// ✔ pdf-engine.ts 와 100% 호환되는 title/content/businessMode 구조
// ✔ UTF-8 안전 처리 (sanitizeContent)
// ✔ Pretendard 임베딩을 고려한 Pure Text 구성
// ✔ 사업자 정보 + 분석 요약 자동 템플릿

import { sanitizeContent } from "../../utils/sanitizer";

export interface BusinessReportInput {
  businessNumber?: string;
  name?: string;
  type?: string;
  summary: string;  // AI 분석 요약 텍스트
}

export interface BusinessReportBuildResult {
  title: string;
  content: string;
  businessMode: true; // pdf-engine.ts 에서 라벨 사용
}

export const BusinessReportBuilder = {
  buildReport(input: BusinessReportInput): BusinessReportBuildResult {
    const safeNumber = sanitizeContent(input.businessNumber ?? "-");
    const safeName = sanitizeContent(input.name ?? "-");
    const safeType = sanitizeContent(input.type ?? "-");
    const safeSummary = sanitizeContent(input.summary ?? "");

    // 🔥 PDF 최상단 제목
    const title = `사업자 리포트 — ${safeName}`;

    // 🔥 Pure Text (PDF 엔진에 완전 안전)
    const content = `
📌 사업자 기본 정보
- 상호명: ${safeName}
- 등록번호: ${safeNumber}
- 유형: ${safeType}

📌 분석 요약
${safeSummary}
    `.trim();

    return {
      title,
      content,
      businessMode: true
    };
  }
};
