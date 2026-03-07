// 📂 src/ai/sensor/sensor-types.ts
// 🔥 Sensor Types — Enterprise Unified Specification (2025.11)

export interface RawSensorPacket {
  ir: number;
  depth: number;
  motion: number;
}

export interface NormalizedSensorPacket {
  ir: number;
  depth: number;
  motion: number;
  risk: number;
  timestamp: string;
}

export interface FinalSensorPacket extends NormalizedSensorPacket {
  source: string;
}
