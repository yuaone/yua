// 📂 src/ai/style/detectors/ja.detector.ts

import {
  StyleSignalDetector,
  StyleSignalDetectorInput,
} from "../detector.interface";
import { normalize } from "../utils/normalize";

export const JapaneseStyleDetector: StyleSignalDetector = {
  detect({ text }: StyleSignalDetectorInput) {
    let casual = 0;
    let expressive = 0;
    let fragmented = 0;
    let formal = 0;

    if (/(w|笑|www)/.test(text)) {
      casual += 0.4;
      expressive += 0.3;
    }

    if (text.length < 15) {
      fragmented += 0.3;
    }

    if (/(です|ます|でしょう)/.test(text)) {
      formal += 0.7;
      casual -= 0.3;
    }

    return normalize({ casual, expressive, fragmented, formal });
  },
};
