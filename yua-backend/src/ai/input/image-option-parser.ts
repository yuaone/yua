// src/ai/input/image-option-parser.ts
export function parseImageOptions(message: string) {
  const isReport = /보고서|문서|인쇄/i.test(message);
  const isPresentation = /프레젠테이션|발표|슬라이드/i.test(message);

  return {
    highQuality: /고화질|선명/i.test(message),
    emphasize: /설명\s*강조|포인트\s*강조/i.test(message),
    purpose: isReport
      ? "REPORT"
      : isPresentation
      ? "PRESENTATION"
      : "DEFAULT",
  } as const;
}
