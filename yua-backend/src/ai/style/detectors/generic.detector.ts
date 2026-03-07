// 📂 src/ai/style/detectors/generic.detector.ts

import {
  StyleSignalDetector,
  StyleSignalDetectorInput,
} from "../detector.interface";
import { normalize } from "../utils/normalize";

export const GenericStyleDetector: StyleSignalDetector = {
  detect({ text }: StyleSignalDetectorInput) {
    let fragmented = 0;

    if (text.length < 20) fragmented += 0.2;

    return normalize({
      casual: 0,
      expressive: 0,
      fragmented,
      formal: 0,
    });
  },
};
