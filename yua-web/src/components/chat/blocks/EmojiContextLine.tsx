"use client";

import type { ThoughtStage } from "@/lib/thoughtStage";
import { emojiMap } from "@/lib/thoughtStage";
import { emojiVariants } from "@/lib/thoughtStageEmojiVariants";

type Persona = "DEFAULT" | "KID";

type Props = {
  stage?: ThoughtStage;
  persona?: Persona;
  confidence?: number;
  seed?: string;
  isInteresting?: boolean;
  /** 🔒 UI-only styling hook */
  className?: string;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

// 🔒 UI 결정용 초경량 해시 (절대 시간 섞지 않음)
function hashToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function EmojiContextLine({
  stage,
  persona = "DEFAULT",
  confidence,
  seed,
  className = "",
}: Props) {
  // 🔒 항상 anchor 유지 (안 나오는 게 사고)
  if (!stage) {
    return (
      <div
        className={`mt-3 text-sm select-none flex justify-center ${className}`}
        aria-hidden
      >
        <span>💭</span>
      </div>
    );
  }

  const baseEmoji = emojiMap[stage];
  const variants = emojiVariants[stage] ?? [baseEmoji];

  // 👶 KID는 무조건 가장 순한 첫 이모지
  if (persona === "KID") {
    return (
      <div
        className={`mt-3 text-sm select-none flex justify-center ${className}`}
        aria-hidden
      >
        <span>{variants[0]}</span>
      </div>
    );
  }

  // 🔒 DEFAULT: 의미 없는 “느낌 분산”
  const c = confidence === undefined ? 0.6 : clamp01(confidence);
  const softness = c < 0.4 ? 0 : c < 0.75 ? 1 : 2;

  const key = seed ? `${stage}:${seed}` : `${stage}`;
  const h = hashToInt(key);

  const idx =
    variants.length === 1
      ? 0
      : (h + softness) % variants.length;

  const emoji = variants[idx] ?? baseEmoji;

  // 🔥 감탄용 눈동자 제한
  let finalEmoji = emoji;

  // 🔥 흥미 질문 override (deterministic)
  const isInteresting =
    stage === "evaluate" &&
    typeof seed === "string" &&
    seed.toLowerCase().includes("curious");

  if (isInteresting) {
    finalEmoji = "👀";
  }

  return (
    <div
      className={`mt-3 text-sm select-none flex justify-center ${className}`}
      aria-hidden
    >
      <span>{finalEmoji}</span>
    </div>
  );
}
