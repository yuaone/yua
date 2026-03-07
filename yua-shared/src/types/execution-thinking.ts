import type { ThinkingProfile, DeepVariant } from "./thinkingProfile";

export interface ExecutionThinking {
  profile: ThinkingProfile;
  deepVariant?: DeepVariant;
  confidence: number;
}
