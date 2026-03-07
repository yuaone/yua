export type ImageIntent =
  | "FACTUAL_VISUALIZATION"
  | "SEMANTIC_IMAGE"
  | "COMPOSITE_IMAGE";

export function resolveImageIntent(args: {
  sectionType: string;
  message: string;
}): ImageIntent {
  const wantsVisualization =
    /그래프|분포|시각화|plot|chart/i.test(args.message);

 /**
  * 🔒 SSOT: "사진/이미지" 단순 언급은 생성 의도 아님
  * - 생성 동사 필수
  */
 const wantsImage =
   /(그려|만들어|생성|render|generate|create)/i.test(args.message);

  if (wantsVisualization) {
    return args.sectionType === "RESULT"
      ? "COMPOSITE_IMAGE"
      : "FACTUAL_VISUALIZATION";
  }

  // 🔒 텍스트 기반 이미지 생성은 항상 SEMANTIC
   if (wantsImage) {
   return "SEMANTIC_IMAGE";
 }

 throw new Error("NO_IMAGE_INTENT");
}
