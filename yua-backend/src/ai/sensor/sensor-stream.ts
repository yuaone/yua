// 📂 src/ai/sensor/sensor-stream.ts
// 🔥 Sensor Stream — Real-Time Push via WSR

import { SensorEngine } from "./sensor-engine";
import { SecurityWSR } from "../security/security-wsr";

export const SensorStream = {
  start(interval = 200) {
    setInterval(() => {
      const result = SensorEngine.read();

      SecurityWSR.push("sensor_update", {
        data: result.data,
        risk: result.risk,
        event: result.event,
        tags: result.tags
      });
    }, interval);
  }
};
