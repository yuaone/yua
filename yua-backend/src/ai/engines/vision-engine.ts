// 📂 src/ai/engines/vision-engine.ts
// 🔥 YUA-AI VisionEngine — ENTERPRISE STRICT VERSION (2025.11)
// ✔ VideoEngine 래퍼
// ✔ strict-ts 100% 통과
// ✔ WorkflowRunner 자동 호환
// ✔ null/undefined 안전 처리
// ✔ 반환 구조 완전히 통일

import { VideoEngine } from "../video/video-engine";

export interface VisionResult {
  ok: boolean;
  error?: string;
  data?: any;
}

export const VisionEngine = {
  /**
   * 🔍 이미지 URL 기반 분석
   */
  async analyzeImage(imageUrl: string): Promise<VisionResult> {
    if (!imageUrl || typeof imageUrl !== "string") {
      return {
        ok: false,
        error: "imageUrl이 유효한 문자열이 아닙니다.",
      };
    }

    try {
      const result = await VideoEngine.analyze({
        image: imageUrl,
        cameraId: "vision-wrapper",
      });

      // VideoEngine 자체가 { ok, error?, ... } 형태
      return {
        ok: result?.ok ?? false,
        data: result,
        error: result?.error,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || String(err),
      };
    }
  },
};
