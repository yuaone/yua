import type { ImageAnalysisPlan } from "../execution/execution-plan";

export function mapImagePlanToMediaPayload(args: {
  plan: ImageAnalysisPlan;
  attachments?: { kind: "image"; url: string }[];
}): {
  sectionId: number;
  sectionType: string;
  message: string;
  computed?: {
    series: number[];
    title?: string;
    maxIndex?: number;
    maxValue?: number;
  };
  attachments?: { kind: "image"; url: string }[];
} | null {
  const { plan, attachments } = args;

  if (
    plan.task !== "IMAGE_ANALYSIS" ||
    plan.payload?.nextAction !== "GENERATE_ASSET"
  ) {
    return null;
  }

  const obs: any = plan.payload.observation;

  // 🔒 SSOT: 여기서만 구조 해석
  if (typeof obs?.sectionId !== "number" || !obs?.sectionType) {
    return null;
  }

  return {
    sectionId: obs.sectionId,
    sectionType: obs.sectionType,
    message: obs.message ?? "",
    computed: obs.computed,
    attachments,
  };
}
