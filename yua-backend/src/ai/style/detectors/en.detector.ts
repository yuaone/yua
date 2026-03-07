// 📂 src/ai/style/detectors/en.detector.ts

import {
  StyleSignalDetector,
  StyleSignalDetectorInput,
} from "../detector.interface";
import { normalize } from "../utils/normalize";

export const EnglishStyleDetector: StyleSignalDetector = {
  detect({ text }: StyleSignalDetectorInput) {
    let casual = 0;
    let expressive = 0;
    let fragmented = 0;
    let formal = 0;

    if (/(lol|lmao|haha|yeah|nah|yep)/i.test(text)) {
      casual += 0.4;
      expressive += 0.3;
    }

    if (text.split(" ").length < 6) {
      fragmented += 0.3;
    }

    if (/(therefore|however|moreover|thus)/i.test(text)) {
      formal += 0.6;
    }

    if (/[!?]{2,}/.test(text)) {
      expressive += 0.3;
    }

    return normalize({ casual, expressive, fragmented, formal });
  },
};
