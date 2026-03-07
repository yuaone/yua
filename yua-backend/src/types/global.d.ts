// 📂 src/types/global.d.ts
// 🔥 YUA-AI Global Types (2025.11 FINAL)

import "express";

declare global {
  // ---------------------------------------------------------
  // Express Request 확장 → subscription은 express.d.ts에서 관리
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // 사업자 OCR 결과 타입
  // ---------------------------------------------------------
  interface BusinessOCRResult {
    businessNumber: string; // 123-45-67890
    name: string; // 상호명
    type: string; // 업종
    rawImage?: string;
  }

  // ---------------------------------------------------------
  // 사업자모드 세션/DB용
  // ---------------------------------------------------------
  interface BusinessProfile {
    userId: string;
    businessNumber: string;
    name: string;
    type: string;
    createdAt: number;
    updatedAt: number;
  }
}

export {};
