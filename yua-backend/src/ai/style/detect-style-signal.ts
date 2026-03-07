// 📂 src/ai/style/detect-style-signal.ts

import { StyleSignalDetectorInput } from "./detector.interface";
import { KoreanStyleDetector } from "./detectors/ko.detector";
import { EnglishStyleDetector } from "./detectors/en.detector";
import { JapaneseStyleDetector } from "./detectors/ja.detector";
import { GenericStyleDetector } from "./detectors/generic.detector";

export function detectStyleSignal(input: StyleSignalDetectorInput) {
  switch (input.language) {
    case "ko":
      return KoreanStyleDetector.detect(input);
    case "en":
      return EnglishStyleDetector.detect(input);
    case "ja":
      return JapaneseStyleDetector.detect(input);
    default:
      return GenericStyleDetector.detect(input);
  }
}
