import { observeImage } from "../image/image-observer";
import { autoCrop, type AutoCropDeps } from "./tools/auto-crop";
import { runOcr, type OcrDeps, type OCRResult } from "./tools/ocr";
import { zoomImage, type ZoomDeps } from "./tools/zoom";
import { parseLayoutFromOcr, type LayoutParseResult } from "./tools/layout-parser";

export interface VisionPreprocessInput {
  attachments: { kind: "image"; url: string }[];
  message: string;
  visionBudget?: {
    allowOCR?: boolean;
    allowZoom?: boolean;
    allowCrop?: boolean;
    maxImages?: number;
  };
}

export interface VisionPreprocessResult {
  processedAttachments: { kind: "image"; url: string }[];
  signals: {
    usedCrop: boolean;
    usedOCR: boolean;
    usedZoom: boolean;
    confidence: number; // 0~1
  };
  /**
   * OPTIONAL (non-breaking):
   * - 아직 ExecutionEntry에서 안 쓰더라도, 이후 message에 덧붙이거나
   *   analyzer에서 활용 가능하게 열어둠.
   */
  contextText?: string;
}

export type VisionOrchestratorDeps = {
  ocr: OcrDeps;
  crop: AutoCropDeps;
  zoom: ZoomDeps;
};

const DEFAULT_DEPS: VisionOrchestratorDeps = {
  ocr: {},   // 내부에서 safe fallback
  crop: {},  // 내부에서 safe fallback
  zoom: {},  // 내부에서 safe fallback
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isInternalUploadUrl(url: string): boolean {
  return /\/api\/assets\/uploads\/[^/]+\/[^/]+\/[^/?#]+/.test(url);
}

/**
 * Deterministic intent gate (message 기반)
 * - OCR을 "아무 때나" 돌리면 비용/시간 폭발
 * - 하지만 observeImage의 LIKELY_CODE/LIKELY_ERROR는 OCR 텍스트가 있어야 잘 뜸
 * → 메시지 힌트로 OCR 수행을 결정한다 (결정 로직은 deterministic)
 */
function shouldAttemptOcrFromMessage(message: string): boolean {
  const m = (message ?? "").toLowerCase();
  if (!m.trim()) return false;

  // “글씨 읽어줘/텍스트/오타/로그/에러/콘솔/stack” 류면 OCR 시도
  const keywords = [
    "ocr", "text", "typo", "read", "extract",
    "글씨", "텍스트", "오타", "읽어", "추출",
    "error", "exception", "stack", "trace", "console", "log",
    "오류", "에러", "스택", "트레이스", "콘솔", "로그",
    "코드", "typescript", "javascript", "ts", "js",
  ];
  return keywords.some(k => m.includes(k));
}

/**
 * OCR 결과를 넣어 observeImage를 meaningful하게 만든다.
 * - OCR이 없으면 observeImage는 UNCLEAR_IMAGE 쪽으로 기울어져 의미가 약해짐
 */
function buildObservation(ocr: OCRResult | null) {
  return observeImage(
    ocr
      ? { ocr: { text: ocr.text, confidence: ocr.confidence } }
      : {}
  );
}

/**
 * Optional DI factory (테스트/실험에서 필요)
 */
export function createVisionPreprocessor(deps: Partial<VisionOrchestratorDeps>) {
  const merged: VisionOrchestratorDeps = {
    ocr: { ...(DEFAULT_DEPS.ocr), ...(deps.ocr ?? {}) },
    crop: { ...(DEFAULT_DEPS.crop), ...(deps.crop ?? {}) },
    zoom: { ...(DEFAULT_DEPS.zoom), ...(deps.zoom ?? {}) },
  };

  return async function preprocessVisionInput(
    input: VisionPreprocessInput
  ): Promise<VisionPreprocessResult> {
    const originalAttachments = Array.isArray(input.attachments) ? input.attachments : [];
    const message = input.message ?? "";

    if (originalAttachments.length === 0) {
      return {
        processedAttachments: originalAttachments,
        signals: { usedCrop: false, usedOCR: false, usedZoom: false, confidence: 0 },
      };
    }

    // 안전: 어떤 상황에서도 throw 금지
    try {
 const allowOCR =
   input.visionBudget?.allowOCR ?? true; // 🔒 기본은 허용

 const wantOcr =
   allowOCR &&
   shouldAttemptOcrFromMessage(message);

      let anyUsedCrop = false;
      let anyUsedOcr = false;
      let anyUsedZoom = false;

      const confidences: number[] = [];
      const contextBlocks: string[] = [];

      const processedAttachments = await Promise.all(
        originalAttachments.map(async (att) => {
          let currentUrl = att.url;

          // 0) OCR (조건부) — 내부 업로드 URL에만 시도(네트워크/서명URL 위험 회피)
          let ocr: OCRResult | null = null;
          if (wantOcr && isInternalUploadUrl(currentUrl)) {
            ocr = await runOcr(
              { url: currentUrl, message },
              merged.ocr
            );
            if (ocr) {
              anyUsedOcr = true;
              contextBlocks.push(`[OCR]\n${ocr.text}`);
            }
          }

          // 1) observeImage 힌트
          const observation = buildObservation(ocr);
          let confidence = clamp01(observation.observationConfidence ?? 0);

          const hasLowConfidence =
            observation.hints.includes("LOW_CONFIDENCE") ||
            confidence < 0.35; // 보수적 가드 (수치 안정화)

          const likelyCode = observation.hints.includes("LIKELY_CODE");
          const likelyError = observation.hints.includes("LIKELY_ERROR");

          // 2) Layout Parser (OCR 있을 때만) — 결과는 contextText로만 축적
          let layout: LayoutParseResult | null = null;
          if (ocr && (likelyCode || likelyError || /ui|screen|화면|sidebar|버튼|채팅/.test(message.toLowerCase()))) {
            layout = parseLayoutFromOcr(ocr.text);
            if (layout?.summary) {
              contextBlocks.push(`[LAYOUT]\n${layout.summary}`);
            }
          }

          // 3) Auto-crop: LOW_CONFIDENCE일 때만 + 내부 업로드 URL만
          //    (서명 URL 보호)
 const allowCrop =
   input.visionBudget?.allowCrop ?? true;

 if (
   hasLowConfidence &&
   allowCrop &&
   isInternalUploadUrl(currentUrl)
 ) {
            const crop = await autoCrop(
              { url: currentUrl, message, ocrText: ocr?.text ?? null },
              merged.crop
            );

            if (crop?.newUrl && crop.newUrl !== currentUrl) {
              currentUrl = crop.newUrl;
              anyUsedCrop = true;
              confidence = clamp01(confidence + (crop.confidenceDelta ?? 0));
              if (crop.cropBox) {
                contextBlocks.push(`[CROP_BOX] x=${crop.cropBox.x} y=${crop.cropBox.y} w=${crop.cropBox.w} h=${crop.cropBox.h}`);
              }
            }
          }

 const allowZoom =
   input.visionBudget?.allowZoom ?? true;

 if (
   ocr &&
   ocr.confidence < 0.5 &&
   allowZoom &&
   isInternalUploadUrl(currentUrl)
 ) {
            const zoom = await zoomImage(
              { url: currentUrl, factor: 2, reason: "low_ocr_confidence" },
              merged.zoom
            );

            if (zoom?.newUrl && zoom.newUrl !== currentUrl) {
              currentUrl = zoom.newUrl;
              anyUsedZoom = true;
              confidence = clamp01(confidence + (zoom.confidenceDelta ?? 0));
            }
          }

          confidences.push(confidence);

          return { kind: "image" as const, url: currentUrl };
        })
      );

      // 여러 이미지면 "보수적으로" min() 채택 (수치 안정화)
      const finalConfidence =
        confidences.length > 0 ? clamp01(Math.min(...confidences)) : 0;

      const contextText = contextBlocks.length > 0
        ? `[VISION_PREPROCESS_CONTEXT]\n${contextBlocks.join("\n\n")}\n[/VISION_PREPROCESS_CONTEXT]`
        : undefined;

      return {
        processedAttachments,
        signals: {
          usedCrop: anyUsedCrop,
          usedOCR: anyUsedOcr,
          usedZoom: anyUsedZoom,
          confidence: finalConfidence,
        },
        contextText,
      };
    } catch {
      return {
        processedAttachments: originalAttachments,
        signals: { usedCrop: false, usedOCR: false, usedZoom: false, confidence: 0 },
      };
    }
  };
}

/**
 * Default export (ExecutionEntry에서 그대로 호출 가능)
 */
export const preprocessVisionInput = createVisionPreprocessor({});
