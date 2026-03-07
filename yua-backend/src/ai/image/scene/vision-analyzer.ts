export interface VisionHint {
  hasHuman?: boolean;
  poseHint?: "standing" | "seated" | "unknown";
}

export async function analyzeVisionInput(
  attachments?: { kind: "image"; url: string }[]
): Promise<VisionHint | null> {
  if (!attachments || attachments.length === 0) return null;

  // ❌ 판단 ❌
  // ⭕ 힌트만 ⭕
  return null;
}
