// 📂 src/ai/style/detectors/ko.detector.ts

import {
  StyleSignalDetector,
  StyleSignalDetectorInput,
} from "../detector.interface";
import { normalize } from "../utils/normalize";

export const KoreanStyleDetector: StyleSignalDetector = {
  detect({ text }: StyleSignalDetectorInput) {
    let casual = 0;
    let expressive = 0;
    let fragmented = 0;
    let formal = 0;

    if (/(ㅋㅋ|ㅎㅎ|ㅠㅠ|ㅜㅜ|ㅇㅇ|ㄹㅇ|ㄱㄱ)/.test(text)) {
      casual += 0.5;
      expressive += 0.4;
    }

    if (text.length < 20) {
      fragmented += 0.3;
    }

    if (/(입니다|합니다|하십시오|됩니다)/.test(text)) {
      formal += 0.7;
      casual -= 0.3;
    }

    if (/[!?]{2,}/.test(text)) {
      expressive += 0.3;
    }

    return normalize({ casual, expressive, fragmented, formal });
  },
};
