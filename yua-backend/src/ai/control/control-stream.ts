// 📂 src/ai/control/control-stream.ts
// 🔥 Control Stream — Real-Time Security Feed

import { SecurityWSR } from "../security/security-wsr";
import { ControlEngine } from "./control-engine";

export const ControlStream = {
  start(interval = 500) {
    setInterval(async () => {
      const snapshot = await ControlEngine.snapshot();
      SecurityWSR.push("control_snapshot", snapshot);
    }, interval);
  }
};
