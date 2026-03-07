import type { VisionHint } from "./vision-analyzer";

export interface SceneGraph {
  entities: Array<{
    id: string;
    type: string;
    pose?: string;
    attributes?: Record<string, any>;
  }>;
  relations: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  mood?: string;
}

export function buildSceneFromText(input: {
  message: string;
  sectionType: string;
  visionHint?: VisionHint | null;
}) {
  // 🔒 SSOT: visionHint 없으면 추상 개체만 허용
  if (!input.visionHint) {
    return {
      entities: [
        {
          id: "object",
          type: "generic_object",
          attributes: {
            clarity: "high",
            description: input.message,
          },
        },
      ],
      relations: [],
      mood: "neutral",
    };
  }

  const isHuman = input.visionHint.hasHuman === true;

  return {
    entities: [
      isHuman
        ? {
            id: "subject",
            type: "human_subject",
            pose: input.visionHint.poseHint ?? "standing",
            attributes: {
              realism: "photo_realistic",
              lighting: "soft_studio",
              anatomy: "accurate",
              faceDetail: "high",
              renderStyle: "sharp",
            },
          }
        : {
            id: "object",
            type: "designed_object",
            attributes: {
              geometry: "precise",
              edges: "sharp",
              material: "matte",
              renderStyle: "clean",
            },
          },
    ],
    relations: [],
    mood: "clear_professional",
  };
}  
