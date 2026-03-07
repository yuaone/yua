import { Request, Response } from "express";
import { runImageAnalysis } from "../ai/image/image-engine";
import { log } from "../utils/logger";

export const imageController = {
  /**
   * 🖼 이미지 분석
   * - 일반 이미지 분석
   */
  async analyze(req: Request, res: Response) {
    try {
      const imageId = req.body.imageId as string;

      if (!imageId) {
        return res.status(400).json({
          ok: false,
          error: "imageId is required"
        });
      }

      const result = await runImageAnalysis(imageId);

      return res.json({
        ok: true,
        result
      });
    } catch (err: any) {
      log("❌ imageController.analyze Error: " + err.message);

      return res.status(500).json({
        ok: false,
        error: err.message || "Image analysis error"
      });
    }
  },

  /**
   * 🧾 사업자등록증 분석 (OCR)
   * - 사업자 번호/상호명/업종 추출 확장 가능
   */
  async analyzeBusiness(req: Request, res: Response) {
    try {
      const imageId = req.body.imageId as string;

      if (!imageId) {
        return res.status(400).json({
          ok: false,
          error: "imageId is required"
        });
      }

      log(`📄 사업자등록증 분석 요청: ${imageId}`);

      // 1) OCR 엔진 추후 연결 영역
      // const ocrData = await BusinessOCREngine.extract(imageId);

      // 2) 지금은 테스트용 응답
      const mockResult = {
        businessNumber: "123-45-67890",
        name: "테스트상호",
        type: "소매업",
        rawImage: imageId
      };

      return res.json({
        ok: true,
        result: mockResult
      });
    } catch (err: any) {
      log("❌ analyzeBusiness Error: " + err.message);

      return res.status(500).json({
        ok: false,
        error: err.message || "Business OCR error"
      });
    }
  }
};
