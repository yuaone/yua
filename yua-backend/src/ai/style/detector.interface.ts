// 📂 src/ai/style/detector.interface.ts

export type ISO639_1 =
  | "ko"
  | "en"
  | "ja"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "it"
  | "ru"
  | "unknown";

/**
 * 각 값은 0 ~ 1 범위
 * - 의미: "이 성향이 얼마나 강한지"
 */
export interface StyleSignal {
  casual: number;
  expressive: number;
  fragmented: number;
  formal: number;
}

export interface StyleSignalDetectorInput {
  text: string;
  language: ISO639_1;
  turnIndex: number;
}

export interface StyleSignalDetector {
  detect(input: StyleSignalDetectorInput): StyleSignal;
}
