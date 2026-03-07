import type { PathType } from "../../routes/path-router";
import type { ChatMode } from "../chat/types/chat-mode";
import type { ThinkingProfile, DeepVariant } from "yua-shared";
export type ComputeTier = "FAST" | "NORMAL" | "DEEP";

export interface ComputePolicy {
  tier: ComputeTier;
  /** STREAM continuation segment upper bound (still gated by allowContinuation) */
  maxSegments: number;
  /** Stream flush cadence (UX + server load) */
  flushIntervalMs: number;
  verifierBudget?: number;
 // 🔍 SEARCH
  allowSearch?: boolean;
  maxSearchRetriesPerSegment?: number;
  deepVariant?: DeepVariant;
  reasoningFlushIntervalMs?: number;
  /** Idle cutoff for stream session */
  idleMs: number;
}

export function decideComputePolicy(args: {
  path: PathType;
  mode: ChatMode;
  thinkingProfile: ThinkingProfile;
  hasImage: boolean;
  verifierVerdict?: "PASS" | "WEAK" | "FAIL";
  failureRisk?: "LOW" | "MEDIUM" | "HIGH";
  deepVariant?: DeepVariant;
}): ComputePolicy {
  const { thinkingProfile, hasImage, verifierVerdict, failureRisk, deepVariant } = args;

  // 🔒 SSOT: 이미지 입력은 기본 NORMAL (FAST는 명시 요청만)
  if (hasImage) {
    if (thinkingProfile === "FAST") {
      return { tier: "FAST", maxSegments: 1, flushIntervalMs: 25, idleMs: 1200 };
    }
    return { tier: "NORMAL", maxSegments: 4, flushIntervalMs: 80, idleMs: 2000 };
  }

  const requestedDeep = thinkingProfile === "DEEP";
  const forceDeepCompute =
    verifierVerdict === "FAIL" || failureRisk === "HIGH";
  let useDeepCompute = requestedDeep || forceDeepCompute;

  if (
    thinkingProfile !== "DEEP" &&
    verifierVerdict === "PASS" &&
    failureRisk === "LOW"
  ) {
    useDeepCompute = false;
  }

  const tier: ComputeTier = useDeepCompute
    ? "DEEP"
    : thinkingProfile === "FAST"
      ? "FAST"
      : "NORMAL";

  switch (tier) {
    case "DEEP":
      if (deepVariant === "EXPANDED") {
        return {
          tier: "DEEP",
          maxSegments: 7,
          flushIntervalMs: 240,
          idleMs: 4500,
          deepVariant: "EXPANDED",
          reasoningFlushIntervalMs: 420,
   verifierBudget: 5,
   allowSearch: true,
   maxSearchRetriesPerSegment: 3,
        };
      }

      return {
        tier: "DEEP",
        maxSegments: 5,
        flushIntervalMs: 180,
        idleMs: 3500,
        deepVariant: "STANDARD",
        reasoningFlushIntervalMs: 280,
        verifierBudget: 3,
      };
    case "FAST":
      return { tier: "FAST", maxSegments: 1, flushIntervalMs: 80, idleMs: 1200 };
    case "NORMAL":
    default:
      return {
        tier: "NORMAL",
        maxSegments: 4, // 🔥 질문 확장 여지 확보
        flushIntervalMs: 120,   // 🔥 30ms → 120ms
        idleMs: 3000,
      };
  }
}
