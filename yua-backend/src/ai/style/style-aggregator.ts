import { StyleSignal } from "./detector.interface";

export interface StyleProfile extends StyleSignal {
  samples: number;
  frozen: boolean;
  confidence: number;
}

export function createEmptyStyleProfile(): StyleProfile {
  return {
    casual: 0,
    expressive: 0,
    fragmented: 0,
    formal: 0,
    samples: 0,
    frozen: false,
    confidence: 0,
  };
}

/**
 * 🔒 SSOT
 * - 첫 3턴만 누적
 * - 이후 frozen
 */
export function aggregateStyleSignal(
  profile: StyleProfile,
  signal: StyleSignal,
  turnIndex: number
): StyleProfile {
  if (profile.frozen) return profile;

  const nextSamples = profile.samples + 1;

  const merged: StyleProfile = {
    casual:
      (profile.casual * profile.samples + signal.casual) / nextSamples,
    expressive:
      (profile.expressive * profile.samples + signal.expressive) / nextSamples,
    fragmented:
      (profile.fragmented * profile.samples + signal.fragmented) / nextSamples,
    formal:
      (profile.formal * profile.samples + signal.formal) / nextSamples,
    samples: nextSamples,
    frozen: nextSamples >= 3,
    confidence: 0,
  };

  // 간단·안정적 confidence 계산
  merged.confidence =
    1 -
    Math.min(
      1,
      Math.abs(
        merged.casual +
          merged.expressive -
          merged.formal
      ) / 3
    );

  return merged;
}

/**
 * PromptBuilder로 넘길 최소 힌트
 */
export function buildStyleHint(profile: StyleProfile): string | undefined {
  if (profile.samples < 2 || profile.confidence < 0.6) return undefined;

  const hints: string[] = [];

  if (profile.casual > 0.6)
    hints.push("편한 대화체로 말한다");

  if (profile.formal > 0.6)
    hints.push("문어체·정중한 톤을 유지한다");

  if (profile.fragmented > 0.6)
    hints.push("짧고 가볍게 끊어서 말한다");

  if (profile.expressive > 0.6)
    hints.push("감정 표현을 자연스럽게 섞는다");

  return hints.length
    ? `이 대화에서는 다음 말투를 따른다:\n- ${hints.join("\n- ")}`
    : undefined;
}
