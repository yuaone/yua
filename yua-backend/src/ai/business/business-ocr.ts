// 📂 src/ai/business/business-ocr.ts
// 🔥 YUA-AI Business OCR Engine (2025.11 FINAL)
// 사업자등록증 이미지에서 기본 정보 추출 (OCR API 없이도 동작)

import type { BusinessOCRResult } from "./business.types";

/* ======================================================
   Engine
====================================================== */
export const BusinessOCREngine = {
  /**
   * 🔎 사업자등록증 OCR 파싱
   * @param rawText Vision API or OCR API 결과 (string)
   */
  parse(rawText: string): BusinessOCRResult {
    if (!rawText || typeof rawText !== "string") {
      return {
        businessNumber: "",
        name: "",
        type: "",
        rawImage: "",
      };
    }

    // 1) 사업자등록번호 (NNN-NN-NNNNN)
    const bizRegex = /(\d{3}-\d{2}-\d{5})/;
    const bizMatch = rawText.match(bizRegex);

    // 2) 상호명
    const nameRegex =
      /(?:상호|업체명|회사명)[:\s]*([가-힣A-Za-z0-9 ]{2,30})/;
    const nameMatch = rawText.match(nameRegex);

    // 3) 업종 / 업태
    const typeRegex =
      /(?:업종|업태)[:\s]*([가-힣A-Za-z0-9 ]{2,20})/;
    const typeMatch = rawText.match(typeRegex);

    return {
      businessNumber: bizMatch?.[1] ?? "",
      name: nameMatch?.[1]?.trim() ?? "",
      type: typeMatch?.[1]?.trim() ?? "",
      rawImage: rawText,
    };
  },
};
